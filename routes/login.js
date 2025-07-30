const router = require("express").Router();
require("dotenv").config();
const passport = require("passport");

const pool = require("../dataBase/db");
const authenticate = require("../middleware/authenticate");

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: true,
    failureRedirect: "https://parsity-final-fe.onrender.com/failure",
  }),
  (req, res) => {
    req.login(req.user, (err) => {
      if (err) return next(err);

      console.log("✅ Auth success, user is:", req.user);
      console.log("✅ Session object is:", req.session);

      res.redirect("https://parsity-final-fe.onrender.com/");
    });
  }
);

router.get("/auth/user", (req, res) => {
  console.log("Auth route hit. Session:", req.session);
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
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
