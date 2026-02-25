
// Configuration de la session


const TOTAL_EXERCISES_SESSION = 11;
const SESSION_DURATION = 2100;


// Données exercices Partie Mots


const exercises = [
    {
        name: "3-4 lettres",
        words: ["the", "for", "you", "can", "have", "all", "not", "time", "year", "work", "life", "love", "make", "take", "give", "know", "look"]
    },
    {
        name: "5-6 lettres",
        words: ["again", "great", "think", "world", "place", "right", "point", "under", "group", "small", "people", "little", "number", "school", "second", "family", "system", "follow"]
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

let currentExerciseIndex = 0;
let currentWordIndex = 0;
let currentIndex = 0;
let spans = [];

// Chronomètre de la session

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
        String(min).padStart(2, '0') + ":" +
        String(sec).padStart(2, '0');
}

// Barre de progression de la session

function updateGlobalProgress() {
    const completed = parseInt(localStorage.getItem("completedExercises")) || 0;
    const percent = Math.floor((completed / TOTAL_EXERCISES_SESSION) * 100);

    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";
}


// Affichage d'un mot à la fois


function loadWord() {

    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";

    const word =
        exercises[currentExerciseIndex].words[currentWordIndex];

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

/// Curseur

function updateCursor() {

    const cursor = document.getElementById("cursor");
    if (!cursor || currentIndex >= spans.length) return;

    const rect = spans[currentIndex].getBoundingClientRect();
    const containerRect =
        document.getElementById("textDisplay").getBoundingClientRect();

    cursor.style.left = (rect.left - containerRect.left) + "px";
    cursor.style.top = (rect.top - containerRect.top) + "px";
}

// Gestion de la frappe

document.addEventListener("keydown", (e) => {

    if (!spans.length) return;
    if (currentIndex >= spans.length) return;
    if (e.key.length > 1) return;

    const expected = spans[currentIndex].textContent;

    if (e.key === expected) {

        spans[currentIndex].classList.remove("incorrect");
        spans[currentIndex].classList.add("correct");

        currentIndex++;
        updateCursor();

        if (currentIndex === spans.length) {
            nextWord();
        }

    } else {
        spans[currentIndex].classList.add("incorrect");
    }

});


// Passage d'un mot à l'autre


function nextWord() {

    currentWordIndex++;

    if (currentWordIndex <
        exercises[currentExerciseIndex].words.length) {

        setTimeout(loadWord, 300);

    } else {
        finishExercise();
    }
}

// Fin de l'exercice

function finishExercise() {

    const exId = "ex" + (currentExerciseIndex + 1);
    document.getElementById(exId).classList.add("done");

    let completed =
        parseInt(localStorage.getItem("completedExercises")) || 0;

    completed++;
    localStorage.setItem("completedExercises", completed);

    updateGlobalProgress();

    currentExerciseIndex++;
    currentWordIndex = 0;

    if (currentExerciseIndex < exercises.length) {
        setTimeout(loadWord, 800);
    } else {
        window.location.href = "part3.html";
    }
}

// Fin de la session

function endSession() {
    clearInterval(timerInterval);
    window.location.href = "resultat.html";
}

// Initialisation

updateGlobalProgress();
loadWord();
