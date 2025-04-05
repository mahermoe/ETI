const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '../Client')));
app.use(express.json());

let players = {};
let bullets = [];

const classData = {
  pistol: {
    bulletSpeed: 10,
    bulletDmg: 20,
    hitbox: 5,
    movementSpeed: 5
  }
};

server.listen(2000, () => {
  console.log('Server is up on http://localhost:2000');
});

io.on('connection', (socket) => {
  socket.emit("yourId", socket.id);

  console.log('A user connected:', socket.id);

  players[socket.id] = {
    x: 0,
    y: 0,
    name: "",
    xp: 0,
    hp: 100,
    class: "pistol",
    spawned: false,
  };

  socket.on('register', (playerName) => {
    if (players[socket.id]) {
      players[socket.id].name = playerName;
      console.log(`Socket registered: ${playerName} (ID: ${socket.id})`);
      socket.emit('registerSuccess', playerName);
      players[socket.id].spawned = true;
    }
  });

  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x += data.dx * classData[players[socket.id].class].movementSpeed;
      players[socket.id].y += data.dy * classData[players[socket.id].class].movementSpeed;
    }
  });

  socket.on('shoot', (data) => {
    const player = players[socket.id];
    if (player && player.spawned) {
      const bulletSpeed = classData[player.class].bulletSpeed;

      let dx = data.mouseX - player.x;
      let dy = data.mouseY - player.y;

      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return;

      dx = (dx / length) * bulletSpeed;
      dy = (dy / length) * bulletSpeed;

      bullets.push({
        x: player.x,
        y: player.y,
        dx,
        dy,
        owner: socket.id,
        class: player.class,
      });

      console.log(`${player.name} shot: velocity { dx: ${dx.toFixed(2)}, dy: ${dy.toFixed(2)} }`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
  });
});

const framerate = 60;
setInterval(() => {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].x += bullets[i].dx;
    bullets[i].y += bullets[i].dy;

    if (
      bullets[i].x < -1000 || bullets[i].x > 3000 ||
      bullets[i].y < -1000 || bullets[i].y > 3000
    ) {
      bullets.splice(i, 1);
    }
  }

  io.emit('state', {
    players,
    bullets,
  });
}, 1000 / framerate);

