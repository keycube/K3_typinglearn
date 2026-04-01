
// Configuration 

const TOTAL_EXERCISES_SESSION = 11;
const SESSION_DURATION = 2100;

// Exercices 

const exercises = [
    {
        name: "3-4 lettres",
        words: ["the", "for", "you", "can", "have", "all", "not", "time", "year", "work", "life", 
            "love", "make", "take", "give", "know", "look"]
    },
    {
        name: "5-6 lettres",
        words: ["again", "great", "think", "world", "place", "right", "point", "under", "group",
             "small", "people", "little", "number", "school", "second", "family", "system", "follow"]
    },
    {
        name: "7-8 lettres",
        words: ["without", "another", "between", "example", "country", "problem", "support", "morning"]
    },
    {
        name: "9 lettres",
        words: ["important", "language", "experience", "business", "community", "everything", "education"]
    }
];

//  État 

let currentExerciseIndex = 0;
let currentWordIndex = 0;
let currentIndex = 0;
let spans = [];

// Métriques accumulées sur l'exercice courant
let exerciseStartTime = null;
let allKeyTimestamps = [];   
let allTypedChars = [];      
let allExpectedChars = [];   

//  Utilisateur

const username = localStorage.getItem("username");
if (document.getElementById("usernameDisplay"))
    document.getElementById("usernameDisplay").textContent = username || "Invité";

//  Chronomètre global 

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

//  Progression 

function updateGlobalProgress() {
    const completed = parseInt(localStorage.getItem("completedExercises")) || 0;
    const percent = Math.floor((completed / TOTAL_EXERCISES_SESSION) * 100);
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";
}

//  Curseur

function updateCursor() {
    const cursor = document.getElementById("cursor");
    if (!cursor || currentIndex >= spans.length) return;
    const rect = spans[currentIndex].getBoundingClientRect();
    const containerRect = document.getElementById("textDisplay").getBoundingClientRect();
    cursor.style.left = (rect.left - containerRect.left) + "px";
    cursor.style.top = (rect.top - containerRect.top) + "px";
}

// Chargement mot

function loadWord() {
    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";

    const word = exercises[currentExerciseIndex].words[currentWordIndex];
    currentIndex = 0;

    word.split("").forEach(char => {
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

//  Distance de Levenshtein 

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

//  Gestion frappe 

document.addEventListener("keydown", (e) => {
    if (e.key === "&") { finishExercise(); return; }
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
        if (currentIndex === spans.length) nextWord();
    } else {
        spans[currentIndex].classList.add("incorrect");
    }
});

//  Mot suivant 

function nextWord() {
    currentWordIndex++;
    if (currentWordIndex < exercises[currentExerciseIndex].words.length) {
        setTimeout(loadWord, 300);
    } else {
        finishExercise();
    }
}

//  Calcul métriques

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

// Fin exercice

async function finishExercise() {
    const exId = "ex" + (currentExerciseIndex + 1);
    const el = document.getElementById(exId);
    if (el) el.classList.add("done");

    const metrics = computeMetrics();
    let order = parseInt(localStorage.getItem("exerciseOrder") || "0");
    order++;
    localStorage.setItem("exerciseOrder", order);

    const stats = JSON.parse(sessionStorage.getItem("sessionStats") || "[]");
    stats.push({
        part: 2,
        order,
        exerciseName: exercises[currentExerciseIndex].name,
        wpm: metrics.wpm,
        errorRate: metrics.errorRate,
        avgReactionTime: metrics.avgReactionTime
    });
    sessionStorage.setItem("sessionStats", JSON.stringify(stats));

    let completed = parseInt(localStorage.getItem("completedExercises")) || 0;
    completed++;
    localStorage.setItem("completedExercises", completed);
    updateGlobalProgress();

    // Reset accumulation pour prochain exercice
    exerciseStartTime = null;
    allKeyTimestamps = [];
    allTypedChars = [];
    allExpectedChars = [];

    currentExerciseIndex++;
    currentWordIndex = 0;

    if (currentExerciseIndex < exercises.length) {
        setTimeout(loadWord, 800);
    } else {
        setTimeout(() => { window.location.href = "code/part3.html"; }, 1000);
    }
}

//  Fin session 

async function endSession() {
    clearInterval(timerInterval);
    sessionStorage.setItem("sessionTotalTime", seconds);
    window.location.href = "code/resultat.html";
}

// Init 

updateGlobalProgress();
loadWord();
