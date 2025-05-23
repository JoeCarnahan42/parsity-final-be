const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();
const JWT_KEY = process.env.SECRET_KEY;

const pool = require("../dataBase/db");
const authenticate = require("../middleware/authenticate");

router.get("/check", authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "None",
  });
  res.status(200).json({ message: "Logged out successfully" });
});

router.post("/", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ message: "Incorrectly Formatted Request" });
  }

  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const validUser = user.rows[0];
    if (!validUser) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }
    const verifyPass = await bcrypt.compare(password, validUser.password);
    if (!verifyPass) {
      return res.status(401).json({ message: "Invalid Email or Password" });
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
      sameSite: "None",
      maxAge: 3600000, // 1 hour
    });

    return res.status(200).json({ message: "Login Successful" });
  } catch (err) {
    return res.status(500).json({ message: "Server Error" });
  }
});

router.delete("/:id/users", authenticate, async (req, res) => {
  const userId = req.params.id;

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
    res.status(500).json({ message: "error deleting user" });
  }
});

module.exports = router;
