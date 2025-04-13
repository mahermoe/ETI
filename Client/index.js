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
            document.getElementById("status-bar-container").classList.remove("hidden");  // Show Healthbar
            document.getElementById("xp-bar-container").classList.remove("hidden");  // Show Xp bar
        }, 1000);
    });
}

window.submitName = submitName; // Make the function globally accessible

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
let mouseDown = false;
let mouseWorldX = 0; // Calculated each frame based on player position and mouse screen position
let mouseWorldY = 0;
let mouseScreenX = 0; // Raw position of mouse on screen
let mouseScreenY = 0;
const lerpFactor = 0.1; // Controls smooth movement
let zoom = 2;
let keys = {
    w: false,
    a: false,
    s: false,
    d: false,
};

//  Loot Boxes
const lootBoxes = [
    { x: 200, y: 200, width: 30, height: 30, contents: ["Shield", "XP"], collected: false },
    { x: 130, y: 130, width: 30, height: 30, contents: ["Med Kit"], collected: false },
    { x: 150, y: 150, width: 30, height: 30, contents: ["Ammo", "XP"], collected: false },
    { x: 100, y: 100, width: 30, height: 30, contents: ["Test"], collected: false },

];

function isPlayerNearLootBox(player, box) {
    const dx = player.x - (box.x + box.width / 2);
    const dy = player.y - (box.y + box.height / 2);
    return Math.sqrt(dx * dx + dy * dy) < 50;
}

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

// ------------------- Capture key events ------------------- \\
document.addEventListener("keydown", (event) => {
    if (keys[event.key] !== undefined) {
        keys[event.key] = true;
    }

    // Loot Box Interaction
    if ((event.key === 'e' || event.key === 'E') && myId && players[myId]) {
        const player = players[myId];
        lootBoxes.forEach(box => {
            if (!box.collected && isPlayerNearLootBox(player, box)) {
                box.collected = true;
                addToInventory(box.contents);
                showSuccess(`You collected: ${box.contents.join(", ")}`);
                console.log(`Collected loot: ${box.contents.join(", ")}`);
            }
        });
    }
});
  
document.addEventListener("keyup", (event) => {
    if (keys[event.key] !== undefined) {
        keys[event.key] = false;
    }
});

// ------------------------- Update UI ------------------------- \\
function updateHealthBar() {
    const healthBar = document.getElementById("health-bar");
    const healthText = document.getElementById("health-text")
  
    let health = players[myId].hp; // Get's Players Health
    healthBar.style.width = `${health}%`;
  
    if (health > 66) {
      healthBar.style.backgroundColor = "#4caf50"; // green
    } else if (health > 33) {
      healthBar.style.backgroundColor = "#ff9800"; // orange
    } else {
      healthBar.style.backgroundColor = "#f44336"; // red
    }

    healthText.textContent = `${Math.round((players[myId].hp * 10)) / 10}/100 HP`
}

function updateXPBar() {
    const xpBar = document.getElementById('xp-bar');
    const xpText = document.getElementById('xp-text');
    const xpMax = players[myId].level * 100;
  
    const percentage = Math.min(100, (players[myId].xp / xpMax) * 100);
    xpBar.style.width = `${percentage}%`;
    xpText.textContent = `Level ${players[myId].level}: ${players[myId].xp}/${(xpMax)} XP`;
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

    // If player client isn't spawned and name screen is hidden, show name screen
    if(!data.players[socket.id].spawned && document.getElementById("enterNameScreen").classList.contains("hidden")){ 
        document.getElementById("enterNameScreen").classList.remove("hidden"); // Show Name Screen
        document.getElementById("gameScreen").classList.add("hidden");  // Hide Game Screen
        document.getElementById("status-bar-container").classList.add("hidden");  // Hide Healthbar
        document.getElementById("xp-bar-container").classList.add("hidden");  // Hide Xp bar
    }

    for (const id in data.players) {
        if (!data.players[id].spawned) continue;
        if (!players[id]) {
            players[id] = { 
                x: data.players[id].x, 
                y: data.players[id].y, 
                hp: data.players[id].hp,
                xp: data.players[id].xp,
                level: data.players[id].level,
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
        players[id].cannonX = data.players[id].cannonX;
        players[id].cannonY = data.players[id].cannonY;
        players[id].hp = data.players[id].hp;
        players[id].xp = data.players[id].xp;
        players[id].level = data.players[id].level;
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
        updateHealthBar();
        updateXPBar();
    }
});

// ------------------------- Render Game ------------------------- \\

const backgroundImage = new Image()
backgroundImage.src = 'https://img.freepik.com/premium-photo/grid-lines-background-with-white-background-white-grid-background_207225-3315.jpg';

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
        
        // Draw player as a circle
        context.beginPath();
        context.arc(player.x, player.y, 10, 0, Math.PI * 2); // Draw player as a circle
        context.fill();

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

        // Draw rotating cannon for all players
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

        const cannonLength = 20;
        const cannonWidth = 6;

        context.save();
        context.translate(player.x, player.y); // Move origin to player
        context.rotate(angle); // Rotate towards mouse
        context.fillStyle = "gray";
        context.fillRect(0, -cannonWidth / 2, cannonLength, cannonWidth); // Draw cannon
        context.restore();
    }
    
    // Draw loot boxes
    lootBoxes.forEach(box => {
        if (!box.collected) {
            context.fillStyle = "gold";
            context.fillRect(box.x, box.y, box.width, box.height);
            context.fillStyle = "black";
            context.font = "10px Arial";
            context.fillText("Loot", box.x + 2, box.y - 5);
        }
    });

    // Draw all bullets
    bullets.forEach((b) => {
        context.fillStyle = "black";
        context.beginPath();
        context.arc(b.x, b.y, 4, 0, Math.PI * 2); // small circle, do players[i].location for better aligning
        context.fill();
    });

    // Draw all npcs
    for (const id in npcs){
        const npc = npcs[id];

        // Draw npc as square
        context.fillStyle = npc.color;
        context.fillRect(npc.x - 10, npc.y - 10, 20, 20);

        // Draw npc hp bar
        const barWidth = 40;
        const barHeight = 6;
        const hpPercent = Math.max(npc.hp / 100, 0);
        const barX = npc.x - barWidth / 2;
        const barY = npc.y - 20;

        // -- Healthbar outerbox
        context.fillStyle = "gray";
        context.fillRect(barX, barY, barWidth, barHeight);
        // -- Healthbar innerbox (colored)
        context.fillStyle = hpPercent > 0.66 ? "green" : hpPercent > 0.33 ? "orange" : "red";
        context.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }
  

    context.restore(); // Restore canvas state


    requestAnimationFrame(drawGame); // Continue rendering on next frame
}

drawGame();
