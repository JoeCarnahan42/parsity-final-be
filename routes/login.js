const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

const pool = require("../dataBase/db");

const JWT_KEY = process.env.SECRET_KEY;

const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

router.post("/", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // TODO - Add token to cookies, THEN update authenticate code to check the cookies for the token.
  if (!email || !password) {
    return res.status(400).json({ message: "Incorrectly Formatted Request" });
  }

  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const validUser = user.rows[0];
    if (!validUser) {
      return res.status(401).json({ message: "Invalid Username or Password" });
    }
    const verifyPass = await bcrypt.compare(password, validUser.password);
    if (!verifyPass) {
      return res.status(401).json({ message: "Invalid Username or Password" });
    }

    const token = jwt.sign(
      {
        username: validUser.email,
      },
      JWT_KEY,
      { expiresIn: "60m" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3600000, // 1 hour
    });

    return res.status(200).json({ message: "Login Successful" });
  } catch (err) {
    return res.status(500).json({ message: "Server Error" });
  }
});

router.delete("/:id/users", authenticate, async (req, res) => {
  const userId = req.body;

  if (!userId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  try {
    const deletedUser = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [userId]
    );
    res.status(200).json(deletedUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "error deleting user" });
  }
});

module.exports = router;
