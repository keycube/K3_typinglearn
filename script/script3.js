
// Configuration de session


const TOTAL_EXERCISES_SESSION = 11;
const SESSION_DURATION = 2100;


// Données exercices partie 3 Phrases


const exercises = [
    {
        name: "Courtes",
        sentences: [
            "They play"
        ]
    },
    {
        name: "Intermédiaires",
        sentences: [
            "I need to finish this today"
            
        ]
    },
    {
        name: "Longues",
        sentences: [
            "She told me that everything would be fine if we stayed focused"
           
        ]
    }
];

let currentExerciseIndex = 0;
let currentSentenceIndex = 0;
let currentIndex = 0;
let spans = [];


// Timer global


let seconds = parseInt(localStorage.getItem("globalTime")) || 0;

updateTimerDisplay();

const timerInterval = setInterval(() => {

    seconds++;
    localStorage.setItem("globalTime", seconds);
    updateTimerDisplay();

    if (seconds >= SESSION_DURATION) {
        endSession();
    }

}, 1000);

function updateTimerDisplay() {

    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    document.getElementById("timer").textContent =
        String(min).padStart(2, '0') + ":" +
        String(sec).padStart(2, '0');
}


// Progression globale


function updateGlobalProgress() {

    const completed =
        parseInt(localStorage.getItem("completedExercises")) || 0;

    const percent =
        Math.floor((completed / TOTAL_EXERCISES_SESSION) * 100);

    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";
}


// Affichage des phrases


function loadSentence() {

    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";

    const sentence =
        exercises[currentExerciseIndex].sentences[currentSentenceIndex];

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


// Curseur


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
            nextSentence();
        }

    } else {

        spans[currentIndex].classList.add("incorrect");
    }

});


// Phrase suivante


function nextSentence() {

    currentSentenceIndex++;

    if (currentSentenceIndex <
        exercises[currentExerciseIndex].sentences.length) {

        setTimeout(loadSentence, 400);

    } else {
        finishExercise();
    }
}


// Fin de l'exercice

function finishExercise() {

    const exId = "ex" + (currentExerciseIndex + 1);
    const exElement = document.getElementById(exId);
    if (exElement) exElement.classList.add("done");

    let completed =
        parseInt(localStorage.getItem("completedExercises")) || 0;

    completed++;
    localStorage.setItem("completedExercises", completed);

    updateGlobalProgress();

    currentExerciseIndex++;
    currentSentenceIndex = 0;

    if (currentExerciseIndex < exercises.length) {

        setTimeout(loadSentence, 800);

    } else {

        endSession();
    }
}


// Fin de la session

function endSession() {

    clearInterval(timerInterval);
    window.location.href = "resultat.html";
}


// Initialisation
updateGlobalProgress();
loadSentence();
