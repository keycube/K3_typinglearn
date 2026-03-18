import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// ─── Configuration ────────────────────────────────────────────────────────────

const TOTAL_EXERCISES_SESSION = 11;
const SESSION_DURATION = 2100;

// ─── Exercices ────────────────────────────────────────────────────────────────

const exercises = [
    { name: "FJ", text: "jjjj ffff jjff jj ffjj ff j f ffjf fj fffjj ffjjjjf ffjjff jffjfjfj ffjjfj fjjf ffjjffj" },
    { name: "GH", text: "gggg hhhh gghh ghgh g h ghgjf hjjh ffjhjggh hfhjfg gh ffjjhgjgfg hhggh ghjfjgjg hfggfjj" },
    { name: "TY", text: "tttt yyyy ttyy tyty t y tyghfj jjyttyg tffgjyy ty ytttfh thghy tytytfgj thjyghf tyjtytg" },
    { name: "SL", text: "ssss llll ssll slsl s l sllsthfj jjtylls lsslsjgh slfjhstl ytyghls tytlsssll gghhlsytls" }
];

// ─── État ─────────────────────────────────────────────────────────────────────

let currentExerciseIndex = 0;
let currentIndex = 0;
let spans = [];

// Métriques par exercice
let exerciseStartTime = null;
let keyTimestamps = [];       // timestamps de chaque frappe correcte
let typedChars = [];          // caractères tapés (y compris erreurs)
let errorCount = 0;

// ─── Utilisateur ──────────────────────────────────────────────────────────────

const username = localStorage.getItem("username");
document.getElementById("usernameDisplay").textContent = username || "Invité";

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

// ─── Chargement exercice ──────────────────────────────────────────────────────

function loadExercise(index) {
    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";

    const text = exercises[index].text;
    currentIndex = 0;

    // Reset métriques
    exerciseStartTime = null;
    keyTimestamps = [];
    typedChars = [];
    errorCount = 0;

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
    if (e.key === "Backspace") e.preventDefault();
    if (!spans.length || currentIndex >= spans.length || e.key.length > 1) return;

    // Démarre le chrono du premier caractère
    if (exerciseStartTime === null) exerciseStartTime = performance.now();

    const now = performance.now();
    const expected = spans[currentIndex].textContent;

    typedChars.push(e.key);

    if (e.key === expected) {
        spans[currentIndex].classList.remove("incorrect");
        spans[currentIndex].classList.add("correct");
        keyTimestamps.push(now);
        currentIndex++;
        updateCursor();
        if (currentIndex === spans.length) finishExercise();
    } else {
        errorCount++;
        spans[currentIndex].classList.add("incorrect");
    }
});

// ─── Calcul métriques ─────────────────────────────────────────────────────────

function computeMetrics() {
    const expectedText = exercises[currentExerciseIndex].text;
    const typedText = typedChars.join("");

    // WPM : nb de caractères corrects / 5 / minutes écoulées
    const elapsedMinutes = (performance.now() - exerciseStartTime) / 60000;
    const wpm = elapsedMinutes > 0
        ? Math.round((currentIndex / 5) / elapsedMinutes)
        : 0;

    // Taux d'erreur Levenshtein
    const dist = levenshtein(typedText, expectedText);
    const errorRate = expectedText.length > 0
        ? Math.round((dist / expectedText.length) * 100)
        : 0;

    // Temps de réaction moyen entre frappes consécutives (ms)
    let avgReactionTime = 0;
    if (keyTimestamps.length > 1) {
        const deltas = keyTimestamps.slice(1).map((t, i) => t - keyTimestamps[i]);
        avgReactionTime = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
    }

    return { wpm, errorRate, avgReactionTime, typed: typedText, expected: expectedText };
}

// ─── Fin exercice ─────────────────────────────────────────────────────────────

async function finishExercise() {
    const exId = "ex" + (currentExerciseIndex + 1);
    const exElement = document.getElementById(exId);
    if (exElement) exElement.classList.add("done");

    // Sauvegarder métriques dans sessionStorage
    const metrics = computeMetrics();
    const order = parseInt(localStorage.getItem("exerciseOrder") || "0");
    localStorage.setItem("exerciseOrder", order + 1);

    const stats = JSON.parse(sessionStorage.getItem("sessionStats") || "[]");
    stats.push({
        part: 1,
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

    currentExerciseIndex++;

    if (currentExerciseIndex < exercises.length) {
        setTimeout(() => loadExercise(currentExerciseIndex), 800);
    } else {
        setTimeout(() => { window.location.href = "code/part2.html"; }, 1000);
    }
}

// ─── Fin session ──────────────────────────────────────────────────────────────

async function endSession() {
    clearInterval(timerInterval);
    sessionStorage.setItem("sessionTotalTime", seconds);
    window.location.href = "code/resultat.html";
}

// ─── Cube Three.js 
function initCube() {
    const container = document.getElementById("cube-container");
    const scene = new THREE.Scene();
    const aspect = container.clientWidth / container.clientHeight;
    const d = 4;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
    camera.position.set(6, 6, 6);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    function createKeyboardFace(layout) {
        const canvas = document.createElement("canvas");
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 512, 512);
        const rows = layout.length, cols = layout[0].length;
        const padding = 40, gap = 15;
        const keyWidth = (512 - padding * 2 - gap * (cols - 1)) / cols;
        const keyHeight = (512 - padding * 2 - gap * (rows - 1)) / rows;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const letter = layout[r][c];
                const x = padding + c * (keyWidth + gap);
                const y = padding + r * (keyHeight + gap);
                ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 6;
                ctx.fillStyle = "#e0e0e0"; ctx.fillRect(x, y, keyWidth, keyHeight);
                ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
                ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(x, y + keyHeight); ctx.lineTo(x, y);
                ctx.lineTo(x + keyWidth, y); ctx.stroke();
                ctx.strokeStyle = "#777";
                ctx.beginPath(); ctx.moveTo(x + keyWidth, y);
                ctx.lineTo(x + keyWidth, y + keyHeight); ctx.lineTo(x, y + keyHeight); ctx.stroke();
                ctx.fillStyle = "#000"; ctx.font = "bold 32px Arial";
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(letter, x + keyWidth / 2, y + keyHeight / 2);
            }
        }
        return new THREE.CanvasTexture(canvas);
    }

    const faceFront =
     [["alt","OS","ctrl","shift"],
     [",<",".>","/?",""],
     [":;","'","Tab","`~"],
     ["{[","]}","|",""]];

    const faceBack = 
    [["","V","F","R"],
    ["","C","D","E"],
    ["","X","S","W"],
    ["","Z","A","Q"]];

    const faceRight = 
    [["U","J","B",""],
    ["I","K","N",""],
    ["O","L","M",""],
    ["P","","",""]];

    const faceLeft = 
    [["shift","ctrl","OS","alt"],
    ["7&","8*","9(","0)"],
    ["4$","5%","6^","-_"],
    ["1!","2@","3#","+="]];

    const faceTop = 
    [["Sp","G","T","CpLk"],
    ["Sp","Left","Up","Y"],
    ["Sp","Dwn","Right","H"],
    ["Entr","Entr","Bks","Bks"]];

    const faceBottom = 
    [["","","",""],
    ["","","",""],
    ["","","",""],
    ["","","",""]];

    const materials = [
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceLeft) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceTop) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBottom) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceFront) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack) })
    ];

    const geometry = new THREE.BoxGeometry(4, 4, 4);
    const cube = new THREE.Mesh(geometry, materials);
    
    cube.rotation.x = Math.PI / 6;  
    cube.rotation.y = Math.PI / 4;  
    scene.add(cube);

    const planeGeometry = new THREE.PlaneGeometry(4, 4);
    const rightFace = new THREE.Mesh(planeGeometry, new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight), side: THREE.DoubleSide }));
    rightFace.position.set(6, 1.2, 0); rightFace.rotation.y = -Math.PI / 2;
    scene.add(rightFace);

    const backFace = new THREE.Mesh(planeGeometry, new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack), side: THREE.DoubleSide }));
    backFace.position.set(-6, 1.2, 0); backFace.rotation.y = Math.PI / 2;
    scene.add(backFace);

    function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }
    animate();
}

initCube();

// Init 

updateGlobalProgress();
loadExercise(currentExerciseIndex);
