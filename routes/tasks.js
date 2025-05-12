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

router.post("/:id/in-house", authenticate, async (req, res) => {
  const { title, partNumber, material, hours } = req.body;
  const projectId = req.params.id;
  const status = "pending";

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  if (!title || !partNumber || !material || !hours) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const newTask = await pool.query(
      "INSERT INTO in_house_tasks (project_id, title, partnumber, material, hours, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [projectId, title, partNumber, material, hours, status]
    );
    res.status(200).json(newTask.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add task to project" });
  }
});

router.get("/:id/in-house", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  try {
    const getTasks = await pool.query(
      "SELECT * FROM in_house_tasks WHERE project_id = ($1)",
      [projectId]
    );
    res.status(200).json(getTasks.rows);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Database Error" });
  }
});

router.delete("/:id/in-house", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const taskId = req.body;

  if (!taskId) {
    res.status(400).json({ message: "Cannot find query without a Task ID" });
  }

  try {
    const deletedTask = await pool.query(
      "DELETE FROM in_house_tasks WHERE project_id = $1 AND id = $2 RETURNING *",
      [projectId, taskId]
    );
    res.status(200).json(deletedTask.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "error deleting task" });
  }
});

router.put("/:id/in-house", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const allowedFields = ["title", "partnumber", "material", "hours", "status"];

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No updates provided" });
  }

  try {
    const fields = [];
    const values = [];
    let i = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${i++}`);
      values.push(value);
    }

    values.push(projectId);

    const updatedTask = await pool.query(
      `UPDATE in_house_tasks SET ${fields.join(", ")} WHERE project_id = ${
        values[i]
      }`
    );
    res.status(200).json(updatedTask.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "error updating task" });
  }
});

module.exports = router;
