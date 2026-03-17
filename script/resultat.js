import Dexie from "https://unpkg.com/dexie@3.2.4/dist/dexie.mjs";

const db = new Dexie("K3TypingDB");
db.version(1).stores({
    sessions: "++id, username, date",
    exerciseStats: "++id, sessionId, part, exerciseName"
});

async function loadResults() {

    const sessionId = parseInt(sessionStorage.getItem("sessionId"));
    const content = document.getElementById("content");

    if (!sessionId) {
        content.innerHTML = `<div class="loading">Aucune session trouvée.</div>`;
        return;
    }

    const session = await db.sessions.get(sessionId);
    const stats = (await db.exerciseStats
        .where("sessionId").equals(sessionId).toArray())
        .sort((a, b) => a.order !== undefined && b.order !== undefined ? a.order - b.order : a.id - b.id);

    if (!session || stats.length === 0) {
        content.innerHTML = `<div class="loading">Aucune donnée disponible.</div>`;
        return;
    }

    // ── Calcul globaux ──
    const avgWpm = Math.round(stats.reduce((s, e) => s + e.wpm, 0) / stats.length);
    const avgError = Math.round(stats.reduce((s, e) => s + e.errorRate, 0) / stats.length);
    const avgReact = Math.round(stats.reduce((s, e) => s + e.avgReactionTime, 0) / stats.length);

    const totalMin = Math.floor(session.totalTime / 60);
    const totalSec = session.totalTime % 60;
    const timeStr = String(totalMin).padStart(2,'0') + ":" + String(totalSec).padStart(2,'0');

    const date = new Date(session.date);
    const dateStr = date.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });

    function errorClass(rate) {
        if (rate <= 5) return 'error-good';
        if (rate <= 15) return 'error-warn';
        return 'error-bad';
    }

    const labels = stats.map(e => e.exerciseName);
    const wpmData = stats.map(e => e.wpm);
    const errorData = stats.map(e => e.errorRate);
    const reactData = stats.map(e => e.avgReactionTime);

    const partLabel = { 1: 'Partie 1 — Lettres', 2: 'Partie 2 — Mots', 3: 'Partie 3 — Phrases' };
    const partClass = { 1: 'p1', 2: 'p2', 3: 'p3' };

    const rows = stats.map(e => `
        <div class="exercise-row">
            <div class="exercise-info">
                <div class="exercise-part">${partLabel[e.part] || 'Partie ' + e.part}</div>
                <div class="exercise-name">${e.exerciseName}
                    <span class="part-badge ${partClass[e.part] || ''}">P${e.part}</span>
                </div>
            </div>
            <div class="ex-metric">
                <div class="ex-metric-label">WPM</div>
                <div class="ex-metric-value wpm">${e.wpm}</div>
            </div>
            <div class="ex-metric">
                <div class="ex-metric-label">Erreurs</div>
                <div class="ex-metric-value ${errorClass(e.errorRate)}">${e.errorRate}%</div>
            </div>
            <div class="ex-metric">
                <div class="ex-metric-label">Réaction</div>
                <div class="ex-metric-value react">${e.avgReactionTime} ms</div>
            </div>
        </div>
    `).join('');

    content.innerHTML = `
        <div class="header">
            <div class="header-left">
                <h1>Session <span>terminée</span></h1>
                <div class="subtitle">Durée totale : ${timeStr}</div>
            </div>
            <div class="header-meta">
                <div class="username">${session.username}</div>
                <div class="date">${dateStr}</div>
            </div>
        </div>

        <div class="kpis">
            <div class="kpi-card wpm">
                <div class="kpi-label">Vitesse moyenne</div>
                <div class="kpi-value">${avgWpm}</div>
                <div class="kpi-unit">mots / minute</div>
            </div>
            <div class="kpi-card error">
                <div class="kpi-label">Taux d'erreur moyen</div>
                <div class="kpi-value">${avgError}</div>
                <div class="kpi-unit">% (Levenshtein)</div>
            </div>
            <div class="kpi-card reaction">
                <div class="kpi-label">Temps de réaction moyen</div>
                <div class="kpi-value">${avgReact}</div>
                <div class="kpi-unit">ms entre frappes</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Évolution par exercice</div>
            <div class="chart-wrapper">
                <canvas id="mainChart"></canvas>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Détail des exercices</div>
            <div class="exercises-grid">${rows}</div>
        </div>

        <button id="btnExport" class="btn-export">Exporter les résultats</button>
    `;

    // ── Export JSON ──
    document.getElementById('btnExport').addEventListener('click', () => {
        const exportData = {
            session: {
                id: session.id,
                username: session.username,
                date: session.date,
                totalTime: session.totalTime
            },
            exerciseStats: stats.map(e => ({
                part: e.part,
                exerciseName: e.exerciseName,
                wpm: e.wpm,
                errorRate: e.errorRate,
                avgReactionTime: e.avgReactionTime
            })),
            summary: { avgWpm, avgError, avgReact }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `k3_session_${session.username}_${new Date(session.date).toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'WPM', data: wpmData },
                { label: 'Erreur %', data: errorData },
                { label: 'Réaction ms', data: reactData, type: 'line' }
            ]
        }
    });
}

loadResults();