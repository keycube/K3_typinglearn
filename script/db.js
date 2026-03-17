// db.js — Module Dexie partagé
import Dexie from "https://unpkg.com/dexie@3.2.4/dist/dexie.mjs";

export const db = new Dexie("K3TypingDB");

db.version(1).stores({
    sessions: "++id, username, date",
    exerciseStats: "++id, sessionId, part, exerciseName"
});

// Initialise ou récupère la session courante
export async function getOrCreateSession() {
    const sessionId = parseInt(sessionStorage.getItem("sessionId"));
    if (sessionId) {
        const existing = await db.sessions.get(sessionId);
        if (existing) return existing;
    }

    const username = localStorage.getItem("username") || "Invité";
    const id = await db.sessions.add({
        username,
        date: new Date().toISOString(),
        totalTime: 0
    });

    sessionStorage.setItem("sessionId", id);
    return db.sessions.get(id);
}

export async function saveExerciseStat(stat) {
    // stat: { sessionId, part, exerciseName, wpm, errorRate, avgReactionTime, typed, expected }
    await db.exerciseStats.add(stat);
}

export async function finalizeSession(totalTime) {
    const sessionId = parseInt(sessionStorage.getItem("sessionId"));
    if (sessionId) {
        await db.sessions.update(sessionId, { totalTime });
    }
}
