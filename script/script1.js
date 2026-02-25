
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";



// Configuration de la session


const TOTAL_EXERCISES_SESSION = 11; // 4 exercices lettres + 4 exercices mots + 3 exercices phrases
const SESSION_DURATION = 2100; // 35 minutes en secondes


// Données exercices Partie Lettres


const exercises = [
    { name: "FJ", text: "jjjj ffff jjff jj ffjj ff j f ffjf fj fffjj ffjjjjf ffjjff jffjfjfj ffjjfj fjjf ffjjffj" },
    { name: "GH", text: "gggg hhhh gghh ghgh g h ghgjf hjjh ffjhjggh hfhjfg gh ffjjhgjgfg hhggh ghjfjgjg hfggfjj" },
    { name: "TY", text: "tttt yyyy ttyy tyty t y tyghfj jjyttyg tffgjyy ty ytttfh thghy tytytfgj thjyghf tyjtytg" },
    { name: "SL", text: "ssss llll ssll slsl s l sllsthfj jjtylls lsslsjgh slfjhstl ytyghls tytlsssll gghhlsytls" }
];

let currentExerciseIndex = 0;
let currentIndex = 0;
let spans = [];


// Nom d'utilisateur


const username = localStorage.getItem("username");
document.getElementById("usernameDisplay").textContent = username || "Invité";


// Chronomètre de la session


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


// Barre de progression de la session


function updateGlobalProgress() {

    const completed =
        parseInt(localStorage.getItem("completedExercises")) || 0;

    const percent =
        Math.floor((completed / TOTAL_EXERCISES_SESSION) * 100);

    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";
}


// Curseur


function updateCursor() {

    const cursor = document.getElementById("cursor");
    if (!cursor) return;
    if (currentIndex >= spans.length) return;

    const currentSpan = spans[currentIndex];
    const rect = currentSpan.getBoundingClientRect();
    const containerRect =
        document.getElementById("textDisplay").getBoundingClientRect();

    cursor.style.left = (rect.left - containerRect.left) + "px";
    cursor.style.top = (rect.top - containerRect.top) + "px";
}


// Chargement des exercies


function loadExercise(index) {

    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";

    const text = exercises[index].text;
    currentIndex = 0;

    text.split("").forEach(char => {
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
            finishExercise();
        }

    } else {

        spans[currentIndex].classList.add("incorrect");
    }

});


// Fin de l'exercice


function finishExercise() {

    const exId = "ex" + (currentExerciseIndex + 1);
    const exElement = document.getElementById(exId);
    if (exElement) exElement.classList.add("done");

    // Incrémenter progression globale
    let completed =
        parseInt(localStorage.getItem("completedExercises")) || 0;

    completed++;
    localStorage.setItem("completedExercises", completed);

    updateGlobalProgress();

    currentExerciseIndex++;

    if (currentExerciseIndex < exercises.length) {

        setTimeout(() => {
            loadExercise(currentExerciseIndex);
        }, 800);

    } else {

        // Fin partie lettres, rediriger vers la partie Mots
        setTimeout(() => {
            window.location.href = "code/part2.html";
        }, 1000);
    }
}


// Cube


function initCube() {

    const container = document.getElementById("cube-container");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d0c18");

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        metalness: 0.7,
        roughness: 0.2
    });

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );

    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    function animate() {
        requestAnimationFrame(animate);

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener("resize", () => {
        camera.aspect =
            container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(
            container.clientWidth,
            container.clientHeight
        );
    });
}

initCube();



// Fin de la session


function endSession() {

    clearInterval(timerInterval);
    window.location.href = "code/resultat.html";
}


// Initialisation


updateGlobalProgress();
loadExercise(currentExerciseIndex);
