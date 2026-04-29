
// ─── Configuration globale ────────────────────────────────────────────────────

const TOTAL_EXERCISES_SESSION = 11; // Nombre total d'exercices sur toute la session
const SESSION_DURATION = 2100;      // Durée maximale en secondes (35 minutes)

// ─── Données des 3 parties ────────────────────────────────────────────────────
// Chaque partie définit ses exercices, la page suivante et le mode d'affichage.

const PARTS = {
    1: {
        title: "Partie 1 - Lettres",
        exercises: [
            { name: "FJ", text: "jjjj ffff jjff jj ffjj ff j f ffjf fj fffjj ffjjjjf ffjjff jffjfjfj ffjjfj fjjf ffjjffj" },
            { name: "GH", text: "gggg hhhh gghh ghgh g h ghgjf hjjh ffjhjggh hfhjfg gh ffjjhgjgfg hhggh ghjfjgjg hfggfjj" },
            { name: "TY", text: "tttt yyyy ttyy tyty t y tyghfj jjyttyg tffgjyy ty ytttfh thghy tytytfgj thjyghf tyjtytg" },
            { name: "SL", text: "ssss llll ssll slsl s l sllsthfj jjtylls lsslsjgh slfjhstl ytyghls tytlsssll gghhlsytls" }
        ],
        nextPage: "code/session.html?part=2",
        mode: "letters"
    },
    2: {
        title: "Partie 2 - Mots",
        exercises: [
            { name: "3-4 lettres", words: ["the","for","you","can","have","all","not","time","year","work","life","love","make","take","give","know","look"] },
            { name: "5-6 lettres", words: ["again","great","think","world","place","right","point","under","group","small","people","little","number","school","second","family","system","follow"] },
            { name: "7-8 lettres", words: ["without","another","between","example","country","problem","support","morning"] },
            { name: "9 lettres", words: ["important","language","experience","business","community","everything","education"] }
        ],
        nextPage: "code/session.html?part=3",
        mode: "words"
    },
    3: {
        title: "Partie 3 - Phrases",
        exercises: [
            { name: "Courtes", sentences: ["They play"] },
            { name: "Intermédiaires", sentences: ["I need to finish this today"] },
            { name: "Longues", sentences: ["She told me that everything would be fine if we stayed focused"] }
        ],
        nextPage: "code/resultat.html",
        mode: "sentences"
    }
};

// ─── Détection de la partie & initialisation du DOM ──────────────────────────

const partNumber = parseInt(new URLSearchParams(location.search).get("part")) || 1;
const part = PARTS[partNumber];

if (!part) {
    console.error(`Partie "${partNumber}" introuvable.`);
    location.href = "index.html";
}

document.body.dataset.part = partNumber;
document.title = part.title;
document.getElementById("partTitle").textContent = part.title;

const exerciseList = document.getElementById("exerciseList");
part.exercises.forEach((ex, i) => {
    const span = document.createElement("span");
    span.id = `ex${i + 1}`;
    span.textContent = ex.name;
    exerciseList.appendChild(span);
});

const exercises = part.exercises;

// ─── État de la session ───────────────────────────────────────────────────────

let currentExerciseIndex = 0;
let currentSubIndex = 0;
let currentIndex = 0;
let spans = [];

let exerciseStartTime = null;
let allKeyTimestamps = [];
let allTypedChars = [];
let allExpectedChars = [];

// ─── Affichage du nom d'utilisateur ───────────────────────────────────────────

const username = localStorage.getItem("username");
const usernameEl = document.getElementById("usernameDisplay");
if (usernameEl) usernameEl.textContent = username || "Invité";

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

// ─── Barre de progression globale ─────────────────────────────────────────────

function updateGlobalProgress() {
    const completed = parseInt(localStorage.getItem("completedExercises")) || 0;
    const percent = Math.floor((completed / TOTAL_EXERCISES_SESSION) * 100);
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";
}

// ─── Curseur visuel ───────────────────────────────────────────────────────────

function updateCursor() {
    const cursor = document.getElementById("cursor");
    if (!cursor || !spans.length) return;

    const containerRect = document.getElementById("textDisplay").getBoundingClientRect();

    if (currentIndex >= spans.length) {
        const lastRect = spans[spans.length - 1].getBoundingClientRect();
        cursor.style.left = (lastRect.right - containerRect.left) + "px";
        cursor.style.top  = (lastRect.top   - containerRect.top)  + "px";
    } else {
        const rect = spans[currentIndex].getBoundingClientRect();
        cursor.style.left = (rect.left - containerRect.left) + "px";
        cursor.style.top  = (rect.top  - containerRect.top)  + "px";
    }
}

// ─── Chargement du contenu ────────────────────────────────────────────────────

function loadContent() {
    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";
    currentIndex = 0;

    const ex = exercises[currentExerciseIndex];
    let text = "";
    if (part.mode === "letters")   text = ex.text;
    else if (part.mode === "words")    text = ex.words[currentSubIndex];
    else if (part.mode === "sentences") text = ex.sentences[currentSubIndex];

    text.split("").forEach(char => {
        const span = document.createElement("span");
        span.textContent = char;
        textDisplay.appendChild(span);
    });

    spans = textDisplay.querySelectorAll("span");

    const cursor = document.createElement("div");
    cursor.id = "cursor";
    textDisplay.appendChild(cursor);

    setTimeout(() => {
        updateCursor();
        // Notifie le module cube de la nouvelle touche cible
        if (typeof window.updateCurrentTargetKey === "function") {
            window.updateCurrentTargetKey();
        }
    }, 50);
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

// ─── Calcul des métriques ─────────────────────────────────────────────────────

function computeMetrics() {
    const typedText    = allTypedChars.join("");
    const expectedText = allExpectedChars.join("");
    const elapsedMinutes = exerciseStartTime
        ? (performance.now() - exerciseStartTime) / 60000
        : 1;

    const wpm = elapsedMinutes > 0
        ? Math.round((allKeyTimestamps.length / 5) / elapsedMinutes)
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

    return { wpm, errorRate, avgReactionTime };
}

// ─── Gestion des frappes clavier ──────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
    if (e.key === "Backspace") e.preventDefault();
    if (e.key === "&") { finishExercise(); return; }
    if (!spans.length || currentIndex >= spans.length) return;
    if (e.key.length > 1 && e.key !== " ") return;

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
        if (typeof window.updateCurrentTargetKey === "function") {
            window.updateCurrentTargetKey();
        }
        if (currentIndex === spans.length) onContentComplete();
    } else {
        spans[currentIndex].classList.add("incorrect");
    }
});

// ─── Fin d'un contenu ─────────────────────────────────────────────────────────

function onContentComplete() {
    if (part.mode === "letters") {
        finishExercise();
        return;
    }

    const items = part.mode === "words"
        ? exercises[currentExerciseIndex].words
        : exercises[currentExerciseIndex].sentences;

    currentSubIndex++;

    if (currentSubIndex < items.length) {
        setTimeout(loadContent, part.mode === "words" ? 300 : 400);
    } else {
        finishExercise();
    }
}

// ─── Fin d'exercice ───────────────────────────────────────────────────────────

async function finishExercise() {
    const exEl = document.getElementById("ex" + (currentExerciseIndex + 1));
    if (exEl) exEl.classList.add("done");

    const metrics = computeMetrics();
    const order = parseInt(localStorage.getItem("exerciseOrder") || "0");
    localStorage.setItem("exerciseOrder", order + 1);

    const stats = JSON.parse(sessionStorage.getItem("sessionStats") || "[]");
    stats.push({
        part: partNumber,
        order,
        exerciseName: exercises[currentExerciseIndex].name,
        wpm: metrics.wpm,
        errorRate: metrics.errorRate,
        avgReactionTime: metrics.avgReactionTime
    });
    sessionStorage.setItem("sessionStats", JSON.stringify(stats));

    const completed = (parseInt(localStorage.getItem("completedExercises")) || 0) + 1;
    localStorage.setItem("completedExercises", completed);
    updateGlobalProgress();

    exerciseStartTime = null;
    allKeyTimestamps  = [];
    allTypedChars     = [];
    allExpectedChars  = [];
    currentSubIndex   = 0;
    currentExerciseIndex++;

    if (currentExerciseIndex < exercises.length) {
        setTimeout(loadContent, 800);
    } else if (part.nextPage === "code/resultat.html") {
        setTimeout(() => endSession(), 500);
    } else {
        setTimeout(() => { window.location.href = part.nextPage; }, 1000);
    }
}

// ─── Fin de session ───────────────────────────────────────────────────────────

async function endSession() {
    clearInterval(timerInterval);
    sessionStorage.setItem("sessionTotalTime", seconds);
    localStorage.removeItem("completedExercises");
    localStorage.removeItem("globalTime");
    window.location.href = "code/resultat.html";
}

// ─── Exposition des variables nécessaires au module cube ──────────────────────
// Le module cube.js lit ces valeurs via window pour connaître la touche cible.

window._session = { get spans() { return spans; }, get currentIndex() { return currentIndex; } };
