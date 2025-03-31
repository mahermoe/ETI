import socket from "./socket.js";

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
        socket.emit("move", { dx, dy });
    }
    
    setTimeout(updateMovement, 1000 / 60); // 60 FPS movement update
}
updateMovement();

// Smoothly update player positions
socket.on("state", (data) => {
    for (const id in data.players) {
        if (!players[id]) {
            players[id] = { 
                x: data.players[id].x, 
                y: data.players[id].y 
            };
        }
        
        // Apply lerping for smooth movement
        players[id].x += (data.players[id].x - players[id].x) * lerpFactor;
        players[id].y += (data.players[id].y - players[id].y) * lerpFactor;
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

    // Draw all players
    for (const id in players) {
        const player = players[id];
        context.fillStyle = id === socket.id ? "blue" : "red"; // Color current player differently
        context.beginPath();
        context.arc(player.x, player.y, 10, 0, Math.PI * 2); // Draw player as a circle
        context.fill();
    }

    context.restore(); // Restore canvas state

    requestAnimationFrame(drawGame); // Continue rendering on next frame
}

drawGame();
