const express = require("express");
const router = express.Router();
require("dotenv").config();
const pool = require("../dataBase/db");

const authenticate = require("../middleware/authenticate");

router.get("/:id/materials", authenticate, async (req, res) => {
  const projectId = req.params.id;

  try {
    const getMats = await pool.query(
      "SELECT * FROM materials WHERE project_id = $1 RETURNING *",
      projectId
    );
    res.status(200).json(getMats.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.post("/:id/materials", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const [description, price, forPartNumber, orderedOn] = req.body;

  try {
    const addMaterial = await pool.query(
      "INSERT INTO blockers (description, price, for_partnumber, ordered_on, project_id) VALUES ($1, $2, $3, $3, $4, $5)",
      [description, price, forPartNumber, orderedOn, projectId]
    );
    res.status(200).json(addMaterial.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.put("/:id/materials", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;
  const allowedFields = [
    "description",
    "price",
    "for_partnumber",
    "ordered_on",
  ];

  if (!projectId) {
    return res.status(400).json({ message: "No project ID provided" });
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No updates given" });
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

    const updateMats = await pool.query(
      `UPDATE materials SET ${fields.join(
        ", "
      )} WHERE project_id = $${i} RETURNING *`,
      values
    );
    res.status(200).json(updateMats.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.delete("/:id/materials", authenticate, async (req, res) => {
  const projectId = req.params.id;

  try {
    const deleteMats = await pool.query(
      "DELETE FROM materials WHERE project_id = $1 RETURNING *",
      projectId
    );
    res.status(200).json(deleteMats.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

module.exports = router;
