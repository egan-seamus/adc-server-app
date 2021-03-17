var WebSocketServer  = require('websocket').server
var http = require('http');


var readVoltage = 0;
var pingCount = 0;



var port = parseInt(process.env.PORT || 8000)
var debug = false

console.log('WebSocket-Node: echo-server');

var server = http.createServer(function(request, response) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        "Access-Control-Max-Age": 2592000, // 30 days
        /** add other headers as per requirement */
      };
    if (debug) { console.log((new Date()) + ' Received request for ' + request.url); }
    response.writeHead(200, headers);
    response.end(JSON.stringify({voltage: readVoltage}));
});

server.listen(port, function() {
    console.log((new Date()) + ' Server is listening on port ' + port);
    console.log(server.address())
});

var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true,
    maxReceivedFrameSize: 64*1024*1024,   // 64MiB
    maxReceivedMessageSize: 64*1024*1024, // 64MiB
    fragmentOutgoingMessages: false,
    keepalive: false,
    disableNagleAlgorithm: false
});

wsServer.on('connect', function(connection) {
    console.log("connected")
    if (debug) { console.log((new Date()) + ' Connection accepted' + 
                            ' - Protocol Version ' + connection.webSocketVersion); }
    function sendCallback(err) {
        if (err) {
          console.error('send() error: ' + err);
          connection.drop();
          setTimeout(function() {
            process.exit(100);
          }, 100);
        }
    }
    connection.on('message', function(message) {
        console.log(pingCount)
        // console.log(message)
        if (message.type === 'utf8') {
            if (debug) { console.log('Received utf-8 message of ' + message.utf8Data.length + ' characters.'); }
            var adcVal = parseInt(message.utf8Data, 10)
            readVoltage = (adcVal / 4095) * 3.3
            console.log(readVoltage)
            
            connection.sendUTF(message.utf8Data, sendCallback);
        }
        else if (message.type === 'binary') {
            if (debug) { console.log('Received Binary Message of ' + message.binaryData.length + ' bytes'); }
            connection.sendBytes(message.binaryData, sendCallback);
        }
    });
    connection.on('close', function(reasonCode, description) {
        if (debug) { console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.'); }
        connection._debug.printOutput();
    });
});