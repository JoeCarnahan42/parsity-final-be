const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../dataBase/db");
const bcrypt = require("bcrypt");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        "https://parsity-final-be.onrender.com/login/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const firstName = profile.name.givenName;
        const lastName = profile.name.familyName;

        const dummyPassword = Math.random().toString(36).slice(-10);
        const dummyPasswordHash = await bcrypt.hash(dummyPassword, 10);

        let user = await pool.query("SELECT * FROM users WHERE email = $1", [
          email,
        ]);

        if (user.rows.length === 0) {
          user = await pool.query(
            "INSERT INTO users (email, first_name, last_name, password, access_token, refresh_token) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [
              email,
              firstName,
              lastName,
              dummyPasswordHash,
              accessToken,
              refreshToken,
            ]
          );
        }
        return done(null, user.rows[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize user ID into session cookie
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user by ID on each request to get full user info
passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (user.rows.length === 0) {
      return done(null, false);
    }
    done(null, user.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
