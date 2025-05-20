const { Pool } = require("pg");
require("dotenv").config();

const PASSWORD = process.env.PASSWORD;

const pool = new Pool({
  user: "wolf42",
  host: "dpg-d0mcbdemcj7s7396gl90-a",
  database: "projectsdb_yi76",
  password: PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
