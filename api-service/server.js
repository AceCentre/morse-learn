// Only load local env files in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../.env.local' });
  require('dotenv').config(); // Also load from local .env if it exists
}
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { v4: uuidv4, validate: uuidValidate, version: uuidVersion } = require('uuid');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Simple in-memory cache for stats (to reduce database load)
let statsCache = null;
let statsCacheTime = null;
const STATS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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
console.log('SSL_CERT_PATH:', process.env.SSL_CERT_PATH);
console.log('NODE_ENV:', process.env.NODE_ENV);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  ssl: process.env.SSL_CERT_PATH ? {
    // Expand the tilde to the home directory and read SSL certificate
    ca: fs.readFileSync(process.env.SSL_CERT_PATH.replace(/^~/, process.env.HOME || '~')),
    rejectUnauthorized: true
  } : {
    // Fallback for environments without custom SSL cert
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Test endpoint for debugging
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// Debug endpoint for data-export
app.get('/data-export-debug', (req, res) => {
  res.json({
    message: 'Data export debug endpoint working',
    routes: app._router.stack.map(r => r.route?.path).filter(Boolean)
  });
});

// Password protection middleware for data export endpoints
function requireDataExportPassword(req, res, next) {
  const providedPassword = req.query.password || req.headers['x-data-export-password'];
  const requiredPassword = process.env.DATA_EXPORT_PASSWORD;

  if (!requiredPassword) {
    return res.status(500).json({ error: 'Data export password not configured' });
  }

  if (!providedPassword || providedPassword !== requiredPassword) {
    return res.status(401).json({
      error: 'Access denied. Valid password required.',
      hint: 'Add ?password=YOUR_PASSWORD to the URL or include X-Data-Export-Password header'
    });
  }

  next();
}

// Serve the data export page at /data-export
app.get('/data-export', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Morse Learn - Data Export</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px; display: inline-block; }
        .btn:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <h1>🔬 Morse Learn - Data Export</h1>
      <p>Access anonymized learning data for research purposes.</p>

      <h2>📊 Quick Links</h2>
      <a href="/api/stats" class="btn">📈 View Statistics</a>
      <a href="/api/data-sample" class="btn">🔍 Sample Data (100 records)</a>

      <h2>🔒 Password-Protected Downloads</h2>
      <p>Full dataset downloads require a password. Contact the Ace Centre team for access.</p>

      <form onsubmit="downloadData(event)">
        <input type="password" id="password" placeholder="Enter password" style="padding: 8px; margin: 5px;">
        <button type="submit" class="btn">📄 Download JSON</button>
      </form>

      <script>
        function downloadData(e) {
          e.preventDefault();
          const password = document.getElementById('password').value;
          if (!password) { alert('Please enter password'); return; }
          window.open('/api/data-dump?password=' + encodeURIComponent(password) + '&page=1');
        }
      </script>
    </body>
    </html>
  `);
});
});

// Analytics endpoint
app.post('/analytics', async (req, res) => {
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

// Public data dump endpoint - JSON format (password protected with pagination)
app.get('/data-dump', requireDataExportPassword, async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Default 1000 records per page
    const offset = (page - 1) * limit;

    // Validate pagination limits to prevent abuse
    if (limit > 10000) {
      return res.status(400).json({ error: 'Limit cannot exceed 10,000 records per request' });
    }

    // Get total count first
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM progress_log');
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Get paginated data
    const [rows] = await pool.query(`
      SELECT
        CONCAT('user_', ROW_NUMBER() OVER (ORDER BY user_identifier)) as anonymous_user_id,
        progress_dump,
        progress_percent,
        time_played,
        DATE(date_created) as date_created,
        visual_hints,
        speech_hints,
        sound,
        settings_dump,
        progress_detail,
        settings_changed
      FROM progress_log
      ORDER BY date_created DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const anonymizedData = rows.map(row => ({
      anonymous_user_id: row.anonymous_user_id,
      progress_dump: row.progress_dump,
      progress_percent: row.progress_percent,
      time_played_ms: row.time_played,
      time_played_minutes: Math.round(row.time_played / 1000 / 60 * 100) / 100,
      date_created: row.date_created,
      visual_hints: row.visual_hints,
      speech_hints: row.speech_hints,
      sound: row.sound,
      settings_dump: row.settings_dump,
      progress_detail: row.progress_detail,
      settings_changed: row.settings_changed
    }));

    res.json({
      metadata: {
        total_records: totalRecords,
        page: page,
        limit: limit,
        total_pages: totalPages,
        records_in_page: anonymizedData.length,
        export_date: new Date().toISOString(),
        description: "Anonymized Morse Learn training data (paginated)",
        note: "User identifiers have been anonymized. Use ?page=N&limit=M for pagination."
      },
      pagination: {
        current_page: page,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
        next_page: page < totalPages ? page + 1 : null,
        previous_page: page > 1 ? page - 1 : null
      },
      data: anonymizedData
    });
  } catch (error) {
    console.error('Error in data dump endpoint:', error);
    return res.status(500).json({ error: 'Failed to export data' });
  }
});

// Sample data endpoint (no password required, limited to 100 records)
app.get('/data-sample', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        CONCAT('user_', ROW_NUMBER() OVER (ORDER BY user_identifier)) as anonymous_user_id,
        progress_dump,
        progress_percent,
        time_played,
        DATE(date_created) as date_created,
        visual_hints,
        speech_hints,
        sound,
        settings_dump,
        progress_detail,
        settings_changed
      FROM progress_log
      ORDER BY date_created DESC
      LIMIT 100
    `);

    const anonymizedData = rows.map(row => ({
      anonymous_user_id: row.anonymous_user_id,
      progress_dump: row.progress_dump,
      progress_percent: row.progress_percent,
      time_played_ms: row.time_played,
      time_played_minutes: Math.round(row.time_played / 1000 / 60 * 100) / 100,
      date_created: row.date_created,
      visual_hints: row.visual_hints,
      speech_hints: row.speech_hints,
      sound: row.sound,
      settings_dump: row.settings_dump,
      progress_detail: row.progress_detail,
      settings_changed: row.settings_changed
    }));

    res.json({
      metadata: {
        total_records: anonymizedData.length,
        export_date: new Date().toISOString(),
        description: "Sample of Morse Learn training data (100 records)",
        note: "This is a free sample. For full dataset access, use /api/data-dump with password."
      },
      data: anonymizedData
    });
  } catch (error) {
    console.error('Error in sample data endpoint:', error);
    return res.status(500).json({ error: 'Failed to export sample data' });
  }
});

// Public data dump endpoint - CSV format (password protected with pagination)
app.get('/data-dump/csv', requireDataExportPassword, async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5000; // Default 5000 records for CSV
    const offset = (page - 1) * limit;

    // Validate pagination limits
    if (limit > 50000) {
      return res.status(400).json({ error: 'CSV limit cannot exceed 50,000 records per request' });
    }

    const [rows] = await pool.query(`
      SELECT
        CONCAT('user_', ROW_NUMBER() OVER (ORDER BY user_identifier)) as anonymous_user_id,
        progress_dump,
        progress_percent,
        time_played,
        DATE(date_created) as date_created,
        visual_hints,
        speech_hints,
        sound,
        settings_dump,
        progress_detail,
        settings_changed
      FROM progress_log
      ORDER BY date_created DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Convert to CSV
    const csvHeader = 'anonymous_user_id,progress_dump,progress_percent,time_played_ms,time_played_minutes,date_created,visual_hints,speech_hints,sound,settings_dump,progress_detail,settings_changed\n';
    const csvRows = rows.map(row => {
      const timePlayed = row.time_played;
      const timePlayedMinutes = Math.round(timePlayed / 1000 / 60 * 100) / 100;

      return [
        row.anonymous_user_id,
        `"${row.progress_dump.replace(/"/g, '""')}"`,
        row.progress_percent,
        timePlayed,
        timePlayedMinutes,
        row.date_created,
        row.visual_hints,
        row.speech_hints,
        row.sound,
        `"${row.settings_dump.replace(/"/g, '""')}"`,
        row.progress_detail ? `"${row.progress_detail.replace(/"/g, '""')}"` : '',
        row.settings_changed
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;
    const filename = `morse-learn-data-export-page${page}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error in CSV data dump endpoint:', error);
    return res.status(500).json({ error: 'Failed to export CSV data' });
  }
});

// Public statistics endpoint (cached to reduce database load)
app.get('/stats', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (statsCache && statsCacheTime && (now - statsCacheTime) < STATS_CACHE_DURATION) {
      return res.json(statsCache);
    }
    // Get basic statistics
    const [totalUsers] = await pool.query(`
      SELECT COUNT(DISTINCT user_identifier) as total_users FROM progress_log
    `);

    const [totalSessions] = await pool.query(`
      SELECT COUNT(*) as total_sessions FROM progress_log
    `);

    const [avgProgress] = await pool.query(`
      SELECT AVG(progress_percent) as avg_progress FROM progress_log
    `);

    const [completionStats] = await pool.query(`
      SELECT
        COUNT(DISTINCT user_identifier) as users_completed
      FROM progress_log
      WHERE progress_percent >= 100
    `);

    const [settingsStats] = await pool.query(`
      SELECT
        visual_hints,
        speech_hints,
        sound,
        COUNT(*) as usage_count,
        AVG(progress_percent) as avg_progress_for_setting
      FROM progress_log
      GROUP BY visual_hints, speech_hints, sound
      ORDER BY usage_count DESC
    `);

    const [timeStats] = await pool.query(`
      SELECT
        AVG(time_played) as avg_time_played_ms,
        MIN(time_played) as min_time_played_ms,
        MAX(time_played) as max_time_played_ms,
        STDDEV(time_played) as stddev_time_played_ms
      FROM progress_log
    `);

    const [dailyStats] = await pool.query(`
      SELECT
        DATE(date_created) as date,
        COUNT(*) as sessions_count,
        COUNT(DISTINCT user_identifier) as unique_users
      FROM progress_log
      WHERE date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(date_created)
      ORDER BY date DESC
    `);

    // Recent activity stats (last 7 days)
    const [recentActivity] = await pool.query(`
      SELECT
        COUNT(DISTINCT user_identifier) as new_users_7_days,
        COUNT(*) as sessions_7_days,
        COUNT(DISTINCT CASE WHEN progress_percent >= 100 THEN user_identifier END) as completed_7_days,
        COUNT(DISTINCT CASE WHEN progress_percent > 0 AND progress_percent < 100 THEN user_identifier END) as active_learners_7_days
      FROM progress_log
      WHERE date_created >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Users who started learning in the last 7 days (first session)
    const [newStarters] = await pool.query(`
      SELECT COUNT(DISTINCT user_identifier) as started_learning_7_days
      FROM progress_log p1
      WHERE date_created >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND NOT EXISTS (
        SELECT 1 FROM progress_log p2
        WHERE p2.user_identifier = p1.user_identifier
        AND p2.date_created < DATE_SUB(NOW(), INTERVAL 7 DAY)
      )
    `);

    const [progressDistribution] = await pool.query(`
      SELECT
        progress_range,
        user_count
      FROM (
        SELECT
          CASE
            WHEN progress_percent = 0 THEN '0%'
            WHEN progress_percent <= 25 THEN '1-25%'
            WHEN progress_percent <= 50 THEN '26-50%'
            WHEN progress_percent <= 75 THEN '51-75%'
            WHEN progress_percent <= 99 THEN '76-99%'
            ELSE '100%'
          END as progress_range,
          COUNT(DISTINCT user_identifier) as user_count,
          CASE
            WHEN progress_percent = 0 THEN 1
            WHEN progress_percent <= 25 THEN 2
            WHEN progress_percent <= 50 THEN 3
            WHEN progress_percent <= 75 THEN 4
            WHEN progress_percent <= 99 THEN 5
            ELSE 6
          END as sort_order
        FROM progress_log
        GROUP BY
          CASE
            WHEN progress_percent = 0 THEN '0%'
            WHEN progress_percent <= 25 THEN '1-25%'
            WHEN progress_percent <= 50 THEN '26-50%'
            WHEN progress_percent <= 75 THEN '51-75%'
            WHEN progress_percent <= 99 THEN '76-99%'
            ELSE '100%'
          END,
          CASE
            WHEN progress_percent = 0 THEN 1
            WHEN progress_percent <= 25 THEN 2
            WHEN progress_percent <= 50 THEN 3
            WHEN progress_percent <= 75 THEN 4
            WHEN progress_percent <= 99 THEN 5
            ELSE 6
          END
      ) as grouped_data
      ORDER BY sort_order
    `);

    const statsData = {
      metadata: {
        generated_at: new Date().toISOString(),
        description: "Morse Learn usage statistics",
        cached: false
      },
      overview: {
        total_unique_users: totalUsers[0].total_users,
        total_sessions: totalSessions[0].total_sessions,
        average_progress_percent: Math.round(avgProgress[0].avg_progress * 100) / 100,
        users_completed: completionStats[0].users_completed,
        completion_rate: Math.round((completionStats[0].users_completed / totalUsers[0].total_users) * 10000) / 100
      },
      time_statistics: {
        average_time_played_minutes: Math.round((timeStats[0].avg_time_played_ms / 1000 / 60) * 100) / 100,
        min_time_played_minutes: Math.round((timeStats[0].min_time_played_ms / 1000 / 60) * 100) / 100,
        max_time_played_minutes: Math.round((timeStats[0].max_time_played_ms / 1000 / 60) * 100) / 100,
        stddev_time_played_minutes: Math.round((timeStats[0].stddev_time_played_ms / 1000 / 60) * 100) / 100
      },
      settings_preferences: settingsStats.map(stat => ({
        visual_hints: stat.visual_hints,
        speech_hints: stat.speech_hints,
        sound: stat.sound,
        usage_count: stat.usage_count,
        avg_progress_percent: Math.round(stat.avg_progress_for_setting * 100) / 100,
        percentage_of_total: Math.round((stat.usage_count / totalSessions[0].total_sessions) * 10000) / 100
      })),
      progress_distribution: progressDistribution,
      daily_activity_last_30_days: dailyStats,
      recent_activity_7_days: {
        new_users: recentActivity[0].new_users_7_days,
        total_sessions: recentActivity[0].sessions_7_days,
        users_completed: recentActivity[0].completed_7_days,
        active_learners: recentActivity[0].active_learners_7_days,
        users_started_learning: newStarters[0].started_learning_7_days
      }
    };

    // Cache the results
    statsCache = { ...statsData, metadata: { ...statsData.metadata, cached: true } };
    statsCacheTime = Date.now();

    res.json(statsData);
  } catch (error) {
    console.error('Error in stats endpoint:', error);
    return res.status(500).json({ error: 'Failed to generate statistics' });
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
