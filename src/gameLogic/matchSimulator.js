// src/gameLogic/matchSimulator.js

const calculateOverall = (player) => {
    if (!player || !player.atributos) return 0;
    const { atributos, posicion } = player;
    if (posicion === 'Arquero') {
        return Math.round((atributos.porteria + atributos.velocidad) / 2);
    }
    return Math.round((atributos.defensa + atributos.mediocampo + atributos.ataque + atributos.velocidad) / 4);
};

// --- Duraciones base de lesiones ---
const INJURY_TYPES = [
    { type: "ligera", baseMatches: 1 },
    { type: "media", baseMatches: 3 },
    { type: "grave", baseMatches: 6 },
];

// --- Reducción de lesiones según nivel de médico ---
const getMedicalReduction = (medicLevel = 1) => {
    switch (medicLevel) {
        case 2: return 0.85; // -15%
        case 3: return 0.70; // -30%
        case 4: return 0.50; // -50%
        case 5: return 0.25; // -75%
        default: return 1.00; // nivel 1 = sin bonus
    }
};

export const simulateHalf = (home, away, isSecondHalf = false, medicLevel = 1) => {
    let homeGoals = 0, awayGoals = 0;
    const events = [];
    const stats = { homeShots: 0, awayShots: 0, homeFouls: 0, awayFouls: 0, homeCorners: 0, awayCorners: 0 };

    const baseMinute = isSecondHalf ? 45 : 0;

    const homeAttack = home.starters.reduce((sum, p) => sum + calculateOverall(p), 0) / 11;
    const awayAttack = away.starters.reduce((sum, p) => sum + calculateOverall(p), 0) / 11;

    for (let i = 0; i < 7; i++) { // 7 chances de gol por tiempo
        // ATAQUES DEL HOME
        if (Math.random() * 100 < homeAttack) {
            stats.homeShots++;
            if (Math.random() < 0.3) {
                homeGoals++;
                const scorers = home.starters.filter(p => p.posicion !== "Arquero");
                const scorer = scorers[Math.floor(Math.random() * scorers.length)] || home.starters[10];
                events.push({ minute: Math.floor(Math.random() * 45) + 1 + baseMinute, type: 'goal', team: 'home', player: scorer.id });
            }
        }

        // ATAQUES DEL AWAY
        if (Math.random() * 100 < awayAttack) {
            stats.awayShots++;
            if (Math.random() < 0.3) {
                awayGoals++;
                const scorers = away.starters.filter(p => p.posicion !== "Arquero");
                const scorer = scorers[Math.floor(Math.random() * scorers.length)] || away.starters[10];
                events.push({ minute: Math.floor(Math.random() * 45) + 1 + baseMinute, type: 'goal', team: 'away', player: scorer.id });
            }
        }

        // Faltas y córners
        if (Math.random() < 0.3) stats.homeFouls++;
        if (Math.random() < 0.3) stats.awayFouls++;
        if (Math.random() < 0.15) stats.homeCorners++;
        if (Math.random() < 0.15) stats.awayCorners++;
    }

    // --- Amarillas, Rojas y Lesiones ---
    [...home.starters, ...away.starters].forEach(player => {
        if (!player) return;

        // Amarilla
        if (Math.random() < 0.08) { // 8% probabilidad
            events.push({
                minute: Math.floor(Math.random() * 45) + 1 + baseMinute,
                type: 'yellowCard',
                team: player.equipoId === home.id ? 'home' : 'away',
                player: player.id
            });
        }

        // Roja directa
        if (Math.random() < 0.02) { // 2% probabilidad
            events.push({
                minute: Math.floor(Math.random() * 45) + 1 + baseMinute,
                type: 'redCard',
                team: player.equipoId === home.id ? 'home' : 'away',
                player: player.id,
                suspensionMatches: 1
            });
        }

        // Lesión
        if (Math.random() < 0.03) { // 3% probabilidad
            const injury = INJURY_TYPES[Math.floor(Math.random() * INJURY_TYPES.length)];
            const reduction = getMedicalReduction(medicLevel);
            const finalDuration = Math.max(1, Math.round(injury.baseMatches * reduction));

            events.push({
                minute: Math.floor(Math.random() * 45) + 1 + baseMinute,
                type: 'injury',
                team: player.equipoId === home.id ? 'home' : 'away',
                player: player.id,
                injuryType: injury.type,
                injuryMatches: finalDuration
            });
        }
    });

    // --- Posesión ---
    events.sort((a, b) => a.minute - b.minute);
    const homePossession = Math.floor(50 + (homeAttack - awayAttack) / 2 + (Math.random() * 10 - 5));
    stats.homePossession = Math.max(20, Math.min(80, homePossession));
    stats.awayPossession = 100 - stats.homePossession;

    return { homeGoals, awayGoals, events, stats };
};
