// Vider localStorage à chaque chargement 
function clearLocalStorage() {
  localStorage.clear();
}

window.addEventListener("load", clearLocalStorage);
window.addEventListener("pageshow", clearLocalStorage);

// Bouton
document.addEventListener("DOMContentLoaded", function () {
  const startBtn = document.getElementById("startBtn");
  const usernameInput = document.getElementById("username");
  if (!startBtn) return;

  // Pré-remplir le nom
  const savedName = sessionStorage.getItem("username");
  if (savedName && usernameInput) usernameInput.value = savedName;

  startBtn.addEventListener("click", function () {
    const username = usernameInput.value.trim();

    if (username === "") {
      alert("Veuillez entrer un nom d'utilisateur");
      return;
    }

    // Stocker dans les deux 
    localStorage.setItem("username", username);
    sessionStorage.setItem("username", username);
    localStorage.setItem("exerciseOrder", "0");

    window.location.href = "code/session.html";
  });
});
