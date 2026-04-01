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
let currentTargetKey = null;

// Cube refs
let cubeMaterials = [];
let rightFaceMesh = null;
let backFaceMesh = null;

// Layouts globaux
const faceFront = [["alt","OS","ctrl","shift"],[",<",".>","/?",""],[":;","'","Tab","`~"],["{[","]}","|",""]];
const faceBack = [["","V","F","R"],["","C","D","E"],["","X","S","W"],["","Z","A","Q"]];
const faceRight = [["U","J","B",""],["I","K","N",""],["O","L","M",""],["P","","",""]];
const faceLeft = [["shift","ctrl","OS","alt"],["7&","8*","9(","0)"],["4$","5%","6^","-_"],["1!","2@","3#","+="]];
const faceTop = [["Sp","G","T","CpLk"],["Sp","Left","Up","Y"],["Sp","Dwn","Right","H"],["Entr","Entr","Bks","Bks"]];
const faceBottom = [["","","",""],["","","",""],["","","",""],["","","",""]];

// Métriques
let exerciseStartTime = null;
let keyTimestamps = [];       
let typedChars = [];          
let errorCount = 0;

// User
const username = localStorage.getItem("username");
document.getElementById("usernameDisplay").textContent = username || "Invité";

// Timer
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



function finishExercise() {
    // Mise à jour de la progression
    let completed = parseInt(localStorage.getItem("completedExercises")) || 0;
    completed++;
    localStorage.setItem("completedExercises", completed);
    updateGlobalProgress();

    // Incrément de l'index d'exercice
    currentExerciseIndex++;

    if (currentExerciseIndex < exercises.length) {

        loadExercise(currentExerciseIndex);
    } else {

        console.log("Partie finie");
        
        endSession(); 

        window.location.href = "code/part2.html";

        setTimeout(() => {
            if (window.location.pathname.indexOf("part2.html") === -1) {
                window.location.href = "part2.html";
            }
        }, 500);
    }
}

function endSession() {
    clearInterval(timerInterval);
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

// Load exercice
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

    setTimeout(() => {
        updateCursor();
        updateCurrentTargetKey();
    }, 50);
}

// Target key
function updateCurrentTargetKey() {
    if (currentIndex < spans.length) {
        currentTargetKey = spans[currentIndex].textContent.toUpperCase();
    } else {
        currentTargetKey = null;
    }
    updateCubeTextures();
}

// Input
document.addEventListener("keydown", (e) => {
    if (e.key === "Backspace") e.preventDefault();
    if (!spans.length || currentIndex >= spans.length) return;
    if (e.key.length > 1 && e.key !== " ") return;

    if (exerciseStartTime === null) exerciseStartTime = performance.now();

    const now = performance.now();
    const expected = spans[currentIndex].textContent;

    typedChars.push(e.key);

    if (e.key === expected) {
        spans[currentIndex].classList.remove("incorrect");
        spans[currentIndex].classList.add("correct");
        keyTimestamps.push(now);
        currentIndex++;

        updateCurrentTargetKey();
        updateCursor();

        if (currentIndex === spans.length) {
           
            finishExercise();
        }
    } else {
        errorCount++;
        spans[currentIndex].classList.add("incorrect");
    }
});

// Texture
function createKeyboardFace(layout) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; 
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = "rgba(150,150,150,0.15)";
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
            const isTarget = letter && letter.toUpperCase() === currentTargetKey;

            // Ombre portée (relief)
            ctx.shadowColor = "rgba(0,0,0,0.45)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 5;

            // Corps de la touche
            ctx.fillStyle = isTarget ? "#ffcc00" : "rgba(255,255,255,0.5)";
            ctx.beginPath();
            ctx.roundRect(x, y, keyWidth, keyHeight, 6);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Bord haut
            ctx.strokeStyle = isTarget ? "#ffe066" : "#ffffff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + keyHeight);
            ctx.lineTo(x + 6, y + 6);
            ctx.lineTo(x + keyWidth, y + 6);
            ctx.stroke();

            // Bord bas 
            ctx.strokeStyle = isTarget ? "#c8960a" : "#aaaaaa";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + keyWidth - 2, y + 6);
            ctx.lineTo(x + keyWidth - 2, y + keyHeight - 2);
            ctx.lineTo(x + 6, y + keyHeight - 2);
            ctx.stroke();

            // Lettre
            ctx.fillStyle = isTarget ? "#333" : "#222";
            ctx.font = `bold ${isTarget ? 34 : 30}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(letter, x + keyWidth / 2, y + keyHeight / 2);
        }
    }

    return new THREE.CanvasTexture(canvas);
}

// Update textures
function updateCubeTextures() {
    if (!cubeMaterials.length) return;

    const layouts = [faceBack, faceFront, faceTop, faceBottom, faceLeft, faceRight];

    cubeMaterials.forEach((mat, i) => {
        mat.map = createKeyboardFace(layouts[i]);
        mat.map.needsUpdate = true;
        mat.needsUpdate = true;
    });

    if (rightFaceMesh) {
        rightFaceMesh.material.map = createKeyboardFace(faceRight);
        rightFaceMesh.material.map.needsUpdate = true;
    }

    if (backFaceMesh) {
        backFaceMesh.material.map = createKeyboardFace(faceBack);
        backFaceMesh.material.map.needsUpdate = true;
    }
}

// Cube
function initCube() {
    const container = document.getElementById("cube-container");
    const scene = new THREE.Scene();

    const camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,1000);
    camera.position.set(-6, 6, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    function resizeRenderer() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        renderer.setSize(width, height);

        const aspect = width / height;
        const d = 4;

        camera.left = -d * aspect;
        camera.right = d * aspect;
        camera.top = d;
        camera.bottom = -d;

        camera.updateProjectionMatrix();
    }

    resizeRenderer();
    window.addEventListener("resize", resizeRenderer);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 6);
    scene.add(dirLight);

    cubeMaterials = [
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack),   transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceFront),  transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceTop),    transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBottom), transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceLeft),   transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight),  transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    ];

    const cube = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), cubeMaterials);
    scene.add(cube);

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