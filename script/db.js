// db.js — Utilisé uniquement pour l'export au clic bouton
import Dexie from "https://unpkg.com/dexie@3.2.4/dist/dexie.mjs";

export const db = new Dexie("K3TypingDB");

db.version(1).stores({
    sessions: "++id, username, date",
    exerciseStats: "++id, sessionId, part, exerciseName"
});

export async function exportSessionToDexie(sessionData) {
    // sessionData : { username, date, totalTime, stats[] }
    const sessionId = await db.sessions.add({
        username: sessionData.username,
        date: sessionData.date,
        totalTime: sessionData.totalTime
    });
    for (const stat of sessionData.stats) {
        await db.exerciseStats.add({ ...stat, sessionId });
    }
    return sessionId;
}
