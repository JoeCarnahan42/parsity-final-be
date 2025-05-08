const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
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

    const newUser = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [email, encryptedPass]
    );
    res.status(200).json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
