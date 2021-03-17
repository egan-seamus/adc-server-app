const express = require('express')
const app = express();
const http = require('http').createServer(app);
var cors = require('cors');
const ws = require('websocket').server

const port = 8000;

var adcRead = -1;

app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});

app.get('/sendData', (req, res) => {
    // console.log(req)
    console.log(req.query.val)
    adcRead = req.query.val;
    res.send("Received")
  });

app.get('/getData', (req, res) => {
    voltage = (adcRead / 4095) * 3.3;
    obj = {voltage : voltage}
    res.json(obj);
})

ws.on('connection', (socket) => {
  console.log("a user connected")
  // console.log(socket.id)
  // console.log(socket.handshake.headers.user_id)

  socket.on('disconnect', () => {
      console.log("disconnect")
  })

  socket.on('message-send', (message) => {
      console.log(message)
  })
})