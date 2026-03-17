import { getOrCreateSession, saveExerciseStat, finalizeSession } from "./db.js";

// ─── Configuration ────────────────────────────────────────────────────────────

const TOTAL_EXERCISES_SESSION = 11;
const SESSION_DURATION = 2100;

// ─── Exercices ────────────────────────────────────────────────────────────────

const exercises = [
    {
        name: "Courtes",
        sentences: ["They play"]
    },
    {
        name: "Intermédiaires",
        sentences: ["I need to finish this today"]
    },
    {
        name: "Longues",
        sentences: ["She told me that everything would be fine if we stayed focused"]
    }
];

// ─── État ─────────────────────────────────────────────────────────────────────

let currentExerciseIndex = 0;
let currentSentenceIndex = 0;
let currentIndex = 0;
let spans = [];

// Métriques accumulées sur l'exercice courant
let exerciseStartTime = null;
let allKeyTimestamps = [];
let allTypedChars = [];
let allExpectedChars = [];

// ─── Chronomètre global ───────────────────────────────────────────────────────

let seconds = parseInt(localStorage.getItem("globalTime")) || 0;
updateTimerDisplay();

const timerInterval = setInterval(() => {
    seconds++;
    localStorage.setItem("globalTime", seconds);
    updateTimerDisplay();
    if (seconds >= SESSION_DURATION) endSession();
}, 1000);

function updateTimerDisplay() {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    document.getElementById("timer").textContent =
        String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

// ─── Progression ──────────────────────────────────────────────────────────────

function updateGlobalProgress() {
    const completed = parseInt(localStorage.getItem("completedExercises")) || 0;
    const percent = Math.floor((completed / TOTAL_EXERCISES_SESSION) * 100);
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";
}

// ─── Curseur ──────────────────────────────────────────────────────────────────

function updateCursor() {
    const cursor = document.getElementById("cursor");
    if (!cursor || currentIndex >= spans.length) return;
    const rect = spans[currentIndex].getBoundingClientRect();
    const containerRect = document.getElementById("textDisplay").getBoundingClientRect();
    cursor.style.left = (rect.left - containerRect.left) + "px";
    cursor.style.top = (rect.top - containerRect.top) + "px";
}

// ─── Chargement phrase ────────────────────────────────────────────────────────

function loadSentence() {
    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";

    const sentence = exercises[currentExerciseIndex].sentences[currentSentenceIndex];
    currentIndex = 0;

    sentence.split("").forEach(char => {
        const span = document.createElement("span");
        span.textContent = char;
        textDisplay.appendChild(span);
    });

    spans = textDisplay.querySelectorAll("span");

    const cursor = document.createElement("div");
    cursor.id = "cursor";
    textDisplay.appendChild(cursor);

    setTimeout(updateCursor, 50);
}

// ─── Distance de Levenshtein ──────────────────────────────────────────────────

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

// ─── Gestion frappe ───────────────────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
    if (!spans.length || currentIndex >= spans.length || e.key.length > 1) return;

    if (exerciseStartTime === null) exerciseStartTime = performance.now();

    const now = performance.now();
    const expected = spans[currentIndex].textContent;

    allTypedChars.push(e.key);
    allExpectedChars.push(expected);

    if (e.key === expected) {
        spans[currentIndex].classList.remove("incorrect");
        spans[currentIndex].classList.add("correct");
        allKeyTimestamps.push(now);
        currentIndex++;
        updateCursor();
        if (currentIndex === spans.length) nextSentence();
    } else {
        spans[currentIndex].classList.add("incorrect");
    }
});

// ─── Phrase suivante ──────────────────────────────────────────────────────────

function nextSentence() {
    currentSentenceIndex++;
    if (currentSentenceIndex < exercises[currentExerciseIndex].sentences.length) {
        setTimeout(loadSentence, 400);
    } else {
        finishExercise();
    }
}

// ─── Calcul métriques ─────────────────────────────────────────────────────────

function computeMetrics() {
    const typedText = allTypedChars.join("");
    const expectedText = allExpectedChars.join("");

    const elapsedMinutes = exerciseStartTime
        ? (performance.now() - exerciseStartTime) / 60000
        : 1;

    const totalCorrect = allKeyTimestamps.length;
    const wpm = elapsedMinutes > 0
        ? Math.round((totalCorrect / 5) / elapsedMinutes)
        : 0;

    const dist = levenshtein(typedText, expectedText);
    const errorRate = expectedText.length > 0
        ? Math.round((dist / expectedText.length) * 100)
        : 0;

    let avgReactionTime = 0;
    if (allKeyTimestamps.length > 1) {
        const deltas = allKeyTimestamps.slice(1).map((t, i) => t - allKeyTimestamps[i]);
        avgReactionTime = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
    }

    return { wpm, errorRate, avgReactionTime, typed: typedText, expected: expectedText };
}

// ─── Fin exercice ─────────────────────────────────────────────────────────────

async function finishExercise() {
    const exId = "ex" + (currentExerciseIndex + 1);
    const el = document.getElementById(exId);
    if (el) el.classList.add("done");

    const metrics = computeMetrics();
    const session = await getOrCreateSession();
    await saveExerciseStat({
        sessionId: session.id,
        part: 3,
        exerciseName: exercises[currentExerciseIndex].name,
        wpm: metrics.wpm,
        errorRate: metrics.errorRate,
        avgReactionTime: metrics.avgReactionTime,
        typed: metrics.typed,
        expected: metrics.expected
    });

    let completed = parseInt(localStorage.getItem("completedExercises")) || 0;
    completed++;
    localStorage.setItem("completedExercises", completed);
    updateGlobalProgress();

    // Reset accumulation
    exerciseStartTime = null;
    allKeyTimestamps = [];
    allTypedChars = [];
    allExpectedChars = [];

    currentExerciseIndex++;
    currentSentenceIndex = 0;

    if (currentExerciseIndex < exercises.length) {
        setTimeout(loadSentence, 800);
    } else {
        // Fin de toutes les parties → résultat
        setTimeout(() => endSession(), 500);
    }
}

// ─── Fin session ──────────────────────────────────────────────────────────────

async function endSession() {
    clearInterval(timerInterval);
    await finalizeSession(seconds);
    // Nettoyer localStorage de session
    localStorage.removeItem("completedExercises");
    localStorage.removeItem("globalTime");
    window.location.href = "resultat.html";
}

// ─── Init ─────────────────────────────────────────────────────────────────────

updateGlobalProgress();
loadSentence();
