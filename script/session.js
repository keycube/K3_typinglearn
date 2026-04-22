import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";


// SECTION 1 — SESSION


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
            { name: "9 lettres",   words: ["important","language","experience","business","community","everything","education"] }
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
        cursor.style.top = (lastRect.top   - containerRect.top)  + "px";
    } else {
        const rect = spans[currentIndex].getBoundingClientRect();
        cursor.style.left = (rect.left - containerRect.left) + "px";
        cursor.style.top = (rect.top  - containerRect.top)  + "px";
    }
}

// ─── Chargement du contenu ────────────────────────────────────────────────────

function loadContent() {
    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";
    currentIndex = 0;

    const ex = exercises[currentExerciseIndex];
    let text = "";
    if (part.mode === "letters")  text = ex.text;
    else if (part.mode === "words") text = ex.words[currentSubIndex];
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
        updateCurrentTargetKey();
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
    const typedText = allTypedChars.join("");
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
        updateCurrentTargetKey();
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
    allKeyTimestamps = [];
    allTypedChars = [];
    allExpectedChars = [];
    currentSubIndex = 0;
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


// SECTION 2 — VISUEL CUBE 


// ─── Disposition des touches sur les faces ────────────────────────────────────
// Chaque face est un tableau 4×4 de labels (chaîne vide = touche absente).

const faceLeft = [["alt","OS","ctrl","shift"],[",<",".>","/?",""],[":;","'","Tab","`~"],["{[","]}","|",""]];
const faceRight = [["","V","F","R"],["","C","D","E"],["","X","S","W"],["","Z","A","Q"]];
const faceBack = [["U","J","B",""],["I","K","N",""],["O","L","M",""],["P","","",""]];
const faceFront = [["shift","ctrl","OS","alt"],["7&","8*","9(","0)"],["4$","5%","6^","-_"],["1!","2@","3#","+="]];
const faceTop = [["Sp","G","T","CpLk"],["Sp","Left","Up","Y"],["Sp","Dwn","Right","H"],["Entr","Entr","Bks","Bks"]];
const faceBottom = [["","","",""],["","","",""],["","","",""],["","","",""]];

// ─── État visuel du cube ──────────────────────────────────────────────────────

let currentTargetKey = null; // Lettre cible mise en évidence sur le cube
let cubeMaterials = [];   // Matériaux des 6 faces du cube
let cubeMode = localStorage.getItem("cubeMode") || "transparent"; // "transparent" ou "unfolded"
let rightFaceMesh = null; // Plan déplié face droite (mode unfolded)
let backFaceMesh = null; // Plan déplié face arrière (mode unfolded)

// ─── Mise à jour de la touche cible ──────────────────────────────────────────

function updateCurrentTargetKey() {
    currentTargetKey = currentIndex < spans.length
        ? spans[currentIndex].textContent.toUpperCase()
        : null;
    updateCubeTextures();
}

// ─── Génération d'une texture de face ────────────────────────────────────────
// Dessine les touches sur un canvas et retourne une CanvasTexture Three.js.
// mirror=true retourne horizontalement la texture (faces vues de derrière).

function createKeyboardFace(layout, mirror = false) {
    const SIZE = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, SIZE, SIZE);

    if (mirror) {
        ctx.translate(SIZE, 0);
        ctx.scale(-1, 1);
    }

    ctx.fillStyle = "rgba(150,150,150,0.15)";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const rows = layout.length;
    const cols = layout[0].length;
    const padding = 40;
    const gap = 15;
    const keyWidth = (SIZE - padding * 2 - gap * (cols - 1)) / cols;
    const keyHeight = (SIZE - padding * 2 - gap * (rows - 1)) / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const letter = layout[r][c];
            const x = padding + c * (keyWidth + gap);
            const y = padding + r * (keyHeight + gap);
            const isTarget = letter && letter.toUpperCase() === currentTargetKey;

            // Ombre portée
            ctx.shadowColor = "rgba(0,0,0,0.45)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 5;

            // Corps de la touche
            ctx.fillStyle = isTarget ? "#ffcc00" : "rgba(255,255,255,0.5)";
            ctx.beginPath();
            ctx.roundRect(x, y, keyWidth, keyHeight, 6);
            ctx.fill();

            ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;

            // Reflet haut-gauche
            ctx.strokeStyle = isTarget ? "#ffe066" : "#ffffff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + keyHeight);
            ctx.lineTo(x + 6, y + 6);
            ctx.lineTo(x + keyWidth, y + 6);
            ctx.stroke();

            // Ombre bas-droite
            ctx.strokeStyle = isTarget ? "#c8960a" : "#aaaaaa";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + keyWidth - 2, y + 6);
            ctx.lineTo(x + keyWidth - 2, y + keyHeight - 2);
            ctx.lineTo(x + 6, y + keyHeight - 2);
            ctx.stroke();

            // Label
            ctx.fillStyle = isTarget ? "#333" : "#222";
            ctx.font = `bold ${isTarget ? 34 : 30}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(letter, x + keyWidth / 2, y + keyHeight / 2);
        }
    }

    return new THREE.CanvasTexture(canvas);
}

// ─── Rafraîchissement des textures ───────────────────────────────────────────
// Régénère les textures de toutes les faces pour refléter la nouvelle touche cible.

function updateCubeTextures() {
    if (!cubeMaterials.length) return;

    const layouts = [faceBack, faceFront, faceTop, faceBottom, faceLeft, faceRight];
    const mirrors = cubeMode === "transparent"
        ? [true, false, false, false, false, true]
        : [false, false, false, false, false, false];

    cubeMaterials.forEach((mat, i) => {
        mat.map = createKeyboardFace(layouts[i], mirrors[i]);
        mat.map.needsUpdate = true;
        mat.needsUpdate     = true;
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

// ─── Application du mode de visualisation ────────────────────────────────────
// transparent : cube semi-opaque, toutes les faces visibles à travers.
// unfolded    : cube opaque + deux plans flottants pour les faces cachées.

function applyMode(scene, cube) {
    if (rightFaceMesh) { scene.remove(rightFaceMesh); rightFaceMesh = null; }
    if (backFaceMesh)  { scene.remove(backFaceMesh);  backFaceMesh  = null; }

    if (cubeMode === "transparent") {
        cubeMaterials = [
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack,   true),  transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceFront,  false), transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceTop,    false), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBottom, false), transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceLeft,   false), transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight,  true),  transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
        ];
    } else {
        cubeMaterials = [
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack) }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceFront) }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceTop) }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBottom) }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceLeft) }),
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight) })
        ];

        const plane = new THREE.PlaneGeometry(4, 4);

        backFaceMesh = new THREE.Mesh(plane,
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack), side: THREE.DoubleSide })
        );
        backFaceMesh.position.set(7, -3.5, 0);
        backFaceMesh.rotation.z = -0.11;
        scene.add(backFaceMesh);

        rightFaceMesh = new THREE.Mesh(plane,
            new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight), side: THREE.DoubleSide })
        );
        rightFaceMesh.position.set(-7.5, 3.5, 0);
        scene.add(rightFaceMesh);
    }

    cube.material = cubeMaterials;
}

// ─── Initialisation du cube Three.js ─────────────────────────────────────────

function initCube() {
    const container = document.getElementById("cube-container");
    if (!container) return;

    // Scène, caméra orthographique et renderer transparent
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    camera.position.set(-6, 6, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Redimensionnement adaptatif
    function resizeRenderer() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const d = 4;
        const aspect = w / h;
        renderer.setSize(w, h);
        camera.left = -d * aspect;
        camera.right =  d * aspect;
        camera.top =  d;
        camera.bottom = -d;
        camera.updateProjectionMatrix();
    }
    resizeRenderer();
    window.addEventListener("resize", resizeRenderer);

    // Éclairage
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 6);
    scene.add(dirLight);

    // Cube et arêtes
    const boxGeometry = new THREE.BoxGeometry(4, 4, 4);
    const cube = new THREE.Mesh(boxGeometry, []);
    scene.add(cube);
    scene.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeometry),
        new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 2 })
    ));

    // Application du mode initial
    applyMode(scene, cube);

    // Bouton de bascule entre les modes
    const btn = document.getElementById("btnCubeMode");
    if (btn) {
        btn.textContent = cubeMode === "transparent" ? "Vue dépliée" : "Vue transparente";
        btn.addEventListener("click", () => {
            cubeMode = cubeMode === "transparent" ? "unfolded" : "transparent";
            localStorage.setItem("cubeMode", cubeMode);
            btn.textContent = cubeMode === "transparent" ? "Vue dépliée" : "Vue transparente";
            applyMode(scene, cube);
            updateCubeTextures();
        });
    }

    // Boucle de rendu
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}


// POINT D'ENTRÉE


document.addEventListener("DOMContentLoaded", () => {
    initCube();
    updateGlobalProgress();
    loadContent();
});