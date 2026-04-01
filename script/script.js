// Vider localStorage à chaque chargement 
function clearLocalStorage() {
  localStorage.clear();
  const usernameInput = document.getElementById("username");
  if (usernameInput) usernameInput.value = "";
}

window.addEventListener("load", clearLocalStorage);
window.addEventListener("pageshow", clearLocalStorage);

// Bouton
document.addEventListener("DOMContentLoaded", function () {
  const startBtn = document.getElementById("startBtn");
  if (!startBtn) return;

  startBtn.addEventListener("click", function () {
    const username = document.getElementById("username").value.trim();

    if (username === "") {
      alert("Veuillez entrer un nom d'utilisateur");
      return;
    }

    // Stockage pour la session
    sessionStorage.setItem("username", username);
    sessionStorage.setItem("exerciseOrder", "0");

    // Redirection vers la page suivante
    window.location.href = "code/part1.html";
  });
});
