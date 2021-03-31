const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), listMajors);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
  // const sheets = google.sheets({version: 'v4', auth});
  // sheets.spreadsheets.values.get({
  //   spreadsheetId: '11YpQkBejAM4sAYFwxafj73fAXqPPY14F_vZnpmR1hlI',
  //   range: 'A:A',
  // }, (err, res) => {
  //   if (err) return console.log('The API returned an error: ' + err);
  //   const rows = res.data.values;
  //   if (rows.length) {
  //     // Print columns A and E, which correspond to indices 0 and 4.
  //     rows.map((row) => {
  //       console.log(`${row[0]}, ${row[4]}`);
  //     });
  //   } else {
  //     console.log('No data found.');
  //   }
  // });
  setValue(auth)
}

function setValue(auth) {
  const now = new Date(Date.now());
  let newSheetname = "" + (now.getMonth() + 1).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })
  newSheetname += "-" + (now.getDate()).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })
  newSheetname += " " + (now.getHours()).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false }) + ":" + (now.getMinutes()).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false }) + ":" + (now.getSeconds()).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false });
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.create({
    resource: {
      properties: {
        title: newSheetname
      }
    }
  })
    .then((response) => {
      // console.log(response)
      console.log("id:" + response.data.spreadsheetId)
      
      const batchUpdateRequest = { requests: [
        {
          "appendDimension": {
            "sheetId": 0,
            "dimension": "ROWS",
            "length": 1000
          }
        }
      ] };
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: response.data.spreadsheetId,
        resource: batchUpdateRequest,
      }, (err, response) => {
        if (err) {
          // Handle error
          console.log(err);
        } else {
          console.log(response)
        }
      });
    })
    .catch((error) => {
      console.log(error)
    })
  // const values = [
  //   [
  //     mDatetime, 5
  //   ]
  // ]
  // const body = {
  //   values: values
  // }
  // sheets.spreadsheets.values.update({
  //   spreadsheetId: '11YpQkBejAM4sAYFwxafj73fAXqPPY14F_vZnpmR1hlI',
  //   range: 'A4:B4',
  //   valueInputOption: "USER_ENTERED",
  //   resource: body
  // }).then((response) => {
  //   console.log(response);
  // })
  // .catch((err) => {
  //   console.log(err)
  // }) 

}