// ─── Page d'accueil — gestion du formulaire de démarrage ─────────────────────

// Réinitialise le localStorage à chaque retour sur la page d'accueil.
// Cela garantit qu'une nouvelle session repart d'un état propre, même si l'utilisateur revient via le bouton "Précédent" du navigateur.
function clearSession() {
    localStorage.clear();
}

window.addEventListener("load",     clearSession);
window.addEventListener("pageshow", clearSession);

// ─── Initialisation du formulaire ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("startBtn");
    const usernameInput = document.getElementById("username");

    if (!startBtn || !usernameInput) return;

    // Pré-remplir le champ si un nom a déjà été utilisé dans la session
    const savedName = sessionStorage.getItem("username");
    if (savedName) usernameInput.value = savedName;

    // ─── Démarrage de la session ───────────────────────────────────────────────
    startBtn.addEventListener("click", () => {
        const username = usernameInput.value.trim();

        if (!username) {
            alert("Veuillez entrer un nom d'utilisateur.");
            return;
        }

        // Persistance du nom : localStorage pour les pages de session,
        // sessionStorage pour la page de résultats (survit aux redirections).
        localStorage.setItem("username", username);
        sessionStorage.setItem("username", username);

        // Initialisation du compteur d'ordre des exercices
        localStorage.setItem("exerciseOrder", "0");

        // Lancement de la session à la partie 1
        window.location.href = "code/session.html?part=1";
    });
});
