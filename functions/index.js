/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const functions = require('firebase-functions');
const { google } = require('googleapis');

// Load your service account credentials
const serviceAccount = require('./service-account-credentials.json');

// Configure your spreadsheet details
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';  // Replace with your actual spreadsheet ID.
const RANGE = 'Sheet1!A1:Z100';  // Adjust this range based on your sheet.

// Function to fetch data from Google Sheets
async function getSheetData() {
  // Create a JWT client using your service account credentials.
  const authClient = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  // Authorize the client.
  await authClient.authorize();

  // Create a Sheets API client.
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // Get data from the specified range in the sheet.
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });

  // Return the data values.
  return response.data.values;
}

// Cloud Function: HTTPS endpoint to retrieve sheet data.
exports.getSheetData = functions.https.onRequest(async (req, res) => {
  // Set CORS headers to allow cross-origin requests if needed.
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  
  // Handle preflight OPTIONS request.
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const data = await getSheetData();
    res.status(200).json({ data });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    res.status(500).json({ error: error.message });
  }
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
