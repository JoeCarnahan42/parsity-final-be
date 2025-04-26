const { Pool } = require("pg");
require("dotenv").config();

const PASSWORD = process.env.PASSWORD;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "projectsdb",
  password: PASSWORD,
  port: 5432,
});

module.exports = pool;
