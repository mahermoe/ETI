import socket from "./socket.js";


let myId = null; // Store the player's ID
let bullets = []; // Array to hold bullet objects   

socket.on("yourId", (id) => {
  myId = id; // Store the player's ID when received from the server
});

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

    socket.on("registerSuccess", () => {
        showSuccess(`Welcome ${playerName}, Your Story Begins.`);

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
const lerpFactor = 0.1; // Controls smooth movement
let zoom = 2;

let keys = {
    w: false,
    a: false,
    s: false,
    d: false,
};

// Capture key events
document.addEventListener("keydown", (event) => {
    if (keys[event.key] !== undefined) {
        keys[event.key] = true;
    }
});

canvas.addEventListener("click", (event) => {
    if (!myId || !players[myId]) return;
  
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / zoom;
    const mouseY = (event.clientY - rect.top) / zoom;
  
    const player = players[myId];
  
    socket.emit("shoot", {
      mouseX: mouseX - canvas.width / (2 * zoom) + player.x,
      mouseY: mouseY - canvas.height / (2 * zoom) + player.y,
    });
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
        console.log("Emitting move:", dx, dy);
        socket.emit("move", { dx, dy });
    }
    
    setTimeout(updateMovement, 1000 / 60); // 60 FPS movement update
}
updateMovement();

// Smoothly update player positions
socket.on("state", (data) => {
    bullets = data.bullets || []; //Sync Bullets
    for (const id in data.players) {
        if (!players[id]) {
            players[id] = { 
                x: data.players[id].x, 
                y: data.players[id].y, 
                name: data.players[id].name,
                
            };
        }
        
        // Apply lerping for smooth movement
        players[id].x += (data.players[id].x - players[id].x) * lerpFactor;
        players[id].y += (data.players[id].y - players[id].y) * lerpFactor;
        players[id].name = data.players[id].name; // Update player name
    }
    
    // Remove players that are no longer in the data
    for (const id in players) {
        if (!data.players[id]) {
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

        // Draw player name above the circle
        context.fillStyle = "black";
        context.font = "12px Arial";
        context.fillText(player.name || "?", player.x - 15, player.y - 15);
    
    }

    // Draw all bullets
    bullets.forEach((b) => {
    context.fillStyle = "black";
    context.beginPath();
    context.arc(b.x, b.y, 4, 0, Math.PI * 2); // small circle
    context.fill();
    });
  

    context.restore(); // Restore canvas state


    requestAnimationFrame(drawGame); // Continue rendering on next frame
}

drawGame();
