import { exportSessionToDexie } from "./db.js";

async function loadResults() {

    const stats = JSON.parse(sessionStorage.getItem("sessionStats") || "[]")
        .sort((a, b) => a.order - b.order);

    const totalTime = parseInt(sessionStorage.getItem("sessionTotalTime") || "0");
    const username = sessionStorage.getItem("username") || localStorage.getItem("username");
    const date      = new Date();

    if (stats.length === 0) {
        console.warn("Aucune donnée disponible");
        return;
    }

    // ── Calculs ──
    const avgWpm   = Math.round(stats.reduce((s, e) => s + e.wpm, 0) / stats.length);
    const avgError = Math.round(stats.reduce((s, e) => s + e.errorRate, 0) / stats.length);
    const avgReact = Math.round(stats.reduce((s, e) => s + e.avgReactionTime, 0) / stats.length);

    const totalMin = Math.floor(totalTime / 60);
    const totalSec = totalTime % 60;
    const timeStr  = String(totalMin).padStart(2,'0') + ":" + String(totalSec).padStart(2,'0');

    const dateStr = date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // ── HEADER ──
    document.getElementById("username").textContent = username;
    document.getElementById("time").textContent = timeStr;
    document.getElementById("date").textContent = dateStr;

    // ── KPI ──
    document.getElementById("avgWpm").textContent = avgWpm;
    document.getElementById("avgError").textContent = avgError;
    document.getElementById("avgReact").textContent = avgReact;

    // ── CONFIG ──
    const partLabel = {
        1: 'Partie 1 — Lettres',
        2: 'Partie 2 — Mots',
        3: 'Partie 3 — Phrases'
    };

    const partClass = {
        1: 'p1',
        2: 'p2',
        3: 'p3'
    };

    function errorClass(rate) {
        if (rate <= 5) return 'error-good';
        if (rate <= 15) return 'error-warn';
        return 'error-bad';
    }

    
    const grid = document.getElementById("exercisesGrid");
    const template = document.getElementById("exerciseTemplate");

    stats.forEach(e => {
        const clone = template.content.cloneNode(true);

        clone.querySelector(".exercise-part").textContent =
            partLabel[e.part];

        clone.querySelector(".name").textContent =
            e.exerciseName;

        const badge = clone.querySelector(".part-badge");
        badge.textContent = "P" + e.part;
        badge.classList.add(partClass[e.part]);

        clone.querySelector(".wpm").textContent = e.wpm;

        const errorEl = clone.querySelector(".error");
        errorEl.textContent = e.errorRate + "%";
        errorEl.classList.add(errorClass(e.errorRate));

        clone.querySelector(".react").textContent =
            e.avgReactionTime + " ms";

        grid.appendChild(clone);
    });

    // ── GRAPHIQUES ──
    const labels    = stats.map(e => e.exerciseName);
    const wpmData   = stats.map(e => e.wpm);
    const errorData = stats.map(e => e.errorRate);
    const reactData = stats.map(e => e.avgReactionTime);

    function makeChart(canvasId, data, color) {
        const ctx = document.getElementById(canvasId);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data,
                    borderColor: color,
                    backgroundColor: color.replace('1)', '0.1)'),
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }

    makeChart('chartWpm',   wpmData,   'rgba(124,106,247,1)');
    makeChart('chartError', errorData, 'rgba(247,106,138,1)');
    makeChart('chartReact', reactData, 'rgba(106,247,200,1)');

    // ── EXPORT ──
    document.getElementById('btnExport').addEventListener('click', async () => {
        const btn = document.getElementById('btnExport');

        btn.disabled = true;
        btn.textContent = 'Exportation…';

        try {
            await exportSessionToDexie({
                username,
                date,
                totalTime,
                stats
            });

            btn.textContent = 'Exporté';
        } catch (err) {
            console.error(err);
            btn.textContent = 'Erreur';
            btn.disabled = false;
        }
    });
}

loadResults();