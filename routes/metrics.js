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

router.post("/:id/projected-metrics", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const { budgetMoney, budgetHours, dueDate } = req.body;
  try {
    const addMetrics = await pool.query(
      "INSERT INTO projected_metrics (project_id, budget_money, budget_hours, due_date) VALUES ($1, $2, $3, $4) RETURNING *",
      [projectId, budgetMoney, budgetHours, dueDate]
    );
    res.status(200).json(addMetrics.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.post("/:id/current-metrics", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const { budgetMoney, budgetHours, expectedDate } = req.body;
  try {
    const updateMetrics = await pool.query(
      "INSERT INTO current_metrics (project_id, budget_money, budget_hours, expected_date) VALUES ($1, $2, $3, $4) RETURNING *",
      [projectId, budgetMoney, budgetHours, expectedDate]
    );
    res.status(200).json(updateMetrics.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.get("/:id/projected-metrics", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  try {
    const projectedMetrics = await pool.query(
      "SELECT * FROM projected_metrics WHERE project_id = ($1)",
      [projectId]
    );
    res.status(200).json(projectedMetrics.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.get("/:id/current-metrics", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  try {
    const currentMetrics = await pool.query(
      "SELECT * FROM current_metrics WHERE project_id = ($1)",
      [projectId]
    );
    res.status(200).json(currentMetrics.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.put("/:id/current-metrics", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;
  const allowedFields = ["budget_money", "budget_hours", "expected_date"];

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No updates provided" });
  }

  const invalidFields = Object.keys(updates).filter(
    (key) => !allowedFields.includes(key)
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      message: `These fields are not valid for this table: ${invalidFields.join(
        ", "
      )}`,
    });
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

    const updatedMetrics = await pool.query(
      `UPDATE current_metrics SET ${fields.join(", ")} WHERE project_id = ${
        values[i]
      } RETURNING *`
    );
    res.status(200).json(updatedMetrics.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error updating metrics" });
  }
});

router.put("/:id/projected-metrics", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;
  const allowedFields = ["budget_money", "budget_hours", "due_date"];

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No updates provided" });
  }

  const invalidFields = Object.keys(updates).filter(
    (key) => !allowedFields.includes(key)
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      message: `These fields are not valid for this table: ${invalidFields.join(
        ", "
      )}`,
    });
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

    const updatedMetrics = await pool.query(
      `UPDATE projected_metrics SET ${fields.join(", ")} WHERE project_id = ${
        values[i]
      } RETURNING *`
    );
    res.status(200).json(updatedMetrics.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error updating metrics" });
  }
});

router.delete("/:id/current-metrics", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ message: "No project id given" });
  }

  try {
    const deletedMetric = await pool.query(
      "DELETE FROM current_metrics WHERE project_id = $1",
      [projectId]
    );
    res.status(200).json(deletedMetric.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.delete("/:id/projected-metrics", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ message: "No project id given" });
  }

  try {
    const deletedMetric = await pool.query(
      "DELETE FROM projected_metrics WHERE project_id = $1",
      [projectId]
    );
    res.status(200).json(deletedMetric.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

module.exports = router;
