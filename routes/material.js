const express = require("express");
const router = express.Router();
require("dotenv").config();
const pool = require("../dataBase/db");

const authenticate = require("../middleware/authenticate");

router.get("/:id", authenticate, async (req, res) => {
  const projectId = req.params.id;

  try {
    const getMats = await pool.query(
      "SELECT * FROM material WHERE project_id = $1",
      [projectId]
    );
    res.status(200).json(getMats.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.post("/:id", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const { description, price, forPartNumber, orderedOn } = req.body;

  try {
    const addMaterial = await pool.query(
      "INSERT INTO material (description, price, for_partnumber, ordered_on, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [description, price, forPartNumber, orderedOn, projectId]
    );
    res.status(200).json(addMaterial.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.put("/:id/:materialId", authenticate, async (req, res) => {
  const { id, materialId } = req.params;
  const updates = req.body;
  const allowedFields = [
    "description",
    "price",
    "for_partnumber",
    "ordered_on",
  ];

  if (!id) {
    return res.status(400).json({ message: "No project ID provided" });
  }
  if (!materialId) {
    return res.status(400).json({ message: "No project material ID provided" });
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
      `UPDATE material SET ${fields.join(
        ", "
      )} WHERE project_id = $${i} AND id = $${materialId} RETURNING *`, // TODO - fix put route
      values
    );
    res.status(200).json(updateMats.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const materialId = req.body;

  try {
    const deleteMats = await pool.query(
      "DELETE FROM material WHERE project_id = $1 AND id = $2 RETURNING *",
      [projectId, materialId]
    );
    res.status(200).json(deleteMats.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

module.exports = router;
