//Show custom error popup
function showError(message) {
  const box = document.getElementById("errorBox");
  box.textContent = message;
  box.classList.remove("hidden");

  //Hide it after 3 seconds
  setTimeout(() => {
    box.classList.add("hidden");
  }, 3000);
}
//Show custom success popup
function showSuccess(message) {
  const box = document.getElementById("successBox");
  box.textContent = message;
  box.classList.remove("hidden");

  setTimeout(() => {
    box.classList.add("hidden");
  }, 3000);
}


//submit player name to backend
function submitName() {
  const playerName = document.getElementById("player-name").value.trim();
 
  if (playerName === ""){
    showError("Please enter a name.");
    return;
  }

  
  fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ player_name: playerName })
  })
  .then(res => res.text())
  .then(data => {
    console.log("Server says:", data);
    if (data.trim() === "Success") {
      //Redirect after short delay or immediately
      window.location.href = "index.html";
    } else {
      showError("Server error: " + data);
    }
  })
  .catch(error => {
    console.error("Fetch error:", error);
    showError("An error occurred. Please try again.");
  })
  
  
  
  

  .then(response => response.text())
  .then(data => {
    console.log(data); // Log the response from the server

    if(data.trim() === "Success"){
      localStorage.setItem("playerName", playerName); //Store the name in local storage
      showSuccess('Welcome ' + playerName + ' Your Story Begins.');
      setTimeout(() => {
        window.location.href = "index.html";
      }, 3500);
      
    } else {
      showError(data); 
    }
  })
  .catch(error => {
    console.error("Fetching Error(caught):", error);
    showError("An error occurred. Please try again.");
  });
}

//Hide error box if user edits the input
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("player-name").addEventListener("input", () => {
    document.getElementById("errorBox").classList.add("hidden");
  });
});