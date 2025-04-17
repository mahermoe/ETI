const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const lastShotTime = {};

app.use(express.static(path.join(__dirname, '../Client'), {index: false}));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Client/Home.html')); // Landing Page
});

app.use(express.json());

let players = {};
let bullets = [];
let npcs = {};
let colors = ["yellow", "purple", "pink"];
let drops = {};
let dropTypes = ["medkit", "armor"];

// Game Configuration
const movementSpeedMultiplier = 2; //1.2
const maxArmorPerLevel = 20;
const armorPerDrop = 20;
const hpPerDrop = 30;
const healthRegenAmount = 0.3;
const healthRegenInterval = 3000; // 3 Seconds
const maxNpcs = 100;
const maxDrops = 25;
const spawnNpcInterval = 1000 // 2.5 Seconds
const spawnDropInterval = 5000 // 5 Seconds

const classData = {
  pistol: {
    bulletSpeed: 6,
    bulletDmg: 15,
    hitbox: 15,
    movementSpeed: 2,
    bulletsPerShot: 1,
    spread: 0,
    fireRate: 600,     // milliseconds between shots (2 shots/sec)
    autoFire: false,     // must click each time
    range: 450
  },
  smg: {
    bulletSpeed: 6,
    bulletDmg: 10,
    hitbox: 15,
    movementSpeed: 2,
    bulletsPerShot: 1,
    spread: 20,
    fireRate: 200,     // 
    autoFire: true ,    // hold mouse button
    range: 450
  },
  rifle: {
    bulletSpeed: 10,
    bulletDmg: 23,
    hitbox: 15,
    movementSpeed: 2,
    bulletsPerShot: 1,
    spread: 0,
    fireRate: 720,     //
    autoFire: false,
    range: 650
  },
  sniper: {
    bulletSpeed: 25,
    bulletDmg: 50,
    hitbox: 15,
    movementSpeed: 2,
    bulletsPerShot: 1,
    spread: 0,
    fireRate: 1600,    //  shots/sec
    autoFire: false,
    range: 900
  },
  shotgun: {
    bulletSpeed: 4,
    bulletDmg: 17,
    hitbox: 15,
    movementSpeed: 2,
    bulletsPerShot: 7,
    spread: 30,
    fireRate: 1200,    // 1 shot/sec
    autoFire: false,
    range: 250
  }
};
  

server.listen(1439, '0.0.0.0', () => {
  console.log('Server is up on port 2000');
});

io.on('connection', (socket) => {
  console.log('A socket user connected:', socket.id);

  players[socket.id] = {
    x: 1500,
    y: 1500,
    cannonX: 0,
    cannonY: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    name: "",
    level: 1,
    xp: 0,
    skillPoints: 1,
    hp: 100,
    armor: 0,
    maxArmor: 0, // Player Stat
    healthRegen: 0, // Player Stat
    bulletDamage: 0, // Player Stat
    movementSpeed: 0, // Player Stat
    class: "pistol",
    spawned: false,
  };

  socket.on('register', (playerName) => {
    if (players[socket.id]) {
      players[socket.id].name = playerName;
      players[socket.id].hp = 100;
      players[socket.id].armor = 0;
      players[socket.id].x = 1500;
      players[socket.id].y = 1500;
      //----------Reset StatPoints, Level, Xp, Class, Etc. Not yet.----------\\
      players[socket.id].level = 1;
      players[socket.id].xp = 0;
      players[socket.id].skillPoints = 1;
      players[socket.id].class = "pistol";
      players[socket.id].maxArmor = 0;
      players[socket.id].healthRegen = 0;
      players[socket.id].bulletDamage = 0;
      players[socket.id].movementSpeed = 0;
      console.log(`Player registered: ${playerName} (ID: ${socket.id})`);
      socket.emit('registerSuccess', playerName, socket.id);
      
      console.log(`Registered ${playerName} as ${players[socket.id].class}`);
      players[socket.id].spawned = true;
    }
  });

  socket.on('move', (data) => {
    if (players[socket.id]) {
      let player = players[socket.id];
  
      player.x += data.dx * movementSpeedMultiplier * (1 + (player.movementSpeed / 100));
      player.y += data.dy * movementSpeedMultiplier * (1 + (player.movementSpeed / 100));
  
      player.x = Math.max(0, Math.min(3000, player.x));
      player.y = Math.max(0, Math.min(3000, player.y));
    }
  });

  socket.on('cannonmove', (data)=> {
    const player = players[socket.id];
    if (player && player.spawned) {
      player.cannonX = data.cannonX;
      player.cannonY = data.cannonY;
      player.canvasHeight = data.canvasHeight;
      player.canvasWidth = data.canvasWidth;
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
        class: player.class,
        startX: player.x,
        startY: player.y,
        maxDistance: weapon.range
      });
    }
  
    console.log(`[${player.class}] ${player.name} fired`);
  });

  socket.on('pickupDrop', (dropId) => {
    const drop = drops[dropId];
    const player = players[socket.id];
    if (!drop || !player || !player.spawned) return;

    const dx = drop.x - player.x;
    const dy = drop.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 30){
      if (drop.type === "medkit"){
        player.hp = Math.min(player.hp + hpPerDrop, 100);
      }
      else { // type === "armor"
        player.armor = Math.min(player.armor + armorPerDrop, (player.maxArmor * maxArmorPerLevel));
      }
      delete drops[dropId];
    }
  });

  socket.on('upgradeStat', (statName) => {
    const player = players[socket.id];
    if (!player || !player.spawned || player.skillPoints === 0 || player[statName] === null || player[statName] >= 10) return;
    player[statName]++;
    player.skillPoints--;
    console.log(`${statName} upgraded to ${player[statName]},  ${player.skillPoints} skill points remaining. `);
  });

  socket.on('selectClass', (selectedClass) => {
    const player = players[socket.id];
    if (!player || !player.spawned || player.level < 10 || !classData[selectedClass] || player.class != "pistol") return;
    player.class = selectedClass;
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
  });

}); //-------------------------- End of Sockets //--------------------------\\

// Player Health Regen every 3 seconds (0.3 * stat hp)
function doHealthRegen(){
  for (const id in players){
    if (players[id].hp < 100){
      players[id].hp += (players[id].healthRegen * healthRegenAmount);
    }
    if (players[id].hp > 100){
      players[id].hp = 100;
    }
  }
  setTimeout(doHealthRegen, healthRegenInterval);
}
doHealthRegen() // Initial Call

// Spawn Random NPCs
function spawnRandomNPC(){
  if (Object.keys(npcs).length < maxNpcs){ // Don't spawn npc if amount >= 100
    const id = "npc_" + Date.now(); // Unique id based on time
    const color = colors[Math.floor(Math.random() * colors.length)]; // Random color from colors array
    const hp = color === "yellow" ? 75 : color === "purple" ? 150 : color === "pink" ? 300 : 100;
    npcs[id] = {
      x: Math.floor(Math.random() * 3000), // Random spawn location
      y: Math.floor(Math.random() * 3000),
      color,
      hp
    }
    console.log(`Spawned NPC ${id} at (${npcs[id].x}, ${npcs[id].y})`);
  }
  setTimeout(spawnRandomNPC, spawnNpcInterval); // Spawn npcs every 2.5 second
}
spawnRandomNPC(); // Initial Npc spawn

function spawnDrop(){
  if(Object.keys(drops).length < maxDrops){
    const type = dropTypes[Math.floor(Math.random() * dropTypes.length)] 
    const id = "drop_" + type + "_" + Date.now();
    drops[id] = {
      x: Math.floor(Math.random() * 3000), // Random spawn location
      y: Math.floor(Math.random() * 3000),
      type
    }
    console.log(`Spawned Drop ${id} at (${drops[id].x}, ${drops[id].y})`);
  }
  setTimeout(spawnDrop, spawnDropInterval); // Spawn drop every 5 seconds
}
spawnDrop(); // Initial Drop spawn

function giveXp(player, xp){
  if (!player) return;
  player.xp += xp;
  if (player.level >= 30){
    if (player.xp > 3000){
      player.xp = 3000;
    }
    return;
  }
  while (player.xp >= player.level * 100){ // Check if xp exceeds xp max (level * 100), carry over xp
    player.xp -= player.level * 100;
    player.level++;
    player.skillPoints += 1;
  }
}

// Game Loop
const framerate = 60;
setInterval(() => {
  // Bullet Server Logic
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];

    // Bullet Movement
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    // Check if bullet has traveled beyond its max range using squared distance
    const dx = bullet.x - bullet.startX;
    const dy = bullet.y - bullet.startY;
    const distSquared = dx * dx + dy * dy;

    if (distSquared > bullet.maxDistance * bullet.maxDistance) {
      bullets.splice(i, 1);
      continue;
}

    let hit = false;

    // Bullet Damaging Players
    for (const id in players){
      const target = players[id];
      if (!target.spawned || id === bullet.owner) continue;

      const dx = bullet.x - target.x;
      const dy = bullet.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const hitbox = classData[bullet.class].hitbox;

      // If player within hitbox range do damage
      if (dist <= hitbox && players[bullet.owner]){ // Check distance and bullet owner in-game
        let dmg = classData[bullet.class].bulletDmg * (1 + (players[bullet.owner].bulletDamage / 10)); // 1.1, 1.2, 1.3 (lvl 3)

        // Damage Player Armor
        if(target.armor > 0){
          const armorDamage = Math.min(target.armor, dmg);
          target.armor -= armorDamage;
          dmg -= armorDamage;
        }
        // Damage Player Health
        if (dmg > 0){
          target.hp -= dmg;
        }

        console.log(`${players[bullet.owner].name} hit ${target.name} for ${dmg} dmg`);
        hit = true;

        if (target.hp <= 0) { // Handle respawning if dead
          target.hp = 0;
          target.spawned = false;
          console.log(`${target.name} was eliminated by ${players[bullet.owner].name}`);
          if (players[bullet.owner]){ // Give bullet owner xp (target level / 3 * 100)
            giveXp(players[bullet.owner], Math.round(target.level / 1.5 * 100));
          }
        }

        break; // One hit per bullet
      }
    }

    for (const npcId in npcs){
      const npcTarget = npcs[npcId];
      const npcHitbox = npcTarget.color === "yellow" ? 10 : npcTarget.color === "purple" ? 20 : npcTarget.color === "pink" ? 30 : 10;
      if (hit) break;
      if (npcTarget.hp <= 0) continue;

      const dx = bullet.x - npcTarget.x;
      const dy = bullet.y - npcTarget.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitbox = classData[bullet.class].hitbox;

      // Damage NPC Health
      if (dist <= 10 + npcHitbox && players[bullet.owner]){ // Check distance and bullet owner in-game
        let dmg = classData[bullet.class].bulletDmg * (1 + (players[bullet.owner].bulletDamage / 10)); // 1.1, 1.2, 1.3 (lvl 3)
        npcTarget.hp -= dmg;
        console.log(`${players[bullet.owner].name} hit NPC ${npcId} for ${dmg} dmg`);
        hit = true;

        // NPC Death -- Give Player XP -- Remove NPC
        if (npcTarget.hp <= 0){
          let xpForKill = npcTarget.color === "yellow" ? 100 : npcTarget.color === "purple" ? 250 : npcTarget.color === "pink" ? 500 : 0;
          giveXp(players[bullet.owner], xpForKill);
          console.log(`${players[bullet.owner].name} killed NPC ${npcId} and earned ${xpForKill} XP!`);
          delete npcs[npcId];
        }
        break;
      }
    }

    // Remove bullet if out of bounds or it hit somebody
    if (
      hit ||
      bullets[i].x < 0 || bullets[i].x > 3000 ||
      bullets[i].y < 0 || bullets[i].y > 3000 ||
      !players[bullet.owner] // Remove bullet if bullet owner leaves game
    ) {
      bullets.splice(i, 1);
    }
  }

  io.emit('state', {
    players,
    bullets,
    npcs,
    drops
  });
}, 1000 / framerate);

