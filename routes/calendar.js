const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const pool = require("../dataBase/db");
const { authenticate } = require("passport");

router.post("/create-event", authenticate, async (req, res) => {
  try {
    const userId = req.session?.passport?.user;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    const user = result.rows[0];

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.access_token,
      refresh_token: user.refresh_token,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: req.body.summary,
      description: req.body.description,
      start: {
        dateTime: new Date(req.body.start).toISOString(),
        timeZone: req.body.timeZone,
      },
      end: {
        dateTime: new Date(req.body.end).toISOString(),
        timeZone: req.body.timeZone,
      },
      location: req.body.location,
    };

    console.log("userId", userId);
    console.log("req.body", req.body);
    console.log("event", event);

    await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ error: "Failed to create calendar event" });
  }
});

module.exports = router;
