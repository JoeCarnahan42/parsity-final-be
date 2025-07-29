const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../dataBase/db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const firstName = profile.name.givenName;

        let user = await pool.query("SELECT * FROM users WHERE email = $1", [
          email,
        ]);

        if (user.rows.length === 0) {
          user = await pool.query(
            "INSERT INTO users (email, first_name) VALUES ($1, $2) RETURNING *",
            [email, firstName]
          );
        }

        return done(null, user.rows[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
