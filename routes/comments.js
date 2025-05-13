const express = require("express");
const router = express.Router();
require("dotenv").config();
const pool = require("../dataBase/db");

const authenticate = require("../middleware/authenticate");

router.get("/:id/comments", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ message: "No project ID provided" });
  }

  try {
    const getComments = await pool.query(
      "SELECT * FROM comments WHERE project_id = $1 RETURNING *",
      projectId
    );
    res.status(200).json(getComments.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.post("/:id/comments", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const [comment, date] = req.body;

  if (!projectId) {
    return res.status(400).json({ message: "No project ID provided" });
  }

  try {
    const addComment = await pool.query(
      "INSERT INTO comments (comment, date, project_id) VALUES ($1, $2, $3) RETURNING *",
      [comment, date, projectId]
    );
    res.status(200).json(addComment.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.put("/:id/comments", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;
  const allowedFields = ["comment"];

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

    const updatedComment = await pool.query(
      `UPDATE comments SET ${fields.join(
        ", "
      )} WHERE project_id = $${i} RETURNING *`,
      values
    );
    res.status(200).json(updatedComment.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error updating metrics" });
  }
});

router.delete("/:id/comments", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ message: "No project ID given" });
  }

  try {
    const deletedComment = await pool.query(
      "DELETE FROM comments WHERE project_id = $1 RETURNING *",
      projectId
    );
    res.status(200).json(deletedComment.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

module.exports = router;
