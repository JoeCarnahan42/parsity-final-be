const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_KEY = process.env.SECRET_KEY;
const pool = require("../dataBase/db");

// TODO - Better user registration/ implement token
router.post("/create-user", async (req, res) => {
  const { email, password } = req.body;

  try {
    const newUser = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [email, password]
    );
    res.json(newUser.rows[0]);
  } catch (err) {
    console.error;
    err.message;
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
