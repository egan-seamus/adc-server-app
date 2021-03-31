var WebSocketServer = require('websocket').server
var http = require('http');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

var readVoltage = 0;
var pingCount = 2;
let writeValues = [

]

var oAuth2Client;
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
    authorize(JSON.parse(content));
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) console.error(err)
        oAuth2Client.setCredentials(JSON.parse(token));
        setValue();
    });
}

function setValue() {
    const now = new Date(Date.now());
    const mDatetime = "" + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + "." + now.getMilliseconds();
    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
    const values = [
        [
            mDatetime, 5
        ]
    ]
    const body = {
        values: values
    }
    sheets.spreadsheets.values.update({
        spreadsheetId: '11YpQkBejAM4sAYFwxafj73fAXqPPY14F_vZnpmR1hlI',
        range: 'A4:B4',
        valueInputOption: "USER_ENTERED",
        resource: body
    }).then((response) => {
        console.log("success");
    })
        .catch((err) => {
            console.error(err)
        })
}

function writeNextValue() {
    console.log(pingCount)
    if (pingCount % 1002 !== 0) {
        const now = new Date(Date.now());
        const mDatetime = "" + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + "." + now.getMilliseconds();
        writeValues.push([
            mDatetime, readVoltage
        ])

    }
    else {
        
        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
        const body = {
            values: writeValues
        }
        sheets.spreadsheets.values.update({
            spreadsheetId: '11YpQkBejAM4sAYFwxafj73fAXqPPY14F_vZnpmR1hlI',
            range: 'A' + (pingCount - 1000)+ ':B' + pingCount,
            valueInputOption: "USER_ENTERED",
            resource: body
        })
            .then((response) => {
                console.log("response");
            })
            .catch((err) => {
                console.error(err)
            })
        writeValues = []
    }
}

// setValue();

var port = parseInt(process.env.PORT || 8000)
var debug = false

console.log('WebSocket-Node: echo-server');

var server = http.createServer(function (request, response) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        "Access-Control-Max-Age": 2592000, // 30 days
        /** add other headers as per requirement */
    };
    if (debug) { console.log((new Date()) + ' Received request for ' + request.url); }
    response.writeHead(200, headers);
    response.end(JSON.stringify({ voltage: readVoltage }));
});

server.listen(port, function () {
    console.log((new Date()) + ' Server is listening on port ' + port);
    console.log(server.address())
});

var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true,
    maxReceivedFrameSize: 64 * 1024 * 1024,   // 64MiB
    maxReceivedMessageSize: 64 * 1024 * 1024, // 64MiB
    fragmentOutgoingMessages: false,
    keepalive: false,
    disableNagleAlgorithm: false
});

wsServer.on('connect', function (connection) {
    console.log("connected")
    if (debug) {
        console.log((new Date()) + ' Connection accepted' +
            ' - Protocol Version ' + connection.webSocketVersion);
    }
    function sendCallback(err) {
        if (err) {
            console.error('send() error: ' + err);
            connection.drop();
            setTimeout(function () {
                process.exit(100);
            }, 100);
        }
    }
    connection.on('message', function (message) {
        pingCount++
        // console.log(message)
        if (message.type === 'utf8') {
            if (debug) { console.log('Received utf-8 message of ' + message.utf8Data.length + ' characters.'); }
            var adcVal = parseInt(message.utf8Data, 10)
            readVoltage = (adcVal / 4095) * 3.3
            // console.log(readVoltage)
            writeNextValue();

            connection.sendUTF(message.utf8Data, sendCallback);
        }
        else if (message.type === 'binary') {
            if (debug) { console.log('Received Binary Message of ' + message.binaryData.length + ' bytes'); }
            connection.sendBytes(message.binaryData, sendCallback);
        }
    });
    connection.on('close', function (reasonCode, description) {
        if (debug) { console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.'); }
        connection._debug.printOutput();
    });
});