// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
// get the client
const mysql = require("mysql2");
const {
  v4: uuidv4,
  version: uuidVersion,
  validate: uuidValidate,
} = require("uuid");
const cookie = require("cookie");

// create the connection to database
const connection = mysql.createConnection({
  host: "morse-learn-do-user-1044927-0.b.db.ondigitalocean.com",
  port: 25060,
  user: "metric_collector",
  database: "morse_learn",
  password: process.env.DB_PASSWORD,
  ssl: {
    ca: process.env.CA_CERT,
    rejectUnauthorized: false
  }
});

const handler = async (event, context) => {
  try {
    // Only allow POST requests
    if (event.httpMethod.toUpperCase() !== "POST") {
      return {
        statusCode: 404,
        body: "Not found",
      };
    }

    const body = JSON.parse(event.body);
    const timePlayed = body.timePlayed;
    const sound = body.sound;
    const speechHints = body.speechHints;
    const visualHints = body.visualHints;
    const progressDump = body.progress;
    const letterData = body.letterData ? JSON.stringify(body.letterData) : null;
    const progressPercent = calculateProgressPercent(progressDump);
    const settingsDump = {
      sound,
      speechHints,
      visualHints,
    };

    // If any of these values aren't set its easier to bail as early as we can
    // and give a useful error message
    throwIfUndefinedOrNull(timePlayed, "timePlayed");
    throwIfUndefinedOrNull(sound, "sound");
    throwIfUndefinedOrNull(speechHints, "speechHints");
    throwIfUndefinedOrNull(visualHints, "visualHints");
    throwIfUndefinedOrNull(progressDump, "progressDump");
    throwIfUndefinedOrNull(progressPercent, "progressPercent");
    throwIfUndefinedOrNull(settingsDump, "settingsDump");

    // Get the userId (or a new one if one isnt given)
    let userIdentifier = getUserIdCookie(event.headers.cookie);
    if (!userIdentifier) userIdentifier = uuidv4();

    const { results: [ lastProgressLog ] } = await query(connection, `
    SELECT settingsDump, dateCreated from progress_log
    WHERE userIdentifier = ?
    ORDER BY dateCreated DESC
    LIMIT 1
    `, [userIdentifier]);

    let settingsChanged = false;

    if(lastProgressLog) {
      const oldSettingsDump = JSON.parse(lastProgressLog.settingsDump);
      
      if(oldSettingsDump.sound !== settingsDump.sound) settingsChanged = true;
      if(oldSettingsDump.speechHints !== settingsDump.speechHints) settingsChanged = true;
      if(oldSettingsDump.visualHints !== settingsDump.visualHints) settingsChanged = true;
    } 


    // We always want to add a progress log
    await query(
      connection,
      `
    INSERT INTO progress_log 
    (userIdentifier, progressDump, progressPercent, timePlayed, dateCreated, visualHints, speechHints, sound, settingsDump, progressDetail, settingsChanged)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
      [
        userIdentifier,
        JSON.stringify(progressDump),
        progressPercent,
        timePlayed,
        new Date(),
        visualHints,
        speechHints,
        sound,
        JSON.stringify(settingsDump),
        letterData,
        settingsChanged
      ]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully logged progress for ${userIdentifier}`,
      }),
      headers: {
        "Set-Cookie": cookie.serialize("userIdentifier", userIdentifier, {
          httpOnly: true,
          path: "/",
          maxAge: 2147483647, // Largest max age allowed
        }),
      },
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

const calculateProgressPercent = (progress) => {
  // Once the user has answered a letter correct x times we say they have learned it
  const howManyCorrectAnswersToLearn = 4;
  const noOfLettersInTheAlphabet = Object.keys(progress).length;
  const totalLetterAnswersCorrect = Object.values(progress).reduce(
    (accumulator, currentValue) => accumulator + currentValue,
    0
  );
  const hundredPercent =
    noOfLettersInTheAlphabet * howManyCorrectAnswersToLearn;

  const rawPercent = (totalLetterAnswersCorrect * 100) / hundredPercent;

  return Math.floor(rawPercent);
};

const throwIfUndefinedOrNull = (value, key) => {
  if (value === null || value === undefined) {
    throw new Error("Value not defined: ", key);
  }
};

// Wrap database query in a promise so we can await it
const query = (currentConnection, query, params) => {
  return new Promise((res, rej) => {
    currentConnection.query(query, params, function (err, results, fields) {
      if (err) return rej(err);
      res({ results, fields });
    });
  });
};

// Parse the cookie for valid useridentifier.
// Return a null if it cant find one
const getUserIdCookie = (cookies = "") => {
  // Return null if no cookies
  if (!cookies) return null;

  const split = cookies.split(";");
  const keyValues = split.map((x) => x.split("="));

  let userId = null;

  for (const [key, value] of keyValues) {
    if (key.trim().toLowerCase() === "useridentifier") {
      userId = value.trim().toLowerCase();
    }
  }

  // Return null if no cookie with the key 'useridentifier'
  if (userId === null) return null;

  // Return the userId if the id is a valid uuid
  if (isValidId(userId)) return userId;

  // Return null if the cookie is not a valid uuid
  return null;
};

function isValidId(uuid) {
  return uuidValidate(uuid) && uuidVersion(uuid) === 4;
}

module.exports = { handler };
