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

router.put("/:id/project-managers", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;

  if (!projectId) {
    return res.status(400).json({ message: "No id given" });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No updates given" });
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

    const updatedManager = await pool.query(
      `UPDATE project_managers SET ${fields.join(", ")} WHERE project_id = ${
        values[i]
      }`
    );
    res.status(200).json(updatedManager.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

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
