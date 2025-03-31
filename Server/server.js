const express = require('express');           // Sending files (HTML, CSS, JS)
const http = require('http');                 // Creating server
const socketIo = require('socket.io');        // Real-time communication
const path = require('path');                 // Path navigation

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '../Client'))); // Serve UI
app.use(express.json()); // Parse JSON for POST requests

// In-memory game state
let players = {};
let bullets = [];
const classData = {
  pistol : {
    bulletSpeed: 10,
    bulletDmg: 20,
    hitbox: 5,
    movementSpeed: 5
  }
} 

// Start HTTP + WebSocket server
server.listen(2000, () => {
  console.log('Server is up on http://localhost:2000');
});

// Real-time WebSocket logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Create default player entry
  players[socket.id] = {
    x: 0,
    y: 0,
    name: "",
    xp: 0,
    hp: 100,
    class: "pistol",
    spawned: false,
  };

  // Receive player name from client after connecting
  socket.on('register', (playerName) => {
    if (players[socket.id]) {
      players[socket.id].name = playerName;
      console.log(`Socket registered: ${playerName} (ID: ${socket.id})`);
      socket.emit('registerSuccess', playerName);
      players[socket.id].spawned = true;
    }
  });

  // Movement event
  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x += data.dx * classData[players[socket.id].class].movementSpeed;
      players[socket.id].y += data.dy * classData[players[socket.id].class].movementSpeed;
    }
  });
    

  // Shooting event placeholder
  socket.on('shoot', (data) => {
    const player = players[socket.id];
    if (player && player.spawned) {
      console.log(`${player.name} shot!`);

      let dx = data.mouseX - player.x;
      let dy = data.mouseY - player.y;
      let bulletSpeed = classData[player.class].bulletSpeed;

      bullets.push({
        x: player.x,
        y: player.y,
        dx: dx * bulletSpeed,
        dy: dy * bulletSpeed,
        owner: socket.id,
        class: player.class
      });

    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
  });
});

// Game loop: broadcast player state every frame
const framerate = 60;
setInterval(() => {
  io.emit('state', {players, bullets});
}, 1000 / framerate);
