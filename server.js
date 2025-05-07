const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./dataBase/db");

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

const mainRoutes = require("./routes/main");
// TODO - look in to route separation
app.use(mainRoutes);

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
