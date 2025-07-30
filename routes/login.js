const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();
const JWT_KEY = process.env.SECRET_KEY;
const environment = process.env.NODE_ENV === "production";

const pool = require("../dataBase/db");
const authenticate = require("../middleware/authenticate");

router.post("/google/exchange", async (req, res) => {
  const { code, codeVerifier } = req.body;

  const dummyPass = (length = 10) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  const dummyPasswordHash = await bcrypt.hash(dummyPass(), 10);

  if (!code || !codeVerifier) {
    return res.status(400).json({ message: "Missing code or verifier" });
  }

  try {
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        redirect_uri: "https://parsity-final-fe.vercel.app/",
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token } = tokenRes.data;

    const userInfoRes = await axios.get(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const {
      email,
      given_name: first_name,
      family_name: family_name,
    } = userInfoRes.data;

    let user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (!user.rows.length) {
      await pool.query(
        "INSERT INTO users (email, first_name, last_name, password) VALUES ($1, $2, $3, $4)",
        [email, first_name, family_name, dummyPasswordHash]
      );
      user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    }

    const token = jwt.sign({ email, firstName: first_name }, JWT_KEY, {
      expiresIn: "60m",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: environment,
      sameSite: "None",
      maxAge: 3600000,
    });

    return res.status(200).json({ message: "Login successful" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ message: "Google Auth failed" });
  }
});

router.get(
  "/check",
  authenticate,
  (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  },
  async (req, res) => {
    const email = req.user.email;
    try {
      const user = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      const validUser = user.rows[0];
      const { password, ...userWithoutPassword } = validUser;
      res.status(200).json({ user: userWithoutPassword });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV,
    sameSite: "None",
  });
  res.status(200).json({ message: "Logged out successfully" });
});

router.post("/", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ message: "Incorrectly Formatted Request" });
  }

  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const validUser = user.rows[0];
    if (!validUser) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }
    const verifyPass = await bcrypt.compare(password, validUser.password);
    if (!verifyPass) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }

    const { password: encryptedPassword, ...userWithoutPassword } = validUser;

    const token = jwt.sign(
      {
        email: validUser.email,
        firstName: validUser.first_name,
      },
      JWT_KEY,
      { expiresIn: "60m" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: environment,
      sameSite: "None",
      maxAge: 3600000, // 1 hour
    });

    return res.status(200).json(userWithoutPassword);
  } catch (err) {
    return res.status(500).json({ message: "Server Error", error: err });
  }
});

router.delete("/:id/users", authenticate, async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    res.status(400).json({ message: "Cannot find query without an ID" });
  }

  try {
    const deletedUser = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [userId]
    );
    res.status(200).json(deletedUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "error deleting user" });
  }
});

module.exports = router;
