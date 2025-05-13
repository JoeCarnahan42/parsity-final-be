const express = require("express");
const router = express.Router();
require("dotenv").config();
const pool = require("../dataBase/db");

const authenticate = require("../middleware/authenticate");

// TODO - finish route
router.get("/:id/materials", authenticate, async (req, res) => {});
