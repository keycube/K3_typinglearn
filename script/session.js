import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

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
            { name: "Courtes",        sentences: ["They play"] },
            { name: "Intermédiaires", sentences: ["I need to finish this today"] },
            { name: "Longues",        sentences: ["She told me that everything would be fine if we stayed focused"] }
        ],
        nextPage: "code/resultat.html",
        mode: "sentences"
    }
};

// ─── Détection de la partie & initialisation du DOM ──────────────────────────
// Le numéro de partie est lu depuis le paramètre URL (?part=1/2/3).

const partNumber = parseInt(new URLSearchParams(location.search).get("part")) || 1;
const part       = PARTS[partNumber];

if (!part) {
    // Partie inconnue : redirection immédiate vers l'accueil
    console.error(`Partie "${partNumber}" introuvable.`);
    location.href = "index.html";
}

// Propagation du numéro de partie sur le <body> (utilisé par le reste du script)
document.body.dataset.part = partNumber;

// Mise à jour du <title> de l'onglet
document.title = part.title;

// Titre affiché dans le header
document.getElementById("partTitle").textContent = part.title;

// Génération des pastilles d'exercices (ex1, ex2, …)
const exerciseList = document.getElementById("exerciseList");
part.exercises.forEach((ex, i) => {
    const span = document.createElement("span");
    span.id          = `ex${i + 1}`;
    span.textContent = ex.name;
    exerciseList.appendChild(span);
});

const exercises = part.exercises;

// ─── État de la session ───────────────────────────────────────────────────────

let currentExerciseIndex = 0; // Index de l'exercice actuel dans la partie
let currentSubIndex      = 0; // Index du mot/phrase dans l'exercice (modes words/sentences)
let currentIndex         = 0; // Position du curseur dans le texte affiché
let spans                = []; // Références aux <span> de chaque caractère

// Métriques de frappe collectées durant l'exercice
let exerciseStartTime = null; // Timestamp du premier caractère frappé
let allKeyTimestamps  = [];   // Timestamps de chaque frappe correcte
let allTypedChars     = [];   // Caractères effectivement tapés
let allExpectedChars  = [];   // Caractères attendus correspondants

// Variables liées au cube Three.js
let currentTargetKey = null;    // Lettre cible mise en évidence sur le cube
let cubeMaterials    = [];      // Matériaux des 6 faces du cube
let cubeMode         = localStorage.getItem("cubeMode") || "transparent"; // "transparent" ou "unfolded"
let rightFaceMesh    = null;    // Face droite dépliée (mode unfolded)
let backFaceMesh     = null;    // Face arrière dépliée (mode unfolded)

// ─── Affichage du nom d'utilisateur ───────────────────────────────────────────

const username    = localStorage.getItem("username");
const usernameEl  = document.getElementById("usernameDisplay");
if (usernameEl) usernameEl.textContent = username || "Invité";

// ─── Chronomètre global ───────────────────────────────────────────────────────
// Le temps est dans localStorage pour survivre aux changements de page.

let seconds = parseInt(localStorage.getItem("globalTime")) || 0;
updateTimerDisplay();

const timerInterval = setInterval(() => {
    seconds++;
    localStorage.setItem("globalTime", seconds);
    updateTimerDisplay();
    if (seconds >= SESSION_DURATION) endSession();
}, 1000);

// Met à jour l'affichage du timer au format MM:SS. 
function updateTimerDisplay() {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    document.getElementById("timer").textContent =
        String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

// ─── Barre de progression globale ─────────────────────────────────────────────

// Recalcule et affiche le pourcentage d'avancement sur l'ensemble de la session. 
function updateGlobalProgress() {
    const completed = parseInt(localStorage.getItem("completedExercises")) || 0;
    const percent   = Math.floor((completed / TOTAL_EXERCISES_SESSION) * 100);
    document.getElementById("progressBar").style.width   = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";
}

// ─── Curseur visuel ───────────────────────────────────────────────────────────


 //Positionne le curseur DOM sous le caractère courant (ou après le dernier s'il n'y a plus rien à taper).
function updateCursor() {
    const cursor = document.getElementById("cursor");
    if (!cursor || !spans.length) return;

    const containerRect = document.getElementById("textDisplay").getBoundingClientRect();

    if (currentIndex >= spans.length) {
        // Fin du texte : placer le curseur juste après le dernier caractère
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

// Affiche le texte/mot/phrase courant sous forme de <span> individuels et réinitialise la position du curseur.
function loadContent() {
    const textDisplay = document.getElementById("textDisplay");
    textDisplay.innerHTML = "";
    currentIndex = 0;

    // Sélection du texte selon le mode de la partie
    const ex = exercises[currentExerciseIndex];
    let text = "";
    if      (part.mode === "letters")   text = ex.text;
    else if (part.mode === "words")     text = ex.words[currentSubIndex];
    else if (part.mode === "sentences") text = ex.sentences[currentSubIndex];

    // Création d'un <span> par caractère pour le suivi individuel
    text.split("").forEach(char => {
        const span = document.createElement("span");
        span.textContent = char;
        textDisplay.appendChild(span);
    });

    spans = textDisplay.querySelectorAll("span");

    // Ajout du curseur visuel dans le conteneur
    const cursor = document.createElement("div");
    cursor.id = "cursor";
    textDisplay.appendChild(cursor);

    // Court délai pour que le DOM soit rendu avant de positionner le curseur
    setTimeout(() => {
        updateCursor();
        updateCurrentTargetKey();
    }, 50);
}

// ─── Distance de Levenshtein ──────────────────────────────────────────────────

//Calcule la distance d'édition entre deux chaînes (insertions, suppressions, substitutions) — utilisée pour estimer le taux d'erreur.
 
function levenshtein(a, b) {
    const m = a.length, n = b.length;

    // Initialisation de la matrice DP (ligne 0 = "", colonne 0 = "")
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]                              // Caractères identiques
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]); // Meilleure opération
        }
    }
    return dp[m][n];
}

// ─── Calcul des métriques ─────────────────────────────────────────────────────

//Calcule les métriques de performance à la fin d'un exercice :
 // wpm : mots par minute (1 mot = 5 caractères)
 // errorRate : taux d'erreur en % (via Levenshtein)
 //avgReactionTime : temps moyen entre deux frappes correctes (ms)
 
function computeMetrics() {
    const typedText    = allTypedChars.join("");
    const expectedText = allExpectedChars.join("");
    const elapsedMinutes = exerciseStartTime
        ? (performance.now() - exerciseStartTime) / 60000
        : 1;

    const wpm       = elapsedMinutes > 0
        ? Math.round((allKeyTimestamps.length / 5) / elapsedMinutes)
        : 0;

    const dist      = levenshtein(typedText, expectedText);
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
    // Empêcher le retour arrière de naviguer dans l'historique
    if (e.key === "Backspace") e.preventDefault();

    // Raccourci : '&' passe l'exercice en cours
    if (e.key === "&") { finishExercise(); return; }

    // Ignorer si le texte est vide ou terminé
    if (!spans.length || currentIndex >= spans.length) return;

    // Ignorer les touches spéciales (sauf espace)
    if (e.key.length > 1 && e.key !== " ") return;

    // Démarrage du chrono au premier caractère
    if (exerciseStartTime === null) exerciseStartTime = performance.now();

    const now      = performance.now();
    const expected = spans[currentIndex].textContent;

    allTypedChars.push(e.key);
    allExpectedChars.push(expected);

    if (e.key === expected) {
        // Frappe correcte
        spans[currentIndex].classList.remove("incorrect");
        spans[currentIndex].classList.add("correct");
        allKeyTimestamps.push(now);
        currentIndex++;
        updateCursor();
        updateCurrentTargetKey();

        if (currentIndex === spans.length) onContentComplete();
    } else {
        // Frappe incorrecte : marquer visuellement sans avancer
        spans[currentIndex].classList.add("incorrect");
    }
});

// ─── Fin d'un contenu (texte / mot / phrase) ──────────────────────────────────

//Appelée quand tous les caractères du contenu courant ont été saisis.
//Passe au sous-élément suivant ou termine l'exercice selon le mode.
 
function onContentComplete() {
    if (part.mode === "letters") {
        finishExercise();
        return;
    }

    // Modes words et sentences : items multiples dans un même exercice
    const items = part.mode === "words"
        ? exercises[currentExerciseIndex].words
        : exercises[currentExerciseIndex].sentences;

    currentSubIndex++;

    if (currentSubIndex < items.length) {
        // Pause courte avant d'afficher l'item suivant
        setTimeout(loadContent, part.mode === "words" ? 300 : 400);
    } else {
        finishExercise();
    }
}

// ─── Fin d'exercice ───────────────────────────────────────────────────────────

//Enregistre les métriques de l'exercice terminé, met à jour la progression et charge le suivant (ou change de page si la partie est terminée).

async function finishExercise() {
    // Marquer l'exercice comme complété dans la liste visuelle
    const exEl = document.getElementById("ex" + (currentExerciseIndex + 1));
    if (exEl) exEl.classList.add("done");

    // Calcul et persistance des métriques
    const metrics = computeMetrics();
    const order   = parseInt(localStorage.getItem("exerciseOrder") || "0");
    localStorage.setItem("exerciseOrder", order + 1);

    const stats = JSON.parse(sessionStorage.getItem("sessionStats") || "[]");
    stats.push({
        part:             partNumber,
        order,
        exerciseName:     exercises[currentExerciseIndex].name,
        wpm:              metrics.wpm,
        errorRate:        metrics.errorRate,
        avgReactionTime:  metrics.avgReactionTime
    });
    sessionStorage.setItem("sessionStats", JSON.stringify(stats));

    // Incrémenter le compteur global d'exercices complétés
    const completed = (parseInt(localStorage.getItem("completedExercises")) || 0) + 1;
    localStorage.setItem("completedExercises", completed);
    updateGlobalProgress();

    // Réinitialisation des métriques pour le prochain exercice
    exerciseStartTime = null;
    allKeyTimestamps  = [];
    allTypedChars     = [];
    allExpectedChars  = [];
    currentSubIndex   = 0;

    currentExerciseIndex++;

    if (currentExerciseIndex < exercises.length) {
        // Il reste des exercices dans cette partie
        setTimeout(loadContent, 800);
    } else if (part.nextPage === "code/resultat.html") {
        // Dernière partie : terminer la session
        setTimeout(() => endSession(), 500);
    } else {
        // Passer à la partie suivante
        setTimeout(() => { window.location.href = part.nextPage; }, 1000);
    }
}

// ─── Fin de session ───────────────────────────────────────────────────────────

//Arrête le timer, nettoie localStorage et redirige vers la page de résultats.

async function endSession() {
    clearInterval(timerInterval);
    sessionStorage.setItem("sessionTotalTime", seconds);
    localStorage.removeItem("completedExercises");
    localStorage.removeItem("globalTime");
    window.location.href = "code/resultat.html";
}

// ─── Disposition des touches sur les faces du cube ────────────────────────────
// Chaque face est un tableau 4×4 de labels de touches (chaînes vides = touche absente).

const faceLeft   = [["alt","OS","ctrl","shift"],[",<",".>","/?",""],[":;","'","Tab","`~"],["{[","]}","|",""]];
const faceRight  = [["","V","F","R"],["","C","D","E"],["","X","S","W"],["","Z","A","Q"]];
const faceBack   = [["U","J","B",""],["I","K","N",""],["O","L","M",""],["P","","",""]];
const faceFront  = [["shift","ctrl","OS","alt"],["7&","8*","9(","0)"],["4$","5%","6^","-_"],["1!","2@","3#","+="]];
const faceTop    = [["Sp","G","T","CpLk"],["Sp","Left","Up","Y"],["Sp","Dwn","Right","H"],["Entr","Entr","Bks","Bks"]];
const faceBottom = [["","","",""],["","","",""],["","","",""],["","","",""]];

// ─── Mise à jour de la touche cible ──────────────────────────────────────────

// Identifie la prochaine touche à frapper et demande la mise à jour des textures du cube pour la mettre en évidence.

function updateCurrentTargetKey() {
    currentTargetKey = currentIndex < spans.length
        ? spans[currentIndex].textContent.toUpperCase()
        : null;
    updateCubeTextures();
}

// ─── Rendu d'une face du cube ─────────────────────────────────────────────────

//Génère une texture canvas représentant une face de clavier.
//La touche correspondant à currentTargetKey est mise en évidence en jaune.
 
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

    // Fond semi-transparent de la face
    ctx.fillStyle = "rgba(150,150,150,0.15)";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const rows     = layout.length;
    const cols     = layout[0].length;
    const padding  = 40;
    const gap      = 15;
    const keyWidth  = (SIZE - padding * 2 - gap * (cols - 1)) / cols;
    const keyHeight = (SIZE - padding * 2 - gap * (rows - 1)) / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const letter   = layout[r][c];
            const x        = padding + c * (keyWidth + gap);
            const y        = padding + r * (keyHeight + gap);
            const isTarget = letter && letter.toUpperCase() === currentTargetKey;

            // Ombre portée sous la touche
            ctx.shadowColor   = "rgba(0,0,0,0.45)";
            ctx.shadowBlur    = 8;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 5;

            // Fond de la touche (jaune si cible, blanc sinon)
            ctx.fillStyle = isTarget ? "#ffcc00" : "rgba(255,255,255,0.5)";
            ctx.beginPath();
            ctx.roundRect(x, y, keyWidth, keyHeight, 6);
            ctx.fill();

            // Désactiver l'ombre pour les contours
            ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;

            // Reflet haut-gauche (bord clair)
            ctx.strokeStyle = isTarget ? "#ffe066" : "#ffffff";
            ctx.lineWidth   = 3;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + keyHeight);
            ctx.lineTo(x + 6, y + 6);
            ctx.lineTo(x + keyWidth, y + 6);
            ctx.stroke();

            // Ombre bas-droite (bord foncé)
            ctx.strokeStyle = isTarget ? "#c8960a" : "#aaaaaa";
            ctx.lineWidth   = 3;
            ctx.beginPath();
            ctx.moveTo(x + keyWidth - 2, y + 6);
            ctx.lineTo(x + keyWidth - 2, y + keyHeight - 2);
            ctx.lineTo(x + 6, y + keyHeight - 2);
            ctx.stroke();

            // Label de la touche
            ctx.fillStyle    = isTarget ? "#333" : "#222";
            ctx.font         = `bold ${isTarget ? 34 : 30}px Arial`;
            ctx.textAlign    = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(letter, x + keyWidth / 2, y + keyHeight / 2);
        }
    }

    return new THREE.CanvasTexture(canvas);
}

// ─── Rafraîchissement des textures ───────────────────────────────────────────

// Régénère les textures de toutes les faces du cube (et des plans dépliés en mode unfolded) pour refléter la nouvelle touche cible.

function updateCubeTextures() {
    if (!cubeMaterials.length) return;

    // Ordre des faces : back, front, top, bottom, left, right
    const layouts = [faceBack, faceFront, faceTop, faceBottom, faceLeft, faceRight];

    // En mode transparent, les faces back et right sont vues à travers le cube)
    const mirrors = cubeMode === "transparent"
        ? [true, false, false, false, false, true]
        : [false, false, false, false, false, false];

    cubeMaterials.forEach((mat, i) => {
        mat.map = createKeyboardFace(layouts[i], mirrors[i]);
        mat.map.needsUpdate = true;
        mat.needsUpdate = true;
    });

    // Mise à jour des faces dépliées (mode unfolded uniquement)
    if (rightFaceMesh) {
        rightFaceMesh.material.map = createKeyboardFace(faceRight);
        rightFaceMesh.material.map.needsUpdate = true;
    }
    if (backFaceMesh) {
        backFaceMesh.material.map = createKeyboardFace(faceBack);
        backFaceMesh.material.map.needsUpdate = true;
    }
}

// ─── Initialisation du cube Three.js ─────────────────────────────────────────


  //Crée la scène Three.js, le cube clavier et le bouton de bascule de mode.
  //Lance la boucle de rendu.
 
function initCube() {
    const container = document.getElementById("cube-container");
    if (!container) return;

    // Scène, caméra orthographique et renderer transparent
    const scene    = new THREE.Scene();
    const camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    camera.position.set(-6, 6, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Adapte la caméra et le renderer à la taille du conteneur. 
    function resizeRenderer() {
        const w      = container.clientWidth;
        const h      = container.clientHeight;
        const d      = 4;
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

    // Géométrie du cube (partagée entre le mesh et les arêtes)
    const boxGeometry = new THREE.BoxGeometry(4, 4, 4);
    const cube = new THREE.Mesh(boxGeometry, []);
    scene.add(cube);

    // Arêtes du cube pour un rendu plus lisible
    const edges = new THREE.EdgesGeometry(boxGeometry);
    scene.add(new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 2 })
    ));

    //Applique le mode d'affichage courant (transparent ou déplié).
     //En mode transparent : cube semi-opaque avec faces en miroir.
     //En mode déplié : cube opaque + deux plans (face droite et arrière) positionnés à côté.
     
    function applyMode() {
        // Supprimer les éventuels plans dépliés de la scène
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
            // Mode déplié : cube opaque
            cubeMaterials = [
                new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack) }),
                new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceFront) }),
                new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceTop) }),
                new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBottom) }),
                new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceLeft) }),
                new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight) })
            ];

            // Ajout des plans flottants représentant les faces dépliées
            const plane = new THREE.PlaneGeometry(4, 4);

            backFaceMesh = new THREE.Mesh(
                plane,
                new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceBack), side: THREE.DoubleSide })
            );
            backFaceMesh.position.set(7, -2.5, 1);
            backFaceMesh.rotation.z = 0.12;
            scene.add(backFaceMesh);

            rightFaceMesh = new THREE.Mesh(
                plane,
                new THREE.MeshStandardMaterial({ map: createKeyboardFace(faceRight), side: THREE.DoubleSide })
            );
            rightFaceMesh.position.set(-7.5, 2.5, 0);
            scene.add(rightFaceMesh);
        }

        cube.material = cubeMaterials;
    }

    applyMode();

    // Bouton de bascule entre les deux modes de vue
    const btn = document.getElementById("btnCubeMode");
    if (btn) {
        btn.textContent = cubeMode === "transparent" ? "Vue dépliée" : "Vue transparente";
        btn.addEventListener("click", () => {
            cubeMode = cubeMode === "transparent" ? "unfolded" : "transparent";
            localStorage.setItem("cubeMode", cubeMode);
            btn.textContent = cubeMode === "transparent" ? "Vue dépliée" : "Vue transparente";
            applyMode();
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
    updateGlobalProgress();
    loadContent();
});
