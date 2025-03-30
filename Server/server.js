const express = require('express'); // sending files
const http = require('http'); // connecting to internet
const socketIo = require('socket.io'); // send and recieve real time data text and numbers
const path = require('path'); // finding and navigating file paths
const app = express(); // initializing express library
const server = http.createServer(app); // create server that sends files
const io = socketIo(server); // making socketio responsible for the real time connection logic

let players = {}
let bullets = {}

// Send index.html to any users vising starting page
const clientLandingPagePath = path.join(__dirname, '../', '/client/index.html'); // localhost:2000
app.get('/', (req, res) => {
    res.sendFile(clientLandingPagePath);
});

server.listen(2000, () => {
    console.log('Server is up on port: 2000');
});

io.on('connection', (socket) => {
    // Code for client connecting
    console.log ('a user connected');
    players[socket.id] = {
        x: 0, 
        y: 0,
        name: "",
        xp: "",
        hp: 100,
        class: "pistol",
    };

    // Listen for move command from client
    socket.on('move', (data) => {   
        players[socket.id].x += data.dx;
        players[socket.id].y += data.dy;

    });

    // Listen to shoot command from client
    socket.on('shoot', () =>{
        const player = players[socket.id];

    })

    // Code for client disconnecting
    socket.on('disconnect', () => {
        console.log('a user disconnected');
        delete players[socket.id]; // remove player from player database
    });
});

// Tick function // Send players data to all clients
let framerate = 30;
setInterval(function(){
    io.emit('state', players);
}, 1000/framerate)