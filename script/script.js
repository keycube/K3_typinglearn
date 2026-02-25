const startBtn = document.getElementById("startBtn");
const usernameInput = document.getElementById("username");

// Nom utilisateur
window.onload = function() {
    const savedName = localStorage.getItem("username");
    if (savedName) {
        usernameInput.value = savedName;
    }
};

// Bouton de début de session
document.getElementById("startBtn").addEventListener("click", function() {
    const username = document.getElementById("username").value.trim();

    if (username === "") {
        alert("Veuillez entrer un nom d'utilisateur");
        return;
    }

    localStorage.setItem("username", username);
    window.location.href = "part1.html";
});
