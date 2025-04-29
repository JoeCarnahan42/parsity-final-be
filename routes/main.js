const router = require("express").Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("../dataBase/db");

// TODO - Delete this : Testing only
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

router.get("/projects", authenticate, async (req, res) => {
  try {
    const projects = await pool.query("SELECT * FROM projects");
    res.status(200).json(projects.rows);
  } catch (err) {
    console.error;
    err.message;
    res.status(400).json({ error: "Database Error" });
  }
});

router.get("/projects/:id", authenticate, async (req, res) => {
  const project = req.params.id;
  try {
    const viewedProj = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [project]
    );
    res.status(200).json(viewedProj.rows[0]);
  } catch (err) {
    res.status(400).json({ message: "No Project Found" });
  }
});

router.post("/projects", authenticate, async (req, res) => {
  const { title, customer, state } = req.body;
  try {
    const newProject = await pool.query(
      "INSERT INTO projects (title, customer, state) VALUES ($1, $2, $3) RETURNING *",
      [title, customer, state]
    );
    res.status(200).json(newProject.rows[0]);
  } catch (err) {
    res.status(400).json({ message: err });
  }

  res.status(201).json({ message: "Project created", data: newProject });
});

// TODO - review password encryption
router.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email && password) {
    try {
      const users = await pool.query("SELECT * FROM users");
      const userList = users.rows;
      const validUser = userList.filter(
        (user) => user.email === email && user.password === password
      );
      if (validUser) {
        const newAccessToken = jwt.sign(
          {
            username: validUser.email,
          },
          JWT_KEY,
          { expiresIn: "30m" }
        );

        res.status(200).json({ token: newAccessToken });
      } else {
        res.status(400).json({ message: "Invalid Username or Password" });
      }
    } catch (err) {
      res.status(400).json({ message: "Invalid Email or Password" });
    }
  }

  if (!email || !password) {
    res.status(400).json({ message: "Incorrectly Formatted Request" });
  }

  res.json({ email: email, password: password });
});

module.exports = router;
