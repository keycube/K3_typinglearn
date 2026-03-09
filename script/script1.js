import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";


// Configuration de la session

const TOTAL_EXERCISES_SESSION = 11;
const SESSION_DURATION = 2100;


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


// Chronomètre

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


// Barre progression

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


// Chargement exercice

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


// Gestion frappe

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


// Fin exercice

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

    if (currentExerciseIndex < exercises.length) {

        setTimeout(() => {
            loadExercise(currentExerciseIndex);
        }, 800);

    } else {

        setTimeout(() => {
            window.location.href = "code/part2.html";
        }, 1000);
    }
}


// CUBE

function initCube() {

    const container = document.getElementById("cube-container");

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setClearColor(0x000000, 0);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));


    function createKeyboardFace(layout) {

        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 512, 512);

        const rows = layout.length;
        const cols = layout[0].length;

        const padding = 40;
        const gap = 15;

        const keyWidth =
            (512 - padding * 2 - gap * (cols - 1)) / cols;

        const keyHeight =
            (512 - padding * 2 - gap * (rows - 1)) / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {

                const letter = layout[r][c];

                const x =
                    padding + c * (keyWidth + gap);
                const y =
                    padding + r * (keyHeight + gap);

                ctx.fillStyle = "#e0e0e0";
                ctx.fillRect(x, y, keyWidth, keyHeight);

                ctx.strokeStyle = "#999";
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, keyWidth, keyHeight);

                ctx.fillStyle = "#000";
                ctx.font = "bold 32px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.fillText(
                    letter,
                    x + keyWidth / 2,
                    y + keyHeight / 2
                );
            }
        }

        return new THREE.CanvasTexture(canvas);
    }


    const faceFront = [
        ["alt","OS","ctrl","shift"],
        [",<",".>","/?",""],
        [":;","'","Tab","`~"],
        ["{[","]}","|",""]
    ];

    const faceBack = [
        ["","V","F","R"],
        ["","C","D","E"],
        ["","X","S","W"],
        ["","Z","A","Q"]
    ];

    const faceRight = [
        ["U","J","B",""],
        ["I","K","N",""],
        ["O","L","M",""],
        ["P","","",""]
    ];

    const faceLeft = [
        ["shift","ctrl","OS","alt"],
        ["7&","8*","9(","0)"],
        ["4$","5%","6^","-_"],
        ["1!","2@","3#","+="]
    ];

    const faceTop = [
        ["Sp","G","T","CpLk"],
        ["Sp","Left","Up","Y"],
        ["Sp","Dwn","Right","H"],
        ["Entr","Entr","Bks","Bks"]
    ];

    const faceBottom = [
        ["","","",""],
        ["","","",""],
        ["","","",""],
        ["","","",""]
    ];


    const materials = [
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceLeft) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceTop) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBottom) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceFront) }),
        new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack) })
    ];


    const geometry = new THREE.BoxGeometry(4,4,4);
    const cube = new THREE.Mesh(geometry, materials);

    cube.rotation.x = 0.5;
    cube.rotation.y = 0.8;

    scene.add(cube);


    // FACES SURÉLEVÉES (CORRECTION)

    const planeGeometry = new THREE.PlaneGeometry(4,4);

    const rightFace = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshStandardMaterial({
            map: createKeyboardFace(faceRight),
            side: THREE.DoubleSide
        })
    );

    rightFace.position.set(3.2,0,0);
    rightFace.rotation.y = -Math.PI/2;
    cube.add(rightFace);


    const backFace = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshStandardMaterial({
            map: createKeyboardFace(faceBack),
            side: THREE.DoubleSide
        })
    );

    backFace.position.set(0,0,-3.2);
    backFace.rotation.y = Math.PI;
    cube.add(backFace);


    renderer.render(scene, camera);
}

initCube();


// Fin session

function endSession() {

    clearInterval(timerInterval);
    window.location.href = "code/resultat.html";
}


// Initialisation

updateGlobalProgress();
loadExercise(currentExerciseIndex);
