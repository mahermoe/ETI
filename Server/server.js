const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const lastShotTime = {};

app.use(express.static(path.join(__dirname, '../Client')));
app.use(express.json());

let players = {};
let bullets = [];

const classData = {
  pistol: {
    bulletSpeed: 10,
    bulletDmg: 20,
    hitbox: 5,
    movementSpeed: 5,
    bulletsPerShot: 1,
    spread: 0,
    fireRate: 500,     // milliseconds between shots (2 shots/sec)
    autoFire: false     // must click each time
  },
  smg: {
    bulletSpeed: 13,
    bulletDmg: 10,
    hitbox: 4,
    movementSpeed: 6,
    bulletsPerShot: 1,
    spread: 0,
    fireRate: 100,     // 10 shots/sec
    autoFire: true     // hold mouse button
  },
  rifle: {
    bulletSpeed: 15,
    bulletDmg: 15,
    hitbox: 5,
    movementSpeed: 5,
    bulletsPerShot: 1,
    spread: 0,
    fireRate: 500,     // 2 shots/sec
    autoFire: false
  },
  sniper: {
    bulletSpeed: 25,
    bulletDmg: 100,
    hitbox: 6,
    movementSpeed: 4,
    bulletsPerShot: 1,
    spread: 0,
    fireRate: 1200,    // 0.8 shots/sec
    autoFire: false
  },
  shotgun: {
    bulletSpeed: 8,
    bulletDmg: 10,
    hitbox: 5,
    movementSpeed: 4,
    bulletsPerShot: 5,
    spread: 15,
    fireRate: 1000,    // 1 shot/sec
    autoFire: false
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
    cannonX: 0,
    cannonY: 0,
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
      socket.emit('registerSuccess', playerName, socket.id);
      
      console.log(`Registered ${playerName} as ${players[socket.id].class}`);
      players[socket.id].spawned = true;
    }
  });

  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x += data.dx * classData[players[socket.id].class].movementSpeed;
      players[socket.id].y += data.dy * classData[players[socket.id].class].movementSpeed;
    }
  });

  socket.on('cannonmove', (data)=> {
    const player = players[socket.id];
    if (player && player.spawned) {
      player.cannonX = data.cannonX;
      player.cannonY = data.cannonY;
    }
  });

  socket.on('shoot', (data) => {
    const player = players[socket.id];
    if (!player || !player.spawned) return;
  
    const weapon = classData[player.class];
    const now = Date.now();
  
    // Check fire cooldown
    if (lastShotTime[socket.id] && now - lastShotTime[socket.id] < weapon.fireRate) {
      return; // Too soon to shoot again
    }
  
    lastShotTime[socket.id] = now; // Update last fire time
  
    const dxRaw = data.mouseX - player.x;
    const dyRaw = data.mouseY - player.y;
    const angle = Math.atan2(dyRaw, dxRaw);
    const bulletSpeed = weapon.bulletSpeed;
  
    for (let i = 0; i < weapon.bulletsPerShot; i++) {
      let spreadAngle = angle;
  
      if (weapon.spread > 0 && weapon.bulletsPerShot > 1) {
        const spreadOffset = (Math.random() - 0.5) * weapon.spread * (Math.PI / 180);
        spreadAngle += spreadOffset;
      }
  
      const dx = Math.cos(spreadAngle) * bulletSpeed;
      const dy = Math.sin(spreadAngle) * bulletSpeed;
  
      bullets.push({
        x: player.x,
        y: player.y,
        dx,
        dy,
        owner: socket.id,
        class: player.class
      });
    }
  
    console.log(`[${player.class}] ${player.name} fired`);
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

