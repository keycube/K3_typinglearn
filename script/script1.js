import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// Configuration 

const TOTAL_EXERCISES_SESSION = 11;
const SESSION_DURATION = 2100;

// Exercices 

const exercises = [
    { name: "FJ", text: "jjjj ffff jjff jj ffjj ff j f ffjf fj fffjj ffjjjjf ffjjff jffjfjfj ffjjfj fjjf ffjjffj" },
    { name: "GH", text: "gggg hhhh gghh ghgh g h ghgjf hjjh ffjhjggh hfhjfg gh ffjjhgjgfg hhggh ghjfjgjg hfggfjj" },
    { name: "TY", text: "tttt yyyy ttyy tyty t y tyghfj jjyttyg tffgjyy ty ytttfh thghy tytytfgj thjyghf tyjtytg" },
    { name: "SL", text: "ssss llll ssll slsl s l sllsthfj jjtylls lsslsjgh slfjhstl ytyghls tytlsssll gghhlsytls" }
];

// État 

let currentExerciseIndex = 0;
let currentIndex = 0;
let spans = [];

// 🆕 touche actuelle à highlight
let currentTargetKey = null;

// Métriques par exercice
let exerciseStartTime = null;
let keyTimestamps = [];       
let typedChars = [];          
let errorCount = 0;

// 🆕 références cube
let cubeMaterials = [];
let rightFaceMesh = null;
let backFaceMesh = null;

// Utilisateur 

const username = localStorage.getItem("username");
document.getElementById("usernameDisplay").textContent = username || "Invité";

// Chronomètre global 

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

// Progression 

function updateGlobalProgress() {
    const completed = parseInt(localStorage.getItem("completedExercises")) || 0;
    const percent = Math.floor((completed / TOTAL_EXERCISES_SESSION) * 100);
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";
}

// Curseur

function updateCursor() {
    const cursor = document.getElementById("cursor");
    if (!cursor || currentIndex >= spans.length) return;
    const rect = spans[currentIndex].getBoundingClientRect();
    const containerRect = document.getElementById("textDisplay").getBoundingClientRect();
    cursor.style.left = (rect.left - containerRect.left) + "px";
    cursor.style.top = (rect.top - containerRect.top) + "px";
}

// Chargement exercice 

function loadExercise(index) {
    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";

    const text = exercises[index].text;
    currentIndex = 0;

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

    // 🆕 init highlight
    updateCurrentTargetKey();

    setTimeout(updateCursor, 50);
}

// 🆕 MAJ touche attendue
function updateCurrentTargetKey() {
    if (currentIndex < spans.length) {
        currentTargetKey = spans[currentIndex].textContent.toUpperCase();
    } else {
        currentTargetKey = null;
    }
    updateCubeTextures();
}

// Distance de Levenshtein 

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

// Gestion frappe 

document.addEventListener("keydown", (e) => {
    if (e.key === "Backspace") e.preventDefault();
    if (!spans.length || currentIndex >= spans.length || e.key.length > 1) return;

    if (exerciseStartTime === null) exerciseStartTime = performance.now();

    const now = performance.now();
    const expected = spans[currentIndex].textContent;

    typedChars.push(e.key);

    if (e.key === expected) {
        spans[currentIndex].classList.remove("incorrect");
        spans[currentIndex].classList.add("correct");
        keyTimestamps.push(now);
        currentIndex++;

        // 🆕 update highlight après bonne frappe
        updateCurrentTargetKey();

        updateCursor();
        if (currentIndex === spans.length) finishExercise();
    } else {
        errorCount++;
        spans[currentIndex].classList.add("incorrect");
    }
});

// 🆕 Création texture avec highlight
function createKeyboardFace(layout) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff"; 
    ctx.fillRect(0, 0, 512, 512);

    const rows = layout.length, cols = layout[0].length;
    const padding = 40, gap = 15;
    const keyWidth = (512 - padding * 2 - gap * (cols - 1)) / cols;
    const keyHeight = (512 - padding * 2 - gap * (rows - 1)) / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const letter = layout[r][c];
            const x = padding + c * (keyWidth + gap);
            const y = padding + r * (keyHeight + gap);

            // 🆕 highlight si correspond
            if (letter.toUpperCase() === currentTargetKey) {
                ctx.fillStyle = "#ffcc00"; // jaune/orange
            } else {
                ctx.fillStyle = "#e0e0e0";
            }

            ctx.fillRect(x, y, keyWidth, keyHeight);

            ctx.fillStyle = "#000";
            ctx.font = "bold 32px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(letter, x + keyWidth / 2, y + keyHeight / 2);
        }
    }

    return new THREE.CanvasTexture(canvas);
}

// 🆕 refresh textures
function updateCubeTextures() {
    if (!cubeMaterials.length) return;

    cubeMaterials[0].map = createKeyboardFace(faceBack);
    cubeMaterials[1].map = createKeyboardFace(faceFront);
    cubeMaterials[2].map = createKeyboardFace(faceTop);
    cubeMaterials[3].map = createKeyboardFace(faceBottom);
    cubeMaterials[4].map = createKeyboardFace(faceLeft);
    cubeMaterials[5].map = createKeyboardFace(faceRight);

    cubeMaterials.forEach(m => m.needsUpdate = true);

    if (rightFaceMesh) {
        rightFaceMesh.material.map = createKeyboardFace(faceRight);
        rightFaceMesh.material.needsUpdate = true;
    }

    if (backFaceMesh) {
        backFaceMesh.material.map = createKeyboardFace(faceBack);
        backFaceMesh.material.needsUpdate = true;
    }
}

// Cube Three.js 
function initCube() {
    const container = document.getElementById("cube-container");
    const scene = new THREE.Scene();
    const aspect = container.clientWidth / container.clientHeight;
    const d = 4;

    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
    camera.position.set(6, 6, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const faceFront = [["alt","OS","ctrl","shift"],[",<",".>","/?",""],[":;","'","Tab","`~"],["{[","]}","|",""]];
    const faceBack = [["","V","F","R"],["","C","D","E"],["","X","S","W"],["","Z","A","Q"]];
    const faceRight = [["U","J","B",""],["I","K","N",""],["O","L","M",""],["P","","",""]];
    const faceLeft = [["shift","ctrl","OS","alt"],["7&","8*","9(","0)"],["4$","5%","6^","-_"],["1!","2@","3#","+="]];
    const faceTop = [["Sp","G","T","CpLk"],["Sp","Left","Up","Y"],["Sp","Dwn","Right","H"],["Entr","Entr","Bks","Bks"]];
    const faceBottom = [["","","",""],["","","",""],["","","",""],["","","",""]];

    cubeMaterials = [
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceFront) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceTop) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBottom) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceLeft) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight) })
    ];

    const cube = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), cubeMaterials);
    scene.add(cube);

    const plane = new THREE.PlaneGeometry(4, 4);

    rightFaceMesh = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight), side: THREE.DoubleSide }));
    rightFaceMesh.position.set(6.5, 1, 0);
    scene.add(rightFaceMesh);

    backFaceMesh = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack), side: THREE.DoubleSide }));
    backFaceMesh.position.set(-6.5, 3, 0);
    scene.add(backFaceMesh);

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}

initCube();

// Init 

updateGlobalProgress();
loadExercise(currentExerciseIndex);