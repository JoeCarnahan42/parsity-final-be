const router = require("express").Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("../dataBase/db");

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

router.get("/projects", authenticate, (req, res) => {
  res.json({ message: "Working!" });
});

router.post("/projects", authenticate, (req, res) => {
  const newProject = req.body;

  res.status(201).json({ message: "Project created", data: newProject });
});

router.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email && password) {
    // TODO - search DB for a valid user
    const user = "user validation logic here";
    if (user) {
      const newAccessToken = jwt.sign(
        {
          username: user.login.username,
        },
        JWT_KEY,
        { expiresIn: "30m" }
      );

      // check for valid token, assign new one if not valid
    } else {
      res.status(400).json({ message: "Invalid Username or Password" });
    }
  }

  if (!email || !password) {
    res.status(400).json({ message: "Incorrectly Formatted Request" });
  }

  res.json({ email: email, password: password });
});

module.exports = router;
