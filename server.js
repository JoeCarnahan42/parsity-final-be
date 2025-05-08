const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./dataBase/db");
const loginRoutes = require("./routes/login");
const registerRoutes = require("./routes/register");
const metricRoutes = require("./routes/metrics");
const pmRoutes = require("./routes/pm");
const projRoutes = require("./routes/proj");
const purchaseRoutes = require("./routes/purchase");
const taskRoutes = require("./routes/task");
const cookieParser = require("cookie-parser");
app.use(cookieParser());

const app = express();

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

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
      console.log("DB connected! Time:", res.rows[0].now);
      client.release();
    })
    .catch((err) => {
      client.release();
      console.error("DB connection error:", err.stack);
    });
});
