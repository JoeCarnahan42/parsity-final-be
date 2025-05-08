const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_KEY = process.env.SECRET_KEY;
const pool = require("../dataBase/db");

const authenticate = (req, res, next) => {
  const token = req.cookies.token;

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

router.delete("/:id/project-managers", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const managerId = req.body;

  if (!managerId) {
    res.status(400).json({ message: "Cannot find query without a Manager ID" });
  }

  try {
    const deletedManager = await pool.query(
      "DELETE FROM project_managers WHERE project_id = $1 AND id = $2 RETURNING *",
      [projectId, managerId]
    );
    res.status(200).json(deletedManager.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "error deleting project manager" });
  }
});

module.exports = router;
