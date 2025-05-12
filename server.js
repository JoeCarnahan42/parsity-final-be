const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./dataBase/db");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const swaggerDoc = YAML.load("./swagger.yaml");

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

const loginRoutes = require("./routes/login");
const registerRoutes = require("./routes/register");
const metricRoutes = require("./routes/metrics");
const pmRoutes = require("./routes/projectManagers");
const projRoutes = require("./routes/projects");
const purchaseRoutes = require("./routes/purchase");
const taskRoutes = require("./routes/tasks");

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use("/login", loginRoutes);
app.use("/register", registerRoutes);
app.use("/metrics", metricRoutes);
app.use("/pm", pmRoutes);
app.use("/projects", projRoutes);
app.use("/purchases", purchaseRoutes);
app.use("/tasks", taskRoutes);

app.listen(8000, () => {
  console.log("Node.js listening on port " + 8000);
});

pool.connect().then((client) => {
  return client
    .query("SELECT NOW()")
    .then((res) => {
      console.log("DB connected!s");
      client.release();
    })
    .catch((err) => {
      client.release();
      console.error("DB connection error:", err.stack);
    });
});
