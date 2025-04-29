const router = require("express").Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("../dataBase/db");

// TODO - Delete this : Testing only
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
  const { title, customer, state } = req.body;
  try {
    const newProject = await pool.query(
      "INSERT INTO projects (title, customer, state) VALUES ($1, $2, $3) RETURNING *",
      [title, customer, state]
    );
    res.status(200).json(newProject.rows[0]);
  } catch (err) {
    res.status(400).json({ message: err });
  }

  res.status(201).json({ message: "Project created", data: newProject });
});

// adds a new in house task to a defined project
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
          { expiresIn: "30m" }
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

// TODO - TEST THESE ROUTES ALL ARE UNTESTED
router.get("/projects/:id/in-house", authenticate, async (req, res) => {
  // GET in house tasks of a defined project
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
  // POST items to purchse list
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
  // GET purchase list table
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
    // POST initial projected metrics.
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
    // GET all projected metrics
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

router.post("/projects/:id/current-metrics", authenticate, async (req, res) => {
  // POST used to update current metrics with current data
  const projectId = req.params.id;
  const { budgetMoney, budgetHours, expectedDate } = req.body;
  try {
    const updateMetrics = await pool.query(
      "INSERT INTO current_metrics (project_id, budget_money, budget_hours, expected_date) VALUES ($1, $2, $3, $4)",
      [projectId, budgetMoney, budgetHours, expectedDate]
    );
    res.status(200).json(updateMetrics.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database Error" });
  }
});

router.get("/projects/:id/current-metrics", authenticate, async (req, res) => {
  // GET all current metrics of specific project
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

module.exports = router;
