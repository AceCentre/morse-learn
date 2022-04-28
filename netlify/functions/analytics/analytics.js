const handler = async (event, context) => {
  try {
    // Only allow POST requests
    if (event.httpMethod.toUpperCase() !== "POST") {
      return {
        statusCode: 404,
        body: "Not found",
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `No longer collecting metrics`,
      }),
     
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };
