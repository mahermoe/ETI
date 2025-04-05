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
        }, 1500);
    });
}

window.submitName = submitName; // Make the function globally accessible

//---- Game Logic ----\\

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

const players = {};
let bullets = []; // Array to hold bullet objects   
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

// ----------------Capture mouse events---------------- \\
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
    mouseScreenX = (event.clientX - rect.left) / zoom;
    mouseScreenY = (event.clientY - rect.top) / zoom;

    socket.emit("cannonmove", {
        cannonX: mouseScreenX,
        cannonY: mouseScreenY
    });
});

canvas.addEventListener("click", (event) => {
    if (!myId || !players[myId]) return;
  
    const player = players[myId];

    mouseWorldX = mouseScreenX - canvas.width / (2 * zoom) + player.x;
    mouseWorldY = mouseScreenY - canvas.height / (2 * zoom) + player.y;
  
    socket.emit("shoot", {
      mouseX: mouseWorldX,
      mouseY: mouseWorldY,
    });
    
});

function handleAutoFire() {
    if (!myId || !players[myId]) return;
  
    const player = players[myId];

    mouseWorldX = mouseScreenX - canvas.width / (2 * zoom) + player.x;
    mouseWorldY = mouseScreenY - canvas.height / (2 * zoom) + player.y;
  
    socket.emit("shoot", {
      mouseX: mouseWorldX,
      mouseY: mouseWorldY,
    });

    if (mouseDown){
        setTimeout(handleAutoFire, 100);
    }
}

// ----------------Capture key events---------------- \\
document.addEventListener("keydown", (event) => {
    if (keys[event.key] !== undefined) {
        keys[event.key] = true;
    }
});
  
document.addEventListener("keyup", (event) => {
    if (keys[event.key] !== undefined) {
        keys[event.key] = false;
    }
});

// Send movement updates to server
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

// Smoothly update player positions
socket.on("state", (data) => {
    bullets = data.bullets || []; // Sync Bullets
    for (const id in data.players) {
        if (!data.players[id].spawned) continue;
        if (!players[id]) {
            players[id] = { 
                x: data.players[id].x, 
                y: data.players[id].y, 
                name: data.players[id].name,
                class: data.players[id].class, // shows weapon class
                cannonX: data.players[id].cannonX, // shows cannon direction
                cannonY: data.players[id].cannonY
            };
        }
        
        // Apply lerping for smooth movement
        players[id].x += (data.players[id].x - players[id].x) * lerpFactor;
        players[id].y += (data.players[id].y - players[id].y) * lerpFactor;

        players[id].name = data.players[id].name; // Update player name
        players[id].cannonX = data.players[id].cannonX;
        players[id].cannonY = data.players[id].cannonY;
    }
    
    // Remove players that are no longer in the data
    for (const id in players) {
        if (!data.players[id] || !data.players[i].spawned) {
            delete players[id]; // Delete player if not in data.players
        }
    }
});

// Render game
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

        // Draw scrolling background grid
        const gridSize = 50;
        const startX = -offsetX % gridSize;
        const startY = -offsetY % gridSize;

        context.strokeStyle = "#ddd";
        for (let x = startX; x < canvas.width / zoom; x += gridSize) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, canvas.height / zoom);
            context.stroke();
        }

        for (let y = startY; y < canvas.height / zoom; y += gridSize) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(canvas.width / zoom, y);
            context.stroke();
        }
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
        context.fillText(player.name || "?", player.x - 15, player.y - 35);
        context.fillText(player.class || "?", player.x - 15, player.y - 20);

        // Draw rotating cannon for all players
        if (id == myId){ // Get mouse data from client for client for more smoothness
            mouseWorldX = mouseScreenX - canvas.width / (2 * zoom) + player.x;
            mouseWorldY = mouseScreenY - canvas.height / (2 * zoom) + player.y;
        } else{
            mouseWorldX = player.cannonX - canvas.width / (2 * zoom) + player.x;
            mouseWorldY = player.cannonY - canvas.height / (2 * zoom) + player.y;
        }

        const dx = mouseWorldX - player.x;
        const dy = mouseWorldY - player.y;
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

    // Draw all bullets
    bullets.forEach((b) => {
        context.fillStyle = "black";
        context.beginPath();
        context.arc(b.x, b.y, 4, 0, Math.PI * 2); // small circle, do players[i].location for better aligning
        context.fill();
    });
  

    context.restore(); // Restore canvas state


    requestAnimationFrame(drawGame); // Continue rendering on next frame
}

drawGame();
