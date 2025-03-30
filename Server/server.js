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
let bullets = {}; // placeholder if you're adding projectile logic later

// HTTP POST /register — for fetch() from EnterName
app.post("/register", (req, res) => {
  const playerName = req.body.player_name;
  console.log("Register via HTTP POST:", playerName);
  // You can insert this into a DB or just log it for now
  res.send("Success");
});

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
  };

  // Receive player name from client after connecting
  socket.on('register', (playerName) => {
    if (players[socket.id]) {
      players[socket.id].name = playerName;
      console.log(`Socket registered: ${playerName}`);
    }
  });

  // Movement event
  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x += data.dx;
      players[socket.id].y += data.dy;
    }
  });

  // Shooting event placeholder
  socket.on('shoot', () => {
    const player = players[socket.id];
    if (player) {
      console.log(`${player.name} shot!`);
      // Add bullet logic here later
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
  });
});

// Game loop: broadcast player state every frame
const framerate = 30;
setInterval(() => {
  io.emit('state', players);
}, 1000 / framerate);
