require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { v4: uuidv4, validate: uuidValidate, version: uuidVersion } = require('uuid');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS to work with both development and production environments
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Check if the origin is allowed
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:1234', // Parcel dev server
      'http://127.0.0.1:1234',  // Parcel dev server alternative
      'https://morse-learn-j7cue.ondigitalocean.app', // DigitalOcean app URL
      'https://morse-learn.acecentre.net' // Custom domain
    ];

    // If deployed on the same domain, the origin will be the app URL
    if (process.env.APP_URL) {
      allowedOrigins.push(process.env.APP_URL);
    }

    console.log('Request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  ssl: process.env.SSL_CERT_PATH ? {
    // Expand the tilde to the home directory
    ca: require('fs').readFileSync(process.env.SSL_CERT_PATH.replace(/^~/, process.env.HOME)),
    rejectUnauthorized: true
  } : {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Analytics endpoint
app.post('/api/analytics', async (req, res) => {
  try {
    const body = req.body;

    // Data validation
    const {
      timePlayed,
      sound,
      speechHints,
      visualHints,
      progress: progressDump,
      letterData
    } = body;

    // Validate required fields
    if (!timePlayed || sound === undefined || speechHints === undefined ||
        visualHints === undefined || !progressDump) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const progressPercent = calculateProgressPercent(progressDump);
    const settingsDump = JSON.stringify({ sound, speechHints, visualHints });

    // Get or create userIdentifier
    let userIdentifier = req.cookies.userIdentifier;
    if (!userIdentifier || !isValidId(userIdentifier)) {
      userIdentifier = uuidv4();
    }

    // Check for settings changes
    const [lastProgressLogs] = await pool.query(
      `SELECT settings_dump, date_created FROM progress_log
       WHERE user_identifier = ?
       ORDER BY date_created DESC LIMIT 1`,
      [userIdentifier]
    );

    let settingsChanged = false;
    if (lastProgressLogs.length > 0) {
      const lastProgressLog = lastProgressLogs[0];
      const oldSettings = JSON.parse(lastProgressLog.settings_dump);
      if (oldSettings.sound !== sound ||
          oldSettings.speechHints !== speechHints ||
          oldSettings.visualHints !== visualHints) {
        settingsChanged = true;
      }
    }

    // Insert new progress log
    await pool.query(
      `INSERT INTO progress_log
       (user_identifier, progress_dump, progress_percent, time_played,
        date_created, visual_hints, speech_hints, sound, settings_dump,
        progress_detail, settings_changed)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
      [
        userIdentifier,
        JSON.stringify(progressDump),
        progressPercent,
        timePlayed,
        visualHints,
        speechHints,
        sound,
        settingsDump,
        letterData ? JSON.stringify(letterData) : null,
        settingsChanged
      ]
    );

    // Set cookie and return response
    res.cookie('userIdentifier', userIdentifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2147483647,
      sameSite: 'lax'
    });

    return res.status(200).json({
      message: `Successfully logged progress for ${userIdentifier}`
    });
  } catch (error) {
    console.error('Error in analytics endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Helper functions
function calculateProgressPercent(progress) {
  // Once the user has answered a letter correct x times we say they have learned it
  const howManyCorrectAnswersToLearn = 4;
  const noOfLettersInTheAlphabet = Object.keys(progress).length;
  const totalLetterAnswersCorrect = Object.values(progress).reduce(
    (accumulator, currentValue) => accumulator + currentValue,
    0
  );
  const hundredPercent = noOfLettersInTheAlphabet * howManyCorrectAnswersToLearn;
  const rawPercent = (totalLetterAnswersCorrect * 100) / hundredPercent;
  return Math.floor(rawPercent);
}

function isValidId(uuid) {
  return uuidValidate(uuid) && uuidVersion(uuid) === 4;
}

// Start the server
app.listen(port, () => {
  console.log(`Analytics API listening at http://localhost:${port}`);
});
