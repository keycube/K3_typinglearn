# K3_typinglearn

 https://keycube.github.io/K3_typinglearn/

K3 Typing Learn est une application web d'entraînement à la dactylographie sur le clavier cubique K3 (Keycube). Elle permet aux utilisateurs de s'entraîner à taper sur ce clavier à travers des exercices progressifs (lettres, mots, phrases) avec un calcul des performances.

### Introduction
Cette application propose un enchaînement structuré d'exercices pour aider les utilisateurs à améliorer leur mémorisation des touches et de développer leur vitesse et précision.

Chaque session est divisée en trois parties ayant une difficulté progressive :

**Partie 1 — Lettres** : exercices sur des combinaisons de lettres (FJ, GH, TY, SL)

**Partie 2 — Mots** : mots classés par longueur, de 3 à 9 lettres

**Partie 3 — Phrases** : phrases courtes, intermédiaires et longues

À la fin d'une session, une page de résultats affiche les indicateurs de performance (vitesse moyenne, taux d'erreurs et temps de réactivité) avec des graphiques. On peut ensuite exporter les données des résultats en CSV.

### Getting Started

#### Utilisateur
1. Ouvrir la page d'accueil et entrer un nom d'utilisateur
2. Cliquer sur le bouton "Commencer la session"
3. Début de la session avec la partie 1 avec des exercices concentrés sur des lettres, le curseur avance à chaque frappe correcte.
4. Un cube 3D représente le clavier K3 et met en évidence la touche à frapper. 
5. Le bouton Vue dépliée / Vue transparente permet à l'utilisateur de choisir entre les deux modes de visualisation du cube :
    -  Vue transparente : le cube est semi-transparent, toutes les faces sont visibles simultanément avec différents niveaux de transparence.
    -  Vue dépliée : les deux faces cachées sont affichées à côté du cube comme un schéma déplié.

7. Une fois les trois parties complétées (lettres, mots, phrases), la page de résultats s'affiche avec :
    -  WPM moyen (mots par minute)
    -  Taux d'erreur calculé avec la distance de Levenshtein
    -  Temps de réaction moyen entre frappes
    -  Le détail par exercice

9. Cliquer sur Exporter les résultats pour télécharger un fichier CSV.

#### Programmeur

Les fichiers sont structurés comme suit:

- `index.html`: le code HTML de la page d'accueil.

- `code/session.html` et `resultat.html` : le code HTML de la session et de la page des résultats.

- `script/index.js`, `resultat.js` et `session.js`: le code JavaScript de la page d'accueil, de la session et des résultats.

- `style/style.css`: le code CSS de l'ensemble de l'application web.

L'utilisateur entre son nom d'utilisateur. Il es stocké dans localStorage (voir `index.js`). La session commence.

**Détection de la partie** : Le numéro de partie est lu depuis le paramètre URL (`?part=1/2/3`). Le script `session.js` lit cet attribut et charge les données correspondantes depuis l'objet `PARTS`.

Les exercices sont spécifiques à chaque parties. On peut modifier le contenu de chaque exercices depuis `PARTS` dans `session.js`. On peut passer les exercices sans les faire en appuyant sur &.

**Cube** : Chaque partie a un clavier cubique en 3D réalisé avec Three.js en vue isométrique orthographique. Les textures de chaque face sont générées dynamiquement. La touche cible est mise en évidence en jaune à chaque frappe. Deux modes de visualisation sont disponibles et modifiable dans `session.js`.

**Stockage des données** : les métriques sont accumulées dans sessionStorage tout au long de la session (pas de base de données externe). À la fin de la session, `resultat.js` lit ces données pour afficher les résultats. On peut ensuite exporter ces informations de session dans un dcoument k3_session_nom_utilisateur_annee_mois_jour.csv. Le calcul des métriques est disponible et modifiable dans `session.js`.


**Déploiement** : l'application est un site statique, déployable sur GitHub Pages sans configuration serveur. La balise <base href="/K3\_typinglearn/"> dans chaque HTML doit correspondre au nom du dépôt.

### Credits
**Concept et design du clavier K3** : [Keycube](https://keycube.org/)

**Développement de l'application** : Développé dans le cadre d'un projet universitaire.

**Bibliothèques utilisées** : 
- [Three.js r160](https://threejs.org/) — clavier 3D disponnible dans chaques parties.
- [Chart.js 4.4.0](https://www.chartjs.org/) — graphiques de performance dans la page des résultats.

