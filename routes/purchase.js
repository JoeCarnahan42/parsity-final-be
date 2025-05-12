const express = require("express");
const router = express.Router();
require("dotenv").config();
const pool = require("../dataBase/db");

const authenticate = require("../middleware/authenticate");

router.post("/:id/purchase-list", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const { title, partNumber, description, orderedOn, price } = req.body;

  if (!title || !partNumber || !description || !orderedOn || !price) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const addPurchasae = await pool.query(
      "INSERT INTO purchase_list (project_id, title, partnumber, description, ordered_on, price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [projectId, title, partNumber, description, orderedOn, price]
    );
    res.status(200).json(addPurchasae.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.get("/:id/purchase-list", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  try {
    const getPurchases = await pool.query(
      "SELECT * FROM purchase_list WHERE project_id = ($1)",
      [projectId]
    );
    res.status(200).json(getPurchases.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.delete("/:id/purchase-list", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const purchaseId = req.body;

  if (!purchaseId) {
    res
      .status(400)
      .json({ message: "Cannot find query without a Purchase ID" });
  }

  try {
    const deletedPurchase = await pool.query(
      "DELETE FROM purchase_list WHERE project_id = $1 AND id = $2 RETURNING *",
      [projectId, purchaseId]
    );
    res.status(200).json(deletedPurchase.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "error deleting purchase item" });
  }
});

router.put("/:id/purchase-list", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const allowedFields = [
    "title",
    "partnumber",
    "description",
    "ordered_on",
    "price",
    "quantity",
  ];

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No updated provided" });
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

    const updatedPurchase = await pool.query(
      `UPDATE purchase_list SET ${fields.join(", ")} WHERE project_id = ${
        values[i]
      }`
    );
    res.status(200).json(updatedPurchase.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "error updating purchase" });
  }
});

module.exports = router;
