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

router.post("/:id/purchase-list", authenticate, async (req, res) => {
  // TODO - Add price to this
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const { title, partNumber, description, orderedOn } = req.body;

  if (!title || !partNumber || !description || !orderedOn) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const addPurchasae = await pool.query(
      "INSERT INTO purchase_list (project_id, title, partnumber, description, ordered_on) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [projectId, title, partNumber, description, orderedOn]
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

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  const [title, partNumber, description, orderedOn] = req.body;

  try {
    const updatedPurchase = await pool.query(
      "UPDATE purchase_list SET title = $1, part_number = $2, description = $3, ordered_on = $4 WHERE project_id = $5 RETURNING *",
      [title, partNumber, description, orderedOn, projectId]
    );
    res.status(200).json(updatedPurchase.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "error updating purchase" });
  }
});

module.exports = router;
