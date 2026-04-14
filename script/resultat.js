// ─── Page de résultats ────────────────────────────────────────────────────────

// ─── Constantes ───────────────────────────────────────────────────────────────

// Labels et classes CSS associés à chaque numéro de partie
const PART_LABEL = {
    1: "Partie 1 — Lettres",
    2: "Partie 2 — Mots",
    3: "Partie 3 — Phrases"
};

const PART_CLASS = { 1: "p1", 2: "p2", 3: "p3" };

// Couleurs des graphiques (doivent correspondre aux variables CSS --accent*)
const CHART_COLORS = {
    wpm:   "rgba(124, 106, 247, 1)",
    error: "rgba(247, 106, 138, 1)",
    react: "rgba(59,  130, 246, 1)"
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

// Retourne la classe CSS à appliquer selon le taux d'erreur.
function errorClass(rate) {
    if (rate <= 5)  return "error-good";
    if (rate <= 15) return "error-warn";
    return "error-bad";
}

// Calcule la moyenne entière d'un tableau de nombres.
function avg(arr) {
    return Math.round(arr.reduce((sum, v) => sum + v, 0) / arr.length);
}

// Formate un nombre de secondes en "MM:SS".
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// Crée un graphique en ligne Chart.js sur le canvas donné.
function makeChart(canvasId, labels, data, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                data,
                borderColor:     color,
                backgroundColor: color.replace("1)", "0.1)"),
                tension:         0.3,
                fill:            true,
                pointRadius:     4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

// ─── Chargement principal ─────────────────────────────────────────────────────

function loadResults() {
    // Récupération et tri des statistiques par ordre de passage
    const stats = JSON.parse(sessionStorage.getItem("sessionStats") || "[]")
        .sort((a, b) => a.order - b.order);

    if (stats.length === 0) {
        console.warn("Aucune donnée de session disponible.");
        return;
    }

    // Données de contexte
    const totalTime = parseInt(sessionStorage.getItem("sessionTotalTime") || "0");
    // Priorité : sessionStorage (plus fiable en fin de session) puis localStorage
    const username  = sessionStorage.getItem("username") || localStorage.getItem("username") || "Invité";
    const date      = new Date();

    // ── Calcul des moyennes globales ──────────────────────────────────────────

    const avgWpm   = avg(stats.map(e => e.wpm));
    const avgError = avg(stats.map(e => e.errorRate));
    const avgReact = avg(stats.map(e => e.avgReactionTime));

    // ── Mise à jour du header ─────────────────────────────────────────────────

    document.getElementById("username").textContent = username;
    document.getElementById("time").textContent     = formatTime(totalTime);
    document.getElementById("date").textContent     = date.toLocaleDateString("fr-FR", {
        year: "numeric", month: "long", day: "numeric"
    });

    // ── Mise à jour des KPI ───────────────────────────────────────────────────

    document.getElementById("avgWpm").textContent   = avgWpm;
    document.getElementById("avgError").textContent = avgError;
    document.getElementById("avgReact").textContent = avgReact;

    // ── Tableau des exercices ─────────────────────────────────────────────────

    const grid     = document.getElementById("exercisesGrid");
    const template = document.getElementById("exerciseTemplate");

    stats.forEach(e => {
        const clone = template.content.cloneNode(true);

        clone.querySelector(".exercise-part").textContent = PART_LABEL[e.part];
        clone.querySelector(".name").textContent          = e.exerciseName;

        const badge = clone.querySelector(".part-badge");
        badge.textContent = "P" + e.part;
        badge.classList.add(PART_CLASS[e.part]);

        clone.querySelector(".wpm").textContent = e.wpm;

        const errorEl = clone.querySelector(".error");
        errorEl.textContent = e.errorRate + "%";
        errorEl.classList.add(errorClass(e.errorRate));

        clone.querySelector(".react").textContent = e.avgReactionTime + " ms";

        grid.appendChild(clone);
    });

    // ── Graphiques ────────────────────────────────────────────────────────────

    const labels = stats.map(e => e.exerciseName);

    makeChart("chartWpm",   labels, stats.map(e => e.wpm),             CHART_COLORS.wpm);
    makeChart("chartError", labels, stats.map(e => e.errorRate),        CHART_COLORS.error);
    makeChart("chartReact", labels, stats.map(e => e.avgReactionTime),  CHART_COLORS.react);

    // ── Export CSV ────────────────────────────────────────────────────────────

    document.getElementById("btnExport").addEventListener("click", () => {
        const btn = document.getElementById("btnExport");

        const headers = ["Partie", "Exercice", "WPM", "Taux erreur (%)", "Temps réaction (ms)"];

        const rows = stats.map(e => [
            `Partie ${e.part}`,
            e.exerciseName,
            e.wpm,
            e.errorRate,
            e.avgReactionTime
        ]);

        // Ligne de résumé global en bas du fichier
        rows.push([]);
        rows.push(["RÉSUMÉ", "", avgWpm, avgError, avgReact]);

        // Encodage CSV avec BOM UTF-8 pour compatibilité Excel
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `k3_session_${username}_${date.toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        // Feedback visuel temporaire sur le bouton
        btn.textContent = "Téléchargé";
        setTimeout(() => { btn.textContent = "Exporter les résultats"; }, 2000);
    });
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

loadResults();
