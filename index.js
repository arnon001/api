require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3001;

const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';
const AUTH_HEADER = { 'X-TBA-Auth-Key': process.env.TBA_AUTH_KEY };

// ✅ Israeli teams (2025)
const ISRAEL_TEAMS = [
  "frc2231", "frc5951", "frc1690", "frc5990", "frc5654",
  "frc2630", "frc2230", "frc3339", "frc5987", "frc1942",
  "frc5614", "frc6738"
];

// 🌍 All championship divisions from .env
const DIVISIONS = {
  galileo: "https://www.thebluealliance.com/event/2025gal",
  archimedes: "https://www.thebluealliance.com/event/2025arc",
  newton: "https://www.thebluealliance.com/event/2025new",
  curie: "https://www.thebluealliance.com/event/2025cur",
  daly: "https://www.thebluealliance.com/event/2025dal",
  hopper: "https://www.thebluealliance.com/event/2025hop",
  johnson: "https://www.thebluealliance.com/event/2025joh",
  milstein: "https://www.thebluealliance.com/event/2025mil"
};

// 🎥 Twitch links per division
const DIVISION_STREAMS = {
  galileo: "https://www.twitch.tv/firstinspires_galileo",
  archimedes: "https://www.twitch.tv/firstinspires_archimedes",
  newton: "https://www.twitch.tv/firstinspires_newton",
  curie: "https://www.twitch.tv/firstinspires_curie",
  daly: "https://www.twitch.tv/firstinspires_daly",
  hopper: "https://www.twitch.tv/firstinspires_hopper",
  johnson: "https://www.twitch.tv/firstinspires_johnson",
  milstein: "https://www.twitch.tv/firstinspires_milstein"
};

app.use(cors());

app.get('/next-matches', async (req, res) => {
  try {
    const upcoming = {};

    // Initialize team storage
    ISRAEL_TEAMS.forEach(team => {
      upcoming[team] = null;
    });

    for (const [division, envKey] of Object.entries(DIVISIONS)) {
      const url = process.env[envKey];
      const eventKey = url.split('/').pop(); // e.g., "2025cur"

      const { data: matches } = await axios.get(`${TBA_BASE_URL}/event/${eventKey}/matches`, {
        headers: AUTH_HEADER
      });

      // Only qual matches with future times
      const now = new Date();

      const upcomingQuals = matches.filter(m =>
        m.comp_level === 'qm' && m.predicted_time && new Date(m.predicted_time * 1000) > now
      );

      for (const match of upcomingQuals) {
        const teamsInMatch = [...match.alliances.red.team_keys, ...match.alliances.blue.team_keys];
        for (const team of ISRAEL_TEAMS) {
          if (teamsInMatch.includes(team)) {
            // If we haven't set a match yet or this one is earlier, set it
            const current = upcoming[team];
            if (
              !current ||
              (match.predicted_time && match.predicted_time < current.match.predicted_time)
            ) {
              upcoming[team] = {
                match,
                division,
                stream: DIVISION_STREAMS[division]
              };
            }
          }
        }
      }
    }

    // Remove null entries (teams without upcoming matches)
    const filtered = Object.fromEntries(
      Object.entries(upcoming).filter(([_, v]) => v !== null)
    );

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch next matches' });
  }
});

app.listen(PORT, () => {
  console.log(`🎯 Server running at http://localhost:${PORT}`);
});
