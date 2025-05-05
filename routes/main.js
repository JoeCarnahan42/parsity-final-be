const router = require("express").Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("../dataBase/db");

// TODO - Better user registration
router.post("/create-user", async (req, res) => {
  const { email, password } = req.body;

  try {
    const newUser = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [email, password]
    );
    res.json(newUser.rows[0]);
  } catch (err) {
    console.error;
    err.message;
    res.status(500).json({ error: "Server Error" });
  }
});

const JWT_KEY = process.env.SECRET_KEY;

const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

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

router.get("/projects", authenticate, async (req, res) => {
  try {
    const projects = await pool.query("SELECT * FROM projects");
    res.status(200).json(projects.rows);
  } catch (err) {
    console.error;
    err.message;
    res.status(400).json({ error: "Database Error" });
  }
});

router.get("/projects/:id", authenticate, async (req, res) => {
  const project = req.params.id;
  try {
    const viewedProj = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [project]
    );
    res.status(200).json(viewedProj.rows[0]);
  } catch (err) {
    res.status(400).json({ message: "No Project Found" });
  }
});

router.post("/projects", authenticate, async (req, res) => {
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

router.post("/projects/:id/in-house", authenticate, async (req, res) => {
  const { title, partNumber, material, hours } = req.body;
  const projectId = req.params.id;
  const status = "pending";

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

// TODO - review password encryption
router.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email && password) {
    try {
      const users = await pool.query("SELECT * FROM users");
      const userList = users.rows;
      const validUser = userList.filter(
        (user) => user.email === email && user.password === password
      );
      if (validUser) {
        const newAccessToken = jwt.sign(
          {
            username: validUser.email,
          },
          JWT_KEY,
          { expiresIn: "60m" }
        );

        res.status(200).json({ token: newAccessToken });
      } else {
        res.status(400).json({ message: "Invalid Username or Password" });
      }
    } catch (err) {
      res.status(400).json({ message: "Invalid Email or Password" });
    }
  }

  if (!email || !password) {
    res.status(400).json({ message: "Incorrectly Formatted Request" });
  }

  res.json({ email: email, password: password });
});

router.get("/projects/:id/in-house", authenticate, async (req, res) => {
  const projectId = req.params.id;

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

router.post("/projects/:id/purchase-list", authenticate, async (req, res) => {
  // TODO - Add price to this
  const projectId = req.params.id;
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

router.get("/projects/:id/purchase-list", authenticate, async (req, res) => {
  // TODO - Add a check for :id and give proper response
  const projectId = req.params.id;
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

router.post(
  "/projects/:id/projected-metrics",
  authenticate,
  async (req, res) => {
    const projectId = req.params.id;
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
  }
);

router.get(
  "/projects/:id/projected-metrics",
  authenticate,
  async (req, res) => {
    const projectId = req.params.id;
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
  }
);

// Initial upload of current metrics
router.post("/projects/:id/current-metrics", authenticate, async (req, res) => {
  // Works but does not return the object
  const projectId = req.params.id;
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

router.get("/projects/:id/current-metrics", authenticate, async (req, res) => {
  const projectId = req.params.id;
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

// TODO - Add routes and test routes
// DELETE, PUT - updating existing data

router.delete("/projects/:id", async (req, res) => {
  const projectId = req.params.id;

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

router.delete("/projects/:id/in-house", async (req, res) => {
  const projectId = req.params.id;
  const taskId = req.body;

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

router.delete("/projects/:id/purchase-list", async (req, res) => {
  const projectId = req.params.id;
  const purchaseId = req.body;

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

router.delete("/projects/:id/project-managers", async (req, res) => {
  const projectId = req.params.id;
  const managerId = req.body;

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

router.delete("/projects/:id/users", async (req, res) => {
  const userId = req.body;

  try {
    const deletedUser = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [userId]
    );
    res.status(200).json(deletedUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "error deleting user" });
  }
});

router.put("/products/:id/current-metrics", async (req, res) => {
  const projectId = req.params.id;
  const [budgetMoney, budgetHours, expectedDate] = req.body;

  // TODO - add conditionals to separate individual changed. EX: if only expeted date changes, only that will be changed.

  try {
    const updateMetric = await pool.query(
      "UPDATE current_metrics SET budget_money = $1, budget_hours = $2, expected_date = $3 WHERE project_id = $4 RETURNING *",
      [budgetMoney, budgetHours, expectedDate, projectId]
    );
    res.status(200).json(updateMetric.rows(0));
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error updating metrics" });
  }
});

router.put("/projects/:id/in-house", async (req, res) => {
  const projectId = req.params.id;
  const [title, partNumber, material, hours, status] = req.body;

  try {
    const updatedTask = await pool.query(
      "UPDATE in_house_tasks SET title = $1, part_number = $2, material = $3, hours = $4, status = $5 WHERE project_id = $6 RETURNING *",
      [title, partNumber, material, hours, status, projectId]
    );
    res.status(200).json(updatedTask.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "error updating task" });
  }
});

router.put("/projects/:id/purchase-list", async (req, res) => {
  const projectId = req.params.id;
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

// TODO - potential put routes for changing all possible rows

module.exports = router;
