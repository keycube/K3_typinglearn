import { db, exportSessionToDexie } from "./db.js";

async function loadResults() {

    const content = document.getElementById("content");

    // Lire depuis sessionStorage
    const stats = JSON.parse(sessionStorage.getItem("sessionStats") || "[]")
        .sort((a, b) => a.order - b.order);
    const totalTime = parseInt(sessionStorage.getItem("sessionTotalTime") || "0");
    const username  = localStorage.getItem("username") || "Invité";
    const date      = new Date().toISOString();

    if (stats.length === 0) {
        content.innerHTML = `<div class="loading">Aucune donnée disponible.</div>`;
        return;
    }

    const avgWpm   = Math.round(stats.reduce((s, e) => s + e.wpm, 0) / stats.length);
    const avgError = Math.round(stats.reduce((s, e) => s + e.errorRate, 0) / stats.length);
    const avgReact = Math.round(stats.reduce((s, e) => s + e.avgReactionTime, 0) / stats.length);

    const totalMin = Math.floor(totalTime / 60);
    const totalSec = totalTime % 60;
    const timeStr  = String(totalMin).padStart(2,'0') + ":" + String(totalSec).padStart(2,'0');

    const dateStr = new Date(date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });

    function errorClass(rate) {
        if (rate <= 5)  return 'error-good';
        if (rate <= 15) return 'error-warn';
        return 'error-bad';
    }

    const labels    = stats.map(e => e.exerciseName);
    const wpmData   = stats.map(e => e.wpm);
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
                <div class="username">${username}</div>
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

        <div class="charts-grid">
            <div class="section">
                <div class="section-title">WPM par exercice</div>
                <div class="chart-wrapper"><canvas id="chartWpm"></canvas></div>
            </div>
            <div class="section">
                <div class="section-title">Taux d'erreur par exercice</div>
                <div class="chart-wrapper"><canvas id="chartError"></canvas></div>
            </div>
            <div class="section">
                <div class="section-title">Temps de réaction par exercice</div>
                <div class="chart-wrapper"><canvas id="chartReact"></canvas></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Détail des exercices</div>
            <div class="exercises-grid">${rows}</div>
        </div>

        <button id="btnExport" class="btn-export">Exporter les résultats</button>
    `;

    // ── Export vers Dexie au clic ──
    document.getElementById('btnExport').addEventListener('click', async () => {
        const btn = document.getElementById('btnExport');
        btn.disabled = true;
        btn.textContent = 'Exportation…';
        try {
            await exportSessionToDexie({ username, date, totalTime, stats });
            btn.textContent = '✓ Exporté dans la base';
            btn.style.backgroundColor = '#2a9d6a';
        } catch (err) {
            console.error(err);
            btn.textContent = 'Erreur lors de l\'export';
            btn.style.backgroundColor = '#c0392b';
            btn.disabled = false;
        }
    });

    // ── 3 graphiques en courbe ──
    function makeChart(canvasId, data, color) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data,
                    borderColor: color,
                    backgroundColor: color.replace('1)', '0.08)'),
                    borderWidth: 2,
                    pointBackgroundColor: color,
                    pointRadius: 5,
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1c1c28',
                        borderColor: '#2a2a3d',
                        borderWidth: 1,
                        titleColor: '#e8e8f0',
                        bodyColor: '#6b6b8a',
                        padding: 10,
                        titleFont: { family: 'Space Mono', size: 11 }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#6b6b8a', font: { family: 'Space Mono', size: 10 } },
                        grid:  { color: 'rgba(0,0,0,0.06)' }
                    },
                    y: {
                        ticks: { color: '#6b6b8a', font: { family: 'Space Mono', size: 10 } },
                        grid:  { color: 'rgba(0,0,0,0.06)' }
                    }
                }
            }
        });
    }

    makeChart('chartWpm',   wpmData,   'rgba(124,106,247,1)');
    makeChart('chartError', errorData, 'rgba(247,106,138,1)');
    makeChart('chartReact', reactData, 'rgba(32,180,134,1)');
}

loadResults();
