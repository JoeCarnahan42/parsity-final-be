const express = require("express");
const router = express.Router();
require("dotenv").config();
const pool = require("../dataBase/db");

const authenticate = require("../middleware/authenticate");

router.get("/", authenticate, async (req, res) => {
  try {
    const projects = await pool.query("SELECT * FROM projects");
    res.status(200).json(projects.rows);
  } catch (err) {
    console.error;
    err.message;
    res.status(400).json({ error: "Database Error" });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  try {
    const viewedProj = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [projectId]
    );
    res.status(200).json(viewedProj.rows[0]);
  } catch (err) {
    res.status(400).json({ message: "No Project Found" });
  }
});

router.post("/", authenticate, async (req, res) => {
  const client = await pool.connect();

  const {
    title,
    customer,
    state,
    projectManagers,
    tasks,
    projMetrics,
    purchaseList,
  } = req.body;

  if (
    !title ||
    !customer ||
    !state ||
    !Array.isArray(projectManagers) ||
    !projectManagers.length ||
    !Array.isArray(tasks) ||
    !tasks.length ||
    !Array.isArray(projMetrics) ||
    !projMetrics.length ||
    !Array.isArray(purchaseList) ||
    !purchaseList.length
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    await client.query("BEGIN");
    const addToProjects = await client.query(
      "INSERT INTO projects (title, customer, state) VALUES ($1, $2, $3) RETURNING id",
      [title, customer, state]
    );
    const projectId = addToProjects.rows[0].id;

    if (Array.isArray(tasks) && tasks.length > 0) {
      const values = [];
      const params = [];

      tasks.forEach((task, i) => {
        const idx = i * 7;
        values.push(
          `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${
            idx + 6
          }, $${idx + 7})`
        );
        params.push(
          projectId,
          task.title,
          task.partNumber,
          task.material,
          task.hours,
          task.status,
          task.created
        );
      });
      await client.query(
        `INSERT INTO in_house_tasks (project_id, title, partnumber, material, hours, status, created_at) VALUES ${values.join(
          ", "
        )}`,
        params
      );
    }

    if (Array.isArray(projectManagers) && projectManagers.length > 0) {
      const values = [];
      const params = [];

      projectManagers.forEach((pm, i) => {
        const idx = i * 3;
        values.push(`($${idx + 1}, $${idx + 2}, $${idx + 3})`);
        params.push(projectId, pm.name, pm.title);
      });
      await client.query(
        `INSERT INTO project_managers (project_id, name, title) VALUES ${values.join(
          ", "
        )}`,
        params
      );
    }

    if (Array.isArray(projMetrics) && projMetrics.length > 0) {
      const values = [];
      const params = [];

      projMetrics.forEach((metric, i) => {
        const idx = i * 4;
        values.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`);
        params.push(projectId, metric.money, metric.hours, metric.due);
      });
      await client.query(
        `INSERT INTO projected_metrics (project_id, budget_money, budget_hours, due_date) VALUES ${values.join(
          ", "
        )}`,
        params
      );
    }

    if (Array.isArray(purchaseList) && purchaseList.length > 0) {
      const values = [];
      const params = [];

      purchaseList.forEach((item, i) => {
        const idx = i * 6;
        values.push(
          `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${
            idx + 6
          })`
        );
        params.push(
          projectId,
          item.title,
          item.partNumber,
          item.description,
          item.orderedOn,
          item.price
        );
      });
      await client.query(
        `INSERT INTO purchase_list (project_id, title, partnumber, description, ordered_on, price) VALUES ${values.join(
          ", "
        )}`,
        params
      );
    }
    await client.query("COMMIT");
    res
      .status(200)
      .json({ message: "Project Created Successfully!", projectId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction Failed", err);
    res.status(500).json({ message: "Project Creation Failed" });
  } finally {
    client.release();
  }
});

router.put("/:id", authenticate, async (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;
  const allowedFields = ["title", "customer", "state"];

  if (!projectId) {
    return res.status(400).json({ message: "No project id given" });
  }
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
    // TODO - Make the dynamic loops a helper method? reusable???

    const updatedProjState = await pool.query(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = ${
        values[i]
      } RETURNING *`
    );
    res.status(200).json(updatedProjState.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  try {
    const deletedProj = await pool.query(
      "DELETE FROM projects WHERE project_id = $1 RETURNING *",
      [projectId]
    );
    res.status(200).json(deletedProj.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error deleting project" });
  }
});

module.exports = router;
