const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const pool = require("../dataBase/db");

router.post("/create-event", async (req, res) => {
  try {
    const userId = req.session?.passport?.user;
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);

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
      summary: "Test Meeting",
      start: { dateTime: "2025-08-01T10:00:00-05:00" },
      end: { dateTime: "2025-08-01T11:00:00-05:00" },
    };

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
