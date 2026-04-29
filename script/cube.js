import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";


// ─── Disposition des touches sur les faces ────────────────────────────────────
// Chaque face est un tableau 4×4 de labels (chaîne vide = touche absente).

const faceLeft   = [["alt","OS","ctrl","shift"],[",<",".>","/?",""],[":;","'","Tab","`~"],["{[","]}","|",""]];
const faceRight  = [["","V","F","R"],["","C","D","E"],["","X","S","W"],["","Z","A","Q"]];
const faceBack   = [["U","J","B",""],["I","K","N",""],["O","L","M",""],["P","","",""]];
const faceFront  = [["shift","ctrl","OS","alt"],["7&","8*","9(","0)"],["4$","5%","6^","-_"],["1!","2@","3#","+="]];
const faceTop    = [["Sp","G","T","CpLk"],["Sp","Left","Up","Y"],["Sp","Dwn","Right","H"],["Entr","Entr","Bks","Bks"]];
const faceBottom = [["","","",""],["","","",""],["","","",""],["","","",""]];

// ─── État visuel du cube ──────────────────────────────────────────────────────

let currentTargetKey = null; // Lettre cible mise en évidence sur le cube
let cubeMaterials    = [];   // Matériaux des 6 faces du cube
let cubeMode = localStorage.getItem("cubeMode") || "transparent"; // "transparent" ou "unfolded"
let rightFaceMesh = null;    // Plan déplié face droite (mode unfolded)
let backFaceMesh  = null;    // Plan déplié face arrière (mode unfolded)

// ─── Mise à jour de la touche cible ──────────────────────────────────────────
// Appelée par session_logic.js via window.updateCurrentTargetKey().

window.updateCurrentTargetKey = function () {
    const s = window._session;
    if (!s) return;
    currentTargetKey = s.currentIndex < s.spans.length
        ? s.spans[s.currentIndex].textContent.toUpperCase()
        : null;
    updateCubeTextures();
};

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
    const keyWidth  = (SIZE - padding * 2 - gap * (cols - 1)) / cols;
    const keyHeight = (SIZE - padding * 2 - gap * (rows - 1)) / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const letter = layout[r][c];
            const x = padding + c * (keyWidth + gap);
            const y = padding + r * (keyHeight + gap);
            const isTarget = letter && letter.toUpperCase() === currentTargetKey;

            // Ombre portée
            ctx.shadowColor   = "rgba(0,0,0,0.45)";
            ctx.shadowBlur    = 8;
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
            ctx.textAlign    = "center";
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
// unfolded : cube opaque + deux plans flottants pour les faces cachées.

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
        backFaceMesh.position.set(8, -3, 0);
        backFaceMesh.rotation.y = -0.18;
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

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    camera.position.set(-6, 6, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Redimensionnement adaptatif — d contrôle le zoom (plus grand = plus petit cube)
    function resizeRenderer() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const d = 5; 
        const aspect = w / h;
        renderer.setSize(w, h);
        camera.left   = -d * aspect;
        camera.right  =  d * aspect;
        camera.top    =  d;
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

// ─── Point d'entrée ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    initCube();
});
