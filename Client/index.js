import socket from "./socket.js";

let myId = null; // Store the player's ID

// Show custom success popup
function showSuccess(message) {
    const box = document.getElementById("successBox");
    box.textContent = message;
    box.classList.remove("hidden");
  
    setTimeout(() => {
      box.classList.add("hidden");
    }, 3000);
}

// Show custom error popup
function showError(message) {
    const box = document.getElementById("errorBox");
    box.textContent = message;
    box.classList.remove("hidden");
  
    //Hide it after 3 seconds
    setTimeout(() => {
      box.classList.add("hidden");
    }, 3000);
}

// Register client to server
function submitName() {
    const playerName = document.getElementById("player-name").value.trim();

    if (!playerName) {
        showError("Please enter a name.");
        return;
    }

    socket.emit("register", playerName);

    socket.on("registerSuccess", (playerName, id) => {
        showSuccess(`Welcome ${playerName}, Your Story Begins.`);

        myId = id; // Store the player's ID when received from the server

        setTimeout(() => {
            document.getElementById("enterNameScreen").classList.add("hidden"); // Hide Name Screen
            document.getElementById("gameScreen").classList.remove("hidden");  // Show Game Screen
            document.getElementById("status-bar-container").classList.remove("hidden");  // Show Health bar
            document.getElementById("stat-panel").classList.remove("hidden");  // Show Upgrade Tab
            document.getElementById("xp-bar-container").classList.remove("hidden");  // Show Xp bar
            document.getElementById("armor-bar-container").classList.remove("hidden");  // Show Armor bar
        }, 1000);
    });
}

window.submitName = submitName; // Make the function globally accessible
window.upgradeStat = upgradeStat; 

//---- Game Logic ----\\

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

function resizeCanvas() {
    const fixedWidth = 1920;
    const fixedHeight = 1080;

    // Set internal resolution (won't change with zoom)
    canvas.width = fixedWidth;
    canvas.height = fixedHeight;

    // Scale canvas visually to fit window size
    const scaleX = window.innerWidth / fixedWidth;
    const scaleY = window.innerHeight / fixedHeight;
    const scale = Math.max(scaleX, scaleY);

    canvas.style.width = `${fixedWidth * scale}px`;
    canvas.style.height = `${fixedHeight * scale}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Call once initially

const players = {};
let bullets = []; // Array to hold bullet objects   
let npcs = {};
let drops = {};
let mouseDown = false;
let mouseWorldX = 0; // Calculated each frame based on player position and mouse screen position
let mouseWorldY = 0;
let mouseScreenX = 0; // Raw position of mouse on screen
let mouseScreenY = 0;
const lerpFactor = 0.1; // Controls smooth movement
let zoom = 2;
let selectClassIgnore = 0;
let keys = {
    w: false,
    a: false,
    s: false,
    d: false,
};

// ---------------- Capture mouse events ---------------- \\
canvas.addEventListener("mousedown", () => {
    mouseDown = true;
    handleAutoFire();
});
  
canvas.addEventListener("mouseup", () => {
    mouseDown = false;
});
  
canvas.addEventListener("mousemove", (event) => {
    if (!myId || !players[myId]) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouseScreenX = (event.clientX - rect.left) * scaleX / zoom;
    mouseScreenY = (event.clientY - rect.top) * scaleY / zoom;

    socket.emit("cannonmove", {
        cannonX: mouseScreenX,
        cannonY: mouseScreenY,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
    });
});

canvas.addEventListener("click", (event) => {
    if (!myId || !players[myId]) return;
  
    const player = players[myId];

    // mouseWorldX = mouseScreenX - canvas.width / (2 * zoom) + player.x;
    // mouseWorldY = mouseScreenY - canvas.height / (2 * zoom) + player.y;
  
    socket.emit("shoot", {
      mouseX: mouseWorldX,
      mouseY: mouseWorldY,
    });
    
});

function handleAutoFire() {
    if (!myId || !players[myId]) return;
  
    const player = players[myId];

    // mouseWorldX = mouseScreenX - canvas.width / (2 * zoom) + player.x;
    // mouseWorldY = mouseScreenY - canvas.height / (2 * zoom) + player.y;
  
    socket.emit("shoot", {
      mouseX: mouseWorldX,
      mouseY: mouseWorldY,
    });

    if (mouseDown){
        setTimeout(handleAutoFire, 100);
    }
}

// Select Class
document.querySelectorAll('.class-tile').forEach(tile => {
    tile.addEventListener('click', () => {
        let selectedClass = tile.getAttribute('data-class');
        socket.emit('selectClass', selectedClass);
        // You can add additional logic here, like updating the UI or triggering other game mechanics
    });
});

// Select Class Ignore Button
document.querySelector('.ignore-btn').addEventListener('click', () => {
    document.getElementById('class-panel').classList.add('hidden'); 
    if (!myId || !players[myId] || players[myId].level < 10) return;
    selectClassIgnore += 1;
});


// ------------------- Capture key events ------------------- \\
document.addEventListener("keydown", (event) => {
    if (keys[event.key] !== undefined) {
        keys[event.key] = true;
    }

    // Drops Interaction
    if ((event.key === 'e' || event.key === 'E') && myId && players[myId]) {
        for(const id in drops){
            const drop = drops[id];
            const dx = drop.x - players[myId].x;
            const dy = drop.y - players[myId].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 30 && myId && players[myId]){
                socket.emit("pickupDrop", id);
                break;
            }
        }
    }
});
  
document.addEventListener("keyup", (event) => {
    if (keys[event.key] !== undefined) {
        keys[event.key] = false;
    }
});

// ------------------------- Update UI ------------------------- \\
function updateHealthArmorBar() {
    const healthBar = document.getElementById("health-bar");
    const healthText = document.getElementById("health-text")
    const armorBar = document.getElementById("armor-bar");
    const armorText = document.getElementById("armor-text");
  
    let health = players[myId].hp; // Get's Players Health
    healthBar.style.width = `${health}%`;

    let armor = players[myId].armor;
    let maxArmor = players[myId].maxArmor;
    let armorWidth = maxArmor > 0 ? (armor / (maxArmor * 20)) * 100 : 0;
    armorBar.style.width = `${armorWidth}%`;
  
    if (health > 66) {
      healthBar.style.backgroundColor = "#4caf50"; // green
    } else if (health > 33) {
      healthBar.style.backgroundColor = "#ff9800"; // orange
    } else {
      healthBar.style.backgroundColor = "#f44336"; // red
    }

    healthText.textContent = `${Math.round((players[myId].hp * 10)) / 10}/100 HP`;
    armorText.textContent = `${Math.round((armor * 10)) / 10}/${maxArmor * 20} Armor`;
}

function updateXPBar() {
    const xpBar = document.getElementById('xp-bar');
    const xpText = document.getElementById('xp-text');
    const xpMax = players[myId].level * 100;
  
    const percentage = Math.min(100, (players[myId].xp / xpMax) * 100);
    xpBar.style.width = `${percentage}%`;
    xpText.textContent = `Level ${players[myId].level}: ${players[myId].xp}/${(xpMax)} XP`;
}

function setStatSegments(statName, level) {
    const bar = document.querySelector(`.segment-bar[data-bar="${statName}"]`);
    if (!bar) return;
  
    const segments = bar.querySelectorAll('.segment');
    segments.forEach((seg, index) => {
      if (index < level) {
        seg.classList.add('filled', 'active');
      } else {
        seg.classList.remove('filled', 'active');
      }
    });
  
    const valueLabel = document.querySelector(`.stat-value[data-stat="${statName}"]`);
    if (valueLabel) {
      valueLabel.textContent = level;
    }
}

function upgradeStat(statName){
    if (!myId || !players[myId]) return;
    socket.emit('upgradeStat', statName);
}

// ------------------------- Send Movement to Server ------------------------- \\
function updateMovement() {
    let dx = 0, dy = 0;
    
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;

    if (dx !== 0 || dy !== 0) {
        // console.log("Emitting move:", dx, dy);
        socket.emit("move", { dx, dy });
    }
    
    setTimeout(updateMovement, 1000 / 60); // 60 FPS movement update
}


  
updateMovement();

// ------------------------- Recieve Data from Server ------------------------- \\
socket.on("state", (data) => {
    bullets = data.bullets || []; // Sync Bullets
    npcs = data.npcs || {}; // Sync Npcs
    drops = data.drops || {};

    // If player client isn't spawned and name screen is hidden, show name screen
    if(!data.players[socket.id].spawned && document.getElementById("enterNameScreen").classList.contains("hidden")){ 
        document.getElementById("enterNameScreen").classList.remove("hidden"); // Show Name Screen
        document.getElementById("gameScreen").classList.add("hidden");  // Hide Game Screen
        document.getElementById("status-bar-container").classList.add("hidden");  // Hide Health bar
        document.getElementById("stat-panel").classList.add("hidden");  // Hide Upgrade Tab
        document.getElementById("xp-bar-container").classList.add("hidden");  // Hide Xp bar
        document.getElementById("armor-bar-container").classList.add("hidden");  // Hide Armor bar
        document.getElementById("class-panel").classList.add("hidden"); // Hide Select Class Panel
    }

    for (const id in data.players) {
        if (!data.players[id].spawned) continue;
        if (!players[id]) {
            players[id] = { 
                x: data.players[id].x, 
                y: data.players[id].y, 
                hp: data.players[id].hp,
                armor: data.players[id].armor,
                xp: data.players[id].xp,
                level: data.players[id].level,
                skillPoints: data.players[id].skillPoints,
                healthRegen: data.players[id].healthRegen,
                bulletDamage: data.players[id].bulletDamage,
                movementSpeed: data.players[id].movementSpeed,
                maxArmor: data.players[id].maxArmor,
                name: data.players[id].name,
                class: data.players[id].class, // shows weapon class
                cannonX: data.players[id].cannonX, // shows cannon direction
                cannonY: data.players[id].cannonY,
                canvasWidth: data.players[id].canvasWidth,
                canvasHeight: data.players[id].canvasHeight
            };
        }
        
        // Apply lerping for smooth movement
        players[id].x += (data.players[id].x - players[id].x) * lerpFactor;
        players[id].y += (data.players[id].y - players[id].y) * lerpFactor;

        // Update player data
        players[id].name = data.players[id].name;
        players[id].class = data.players[id].class;
        players[id].cannonX = data.players[id].cannonX;
        players[id].cannonY = data.players[id].cannonY;
        players[id].hp = data.players[id].hp;
        players[id].armor = data.players[id].armor;

        // // Player Stats
        players[id].xp = data.players[id].xp;
        players[id].level = data.players[id].level;

        players[id].skillPoints = data.players[id].skillPoints;
        players[id].healthRegen = data.players[id].healthRegen;
        players[id].bulletDamage = data.players[id].bulletDamage;
        players[id].movementSpeed = data.players[id].movementSpeed;
        players[id].maxArmor = data.players[id].maxArmor;
        
        // // Screen Canvas
        players[id].canvasWidth = data.players[id].canvasWidth;
        players[id].canvasHeight = data.players[id].canvasHeight;
    }
    
    // Remove players that are no longer in the data
    for (const id in players) {
        if (!data.players[id] || !data.players[id].spawned) {
            delete players[id]; // Delete player if not in data.players
        }
    }

    if (myId && players[myId]) {
        updateHealthArmorBar();
        updateXPBar();

        // Skill Points Text
        const skillPointsElement = document.querySelector('.skill-points');
        skillPointsElement.textContent = `Available Skill Points: ${players[myId].skillPoints}`;
        if (players[myId].skillPoints > 0){
            skillPointsElement.style.color = 'green';
        } else {
            skillPointsElement.style.color = 'grey'; 
        }

        setStatSegments('healthRegen', players[myId].healthRegen);
        setStatSegments('maxArmor', players[myId].maxArmor);
        setStatSegments('bulletDamage', players[myId].bulletDamage);
        setStatSegments('movementSpeed', players[myId].movementSpeed);

        // Class Selector Pop Up
        if (players[myId].level === 10 && players[myId].class === "pistol" && selectClassIgnore == 0){
            document.getElementById("class-panel").classList.remove("hidden");
        }
        else if (players[myId].level === 15 && players[myId].class === "pistol" && selectClassIgnore == 1){
            document.getElementById("class-panel").classList.remove("hidden");
        }
        else if (players[myId].level === 20 && players[myId].class === "pistol" && selectClassIgnore == 2){
            document.getElementById("class-panel").classList.remove("hidden");
        }
        else if (players[myId].level === 25 && players[myId].class === "pistol" && selectClassIgnore == 3){
            document.getElementById("class-panel").classList.remove("hidden");
        }
        else if (players[myId].level === 30 && players[myId].class === "pistol" && selectClassIgnore == 4){
            document.getElementById("class-panel").classList.remove("hidden");
        }
        if (players[myId].class != "pistol"){
            document.getElementById("class-panel").classList.add("hidden");
        }
    }
});

// ------------------------- Render Game ------------------------- \\

const backgroundImage = new Image()
//backgroundImage.src = 'https://img.freepik.com/premium-photo/grid-lines-background-with-white-background-white-grid-background_207225-3315.jpg';
backgroundImage.src = "Resources/background3.png"

const playerImage = new Image();
playerImage.src = 'Resources/blueShip.png';

const enemyImage = new Image();
enemyImage.src = 'Resources/redShip.png';

const laserImage = new Image();
laserImage.src = 'Resources/laser.png';

const asteroidYellow = new Image();
asteroidYellow.src = "Resources/asteroid_yellow.png";

const asteroidPurple = new Image();
asteroidPurple.src = "Resources/asteroid_purple.png";

const asteroidPink = new Image();
asteroidPink.src = "Resources/asteroid_pink.png";

const medkitImage = new Image();
medkitImage.src = "Resources/medKit.png";

const armorImage = new Image();
armorImage.src = "Resources/shield.png";

function drawGame() {
    context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    context.save(); // Save canvas state
    context.scale(zoom, zoom); // Apply zoom

    const currentPlayer = players[myId];
    if (currentPlayer) {
        // Shift the canvas to center the player
        const offsetX = canvas.width / (2 * zoom) - currentPlayer.x;
        const offsetY = canvas.height / (2 * zoom) - currentPlayer.y;
        context.translate(offsetX, offsetY);

        // Draw the background at 0,0 with full map size
        context.drawImage(backgroundImage, 0, 0, 3000, 3000);
    }

    // Draw all players
    for (const id in players) {
        const player = players[id];
        context.fillStyle = id === myId ? "blue" : "red"; // Color current player differently
        

        //if (playerImage.complete) {
            const spriteWidth = 40;
            const spriteHeight = 40;
            //context.drawImage(playerImage, player.x - spriteWidth / 2, player.y - spriteHeight / 2, spriteWidth, spriteHeight);
        //}


        // Draw player as a circle
        // context.beginPath();
        // context.arc(player.x, player.y, 10, 0, Math.PI * 2); // Draw player as a circle
        // context.fill();

        // Draw player name/class above the circle
        context.fillStyle = "black";
        context.font = "12px Arial";
        context.fillText(player.name || "?", player.x - 15, player.y - 50);
        context.fillText(player.class || "?", player.x - 15, player.y - 35);

        // Draw healthbar above each player
        const barWidth = 40;
        const barHeight = 6;
        const hpPercent = Math.max(player.hp / 100, 0);
        const barX = player.x - barWidth / 2;
        const barY = player.y - 30;

        // Healthbar outerbox
        context.fillStyle = "gray";
        context.fillRect(barX, barY, barWidth, barHeight);
        // Healthbar innerbox (colored)
        context.fillStyle = hpPercent > 0.66 ? "green" : hpPercent > 0.33 ? "orange" : "red";
        context.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        //Draw rotating cannon for all players
        let remoteMouseWorldX, remoteMouseWorldY, dx, dy;
        if (id == myId){ // Get mouse data from client for client for more smoothness
            mouseWorldX = mouseScreenX - canvas.width / (2 * zoom) + player.x;
            mouseWorldY = mouseScreenY - canvas.height / (2 * zoom) + player.y;
            dx = mouseWorldX - player.x;
            dy = mouseWorldY - player.y;
        } else{
            const remoteCanvasWidth = player.canvasWidth;
            const remoteCanvasHeight = player.canvasHeight;

            remoteMouseWorldX = player.cannonX - remoteCanvasWidth / (2 * zoom) + player.x;
            remoteMouseWorldY = player.cannonY - remoteCanvasHeight / (2 * zoom) + player.y;
            dx = remoteMouseWorldX - player.x;
            dy = remoteMouseWorldY - player.y;
        }

        const angle = Math.atan2(dy, dx);

        if (id == myId) {
            
            context.save();
            context.translate(player.x, player.y);
            context.rotate(angle + Math.PI / 2); // same angle used for cannon
            context.drawImage(playerImage, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
            context.restore();
        }else if (id!=myId){
            context.save();
            context.translate(player.x, player.y);
            context.rotate(angle + Math.PI / 2); // same angle used for cannon
            context.drawImage(enemyImage, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
            context.restore();
        }

        // const cannonLength = 20;
        // const cannonWidth = 6;

        // context.save();
        // context.translate(player.x, player.y); // Move origin to player
        // context.rotate(angle); // Rotate towards mouse
        // context.fillStyle = "gray";
        // context.fillRect(0, -cannonWidth / 2, cannonLength, cannonWidth); // Draw cannon
        // context.restore();
    }

    // Draw all bullets
    bullets.forEach((b) => {
        const laserWidth = 20;
        const laserHeight = 8;
    
        const angle = Math.atan2(b.dy, b.dx);
    
        context.save();
        context.translate(b.x, b.y);
        context.rotate(angle);
        context.drawImage(laserImage, -laserWidth / 2, -laserHeight / 2, laserWidth, laserHeight);
        context.restore();
    });

    //Draw all npcs
    // for (const id in npcs){
    //     const npc = npcs[id];
    //     const size = npc.color === "yellow" ? 10 : npc.color === "purple" ? 20 : npc.color === "pink" ? 30 : 10;
    //     const maxhp = npc.color === "yellow" ? 100 : npc.color === "purple" ? 250 : npc.color === "pink" ? 600 : 100;

    //     // Draw npc as square
    //     context.fillStyle = npc.color;
    //     context.fillRect(npc.x - size, npc.y - size, size * 2, size * 2);

    for (const id in npcs) {
        const npc = npcs[id];
        
        // Determine size and max HP
        const size = npc.color === "yellow" ? 20 : npc.color === "purple" ? 40 : npc.color === "pink" ? 60 : 10;
        const maxhp = npc.color === "yellow" ? 100 : npc.color === "purple" ? 250 : npc.color === "pink" ? 600 : 100;
    
        
        npc.rotation = 0;
        

        // Choose image
        let asteroidImage;
        if (npc.color === "yellow") asteroidImage = asteroidYellow;
        else if (npc.color === "purple") asteroidImage = asteroidPurple;
        else if (npc.color === "pink") asteroidImage = asteroidPink;
    
        // Draw asteroid image centered at NPC position
        if (asteroidImage && asteroidImage.complete) {
            const spriteSize = size * 2;
            context.drawImage(asteroidImage, npc.x - size, npc.y - size, spriteSize, spriteSize);
        }

        // Draw npc hp bar
        const barWidth = 60;
        const barHeight = 6;
        const hpPercent = Math.max(npc.hp / maxhp, 0);
        const barX = npc.x - barWidth / 2;
        const barY = npc.y - (size + 10);

        // -- Healthbar outerbox
        context.fillStyle = "gray";
        context.fillRect(barX, barY, barWidth, barHeight);
        // -- Healthbar innerbox (colored)
        context.fillStyle = hpPercent > 0.66 ? "green" : hpPercent > 0.33 ? "orange" : "red";
        context.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }

    // Draw Drops
    for (const id in drops){
        const drop = drops[id];

        if (drop.type === "medkit") {
            context.drawImage(medkitImage, drop.x - 10, drop.y - 10, 20, 20);
        }else if(drop.type === "armor"){
            context.drawImage(armorImage, drop.x - 10, drop.y - 10, 20, 20);
        }

        // context.fillStyle = drop.type === "medkit" ? "red" : "blue";
        // context.fillRect(drop.x - 5, drop.y - 5, 10, 10);
    }
  

    context.restore(); // Restore canvas state


    requestAnimationFrame(drawGame); // Continue rendering on next frame
}

drawGame();
