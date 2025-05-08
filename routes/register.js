const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_KEY = process.env.SECRET_KEY;
const pool = require("../dataBase/db");

// TODO - Better user registration/ implement token
router.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Both fields must be entered" });
  }

  try {
    // Encryption
    const saltRounds = 10;
    const encryptedPass = await bcrypt.hash(password, saltRounds);
    // Generate token
    const token = jwt.sign(
      {
        username: validUser.email,
      },
      JWT_KEY,
      { expiresIn: "60m" }
    );

    const newUser = await pool.query(
      "INSERT INTO users (email, password, token) VALUES ($1, $2, $3) RETURNING *",
      [email, encryptedPass, token]
    );
    res.status(200).json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
