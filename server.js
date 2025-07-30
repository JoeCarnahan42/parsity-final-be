const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./dataBase/db");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const passport = require("./config/passport");
const session = require("express-session");
require("dotenv").config();
const cors = require("cors");

const swaggerDoc = YAML.load("./swagger.yaml");

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

const loginRoutes = require("./routes/login");
const registerRoutes = require("./routes/register");
const metricRoutes = require("./routes/metrics");
const pmRoutes = require("./routes/projectManagers");
const projRoutes = require("./routes/projects");
const purchaseRoutes = require("./routes/purchase");
const taskRoutes = require("./routes/tasks");
const commentRoutes = require("./routes/comments");
const materialRoutes = require("./routes/material");

app.set("trust proxy", 1);

app.use(
  cors({
    origin: "https://parsity-final-fe.onrender.com",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(express.static("public"));

app.use(
  session({
    name: "connect.sid",
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 1000, // 1 Hour
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/login", loginRoutes);
app.use("/register", registerRoutes);
app.use("/metrics", metricRoutes);
app.use("/pm", pmRoutes);
app.use("/projects", projRoutes);
app.use("/purchases", purchaseRoutes);
app.use("/tasks", taskRoutes);
app.use("/materials", materialRoutes);
app.use("/comments", commentRoutes);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

pool.connect().then((client) => {
  return client
    .query("SELECT NOW()")
    .then((res) => {
      console.log("DB Connected");
      client.release();
    })
    .catch((err) => {
      client.release();
      console.error("DB connection error:", err.stack);
    });
});
