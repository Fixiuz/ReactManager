const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// --- INICIO DEL MOTOR DE SIMULACIÓN ---
const calculateOverall = (player) => {
    if (!player || !player.atributos) return 0;
    const { atributos, posicion } = player;
    if (posicion === 'Arquero') return Math.round((atributos.porteria + atributos.velocidad) / 2);
    return Math.round((atributos.defensa + atributos.mediocampo + atributos.ataque + atributos.velocidad) / 4);
};

const simulateMatchLogic = (home, away) => {
    const simulateHalf = () => {
        let homeGoals = 0, awayGoals = 0;
        const events = [];
        const homeAttack = home.starters.reduce((sum, p) => sum + calculateOverall(p), 0) / 11;
        const awayAttack = away.starters.reduce((sum, p) => sum + calculateOverall(p), 0) / 11;
        for (let i = 0; i < 7; i++) {
            if (Math.random() * 100 < homeAttack * 1.1) {
                if (Math.random() < 0.3) {
                    homeGoals++;
                    const scorers = home.starters.filter(p => p.posicion !== "Arquero");
                    const scorer = scorers[Math.floor(Math.random() * scorers.length)] || home.starters[10];
                    if (scorer) events.push({ type: 'goal', team: home.id, playerId: scorer.id });
                }
            }
            if (Math.random() * 100 < awayAttack) {
                if (Math.random() < 0.3) {
                    awayGoals++;
                    const scorers = away.starters.filter(p => p.posicion !== "Arquero");
                    const scorer = scorers[Math.floor(Math.random() * scorers.length)] || away.starters[10];
                    if (scorer) events.push({ type: 'goal', team: away.id, playerId: scorer.id });
                }
            }
        }
        return { homeGoals, awayGoals, events };
    };
    const firstHalf = simulateHalf();
    const secondHalf = simulateHalf();
    return {
        result: {
            homeGoals: firstHalf.homeGoals + secondHalf.homeGoals,
            awayGoals: firstHalf.awayGoals + secondHalf.awayGoals,
        },
        events: [...firstHalf.events, ...secondHalf.events]
    };
};
// --- FIN DEL MOTOR ---

// --- ACTUALIZA ESTADÍSTICAS INDIVIDUALES Y SANCIONES ---
function updateAllPlayerStats(playerStates, fixture, squadsMap, currentJornada, medicLevel = 1) {
    const updatedStates = { ...playerStates };
    const jornadaActual = fixture.find(j => j.jornada === currentJornada);

    if (jornadaActual) {
        jornadaActual.matches.forEach(match => {
            if (!match.result) return;

            const homeStarters = match.homeTeam?.starters || squadsMap[match.home]?.starters || [];
            const awayStarters = match.awayTeam?.starters || squadsMap[match.away]?.starters || [];

            [...homeStarters, ...awayStarters].forEach(p => {
                if (!p || !p.id) return;
                if (!updatedStates[p.id]) {
                    updatedStates[p.id] = {
                        id: p.id,
                        seasonStats: {},
                        yellowCardsAccumulated: 0,
                        suspensionMatches: 0,
                        injuryMatches: 0
                    };
                }
                if (!updatedStates[p.id].seasonStats) updatedStates[p.id].seasonStats = {};
                updatedStates[p.id].seasonStats.matchesPlayed = (updatedStates[p.id].seasonStats.matchesPlayed || 0) + 1;
                updatedStates[p.id].seasonStats.minutesPlayed = (updatedStates[p.id].seasonStats.minutesPlayed || 0) + 90;
            });

            // --- Manejo de eventos ---
            const yellowCountThisMatch = {};
            (match.events || []).forEach(ev => {
                const playerId = ev.playerId || ev.player;
                if (!playerId) return;
                if (!updatedStates[playerId]) {
                    updatedStates[playerId] = { id: playerId, seasonStats: {} };
                }
                if (!updatedStates[playerId].seasonStats) updatedStates[playerId].seasonStats = {};

                switch (ev.type) {
                    case 'goal':
                        updatedStates[playerId].seasonStats.goals = (updatedStates[playerId].seasonStats.goals || 0) + 1;
                        break;
                    case 'assist':
                        updatedStates[playerId].seasonStats.assists = (updatedStates[playerId].seasonStats.assists || 0) + 1;
                        break;
                    case 'yellowCard':
                        updatedStates[playerId].seasonStats.yellowCards = (updatedStates[playerId].seasonStats.yellowCards || 0) + 1;
                        updatedStates[playerId].yellowCardsAccumulated = (updatedStates[playerId].yellowCardsAccumulated || 0) + 1;
                        yellowCountThisMatch[playerId] = (yellowCountThisMatch[playerId] || 0) + 1;
                        break;
                    case 'redCard':
                        updatedStates[playerId].seasonStats.redCards = (updatedStates[playerId].seasonStats.redCards || 0) + 1;
                        updatedStates[playerId].suspensionMatches = Math.max(updatedStates[playerId].suspensionMatches || 0, 1);
                        break;
                    case 'injury':
                        updatedStates[playerId].seasonStats.injuries = (updatedStates[playerId].seasonStats.injuries || 0) + 1;
                        // duración aleatoria 1-6 fechas
                        let injuryDuration = Math.ceil(Math.random() * 6);
                        // aplicar reducción por nivel del cuerpo médico
                        const medicReduction = [0, 0, 0.15, 0.30, 0.50, 0.75]; // según Staff.jsx
                        injuryDuration = Math.max(1, Math.round(injuryDuration * (1 - (medicReduction[medicLevel] || 0))));
                        updatedStates[playerId].injuryMatches = Math.max(updatedStates[playerId].injuryMatches || 0, injuryDuration);
                        break;
                }
            });

            // --- Doble amarilla en un mismo partido ---
            Object.keys(yellowCountThisMatch).forEach(playerId => {
                if (yellowCountThisMatch[playerId] >= 2) {
                    updatedStates[playerId].suspensionMatches = Math.max(updatedStates[playerId].suspensionMatches || 0, 1);
                }
            });

            // --- 5 amarillas acumuladas ---
            Object.values(updatedStates).forEach(p => {
                if ((p.yellowCardsAccumulated || 0) >= 5) {
                    p.suspensionMatches = Math.max(p.suspensionMatches || 0, 1);
                    p.yellowCardsAccumulated = 0; // reset tras suspensión
                }
            });
        });
    }

    // --- Reducir jornadas de suspensión/lesión ---
    Object.values(updatedStates).forEach(p => {
        if (p.suspensionMatches && p.suspensionMatches > 0) {
            p.suspensionMatches = p.suspensionMatches - 1;
        }
        if (p.injuryMatches && p.injuryMatches > 0) {
            p.injuryMatches = p.injuryMatches - 1;
        }
    });

    return updatedStates;
}

// --- RECALCULA TABLA DE POSICIONES ---
function recalculateLeagueState(fixtureWithResults, zonas) {
    if (!zonas || !zonas.zonaA || !zonas.zonaB) {
        console.error("Error crítico: No se encontraron las zonas para recalcular la tabla.");
        return { zonaA: [], zonaB: [] };
    }

    const allTeamIds = [...zonas.zonaA, ...zonas.zonaB];
    const teamStats = {};

    allTeamIds.forEach(teamId => {
        teamStats[teamId] = { teamId, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0, pts: 0 };
    });

    fixtureWithResults.forEach(jornada => {
        jornada.matches.forEach(match => {
            if (!match.result) return;
            const { home, away, result } = match;

            if (teamStats[home]) {
                teamStats[home].pj += 1;
                teamStats[home].gf += result.homeGoals;
                teamStats[home].gc += result.awayGoals;
            }
            if (teamStats[away]) {
                teamStats[away].pj += 1;
                teamStats[away].gf += result.awayGoals;
                teamStats[away].gc += result.homeGoals;
            }

            if (result.homeGoals > result.awayGoals) {
                if (teamStats[home]) { teamStats[home].pg += 1; teamStats[home].pts += 3; }
                if (teamStats[away]) { teamStats[away].pp += 1; }
            } else if (result.homeGoals < result.awayGoals) {
                if (teamStats[away]) { teamStats[away].pg += 1; teamStats[away].pts += 3; }
                if (teamStats[home]) { teamStats[home].pp += 1; }
            } else {
                if (teamStats[home]) { teamStats[home].pe += 1; teamStats[home].pts += 1; }
                if (teamStats[away]) { teamStats[away].pe += 1; teamStats[away].pts += 1; }
            }
        });
    });

    Object.values(teamStats).forEach(ts => { ts.dif = ts.gf - ts.gc; });
    const zonaA = zonas.zonaA.map(teamId => teamStats[teamId]).filter(Boolean).sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf);
    const zonaB = zonas.zonaB.map(teamId => teamStats[teamId]).filter(Boolean).sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf);

    return { zonaA, zonaB };
}

// --- NUEVA LÓGICA DE FINANZAS ---
function simulateFinancials(partida, updatedLeagueState) {
    const finances = { ...partida.finances };
    const stadium = partida.stadium;
    const merchandising = { ...partida.merchandising };

    const transactions = [];

    const allTeams = [...(updatedLeagueState.zonaA || []), ...(updatedLeagueState.zonaB || [])];
    const teamStanding = allTeams.findIndex(t => t.teamId === partida.teamId) + 1 || 10;
    const totalTeams = allTeams.length || 20;
    const performanceFactor = 1 - (teamStanding - 1) / totalTeams;

    const baseOccupancy = 0.5 + performanceFactor * 0.4;
    const priceFactor = Math.max(0.3, 1 - (stadium.ticketPrice / 10000));
    const finalOccupancy = Math.min(1, baseOccupancy * priceFactor);

    const attendance = Math.round(stadium.capacity * finalOccupancy);
    const revenueTickets = attendance * stadium.ticketPrice;

    finances.budget += revenueTickets;
    transactions.push({
        date: new Date().toISOString(),
        description: `Recaudación jornada (${attendance.toLocaleString()} entradas)`,
        amount: revenueTickets,
        type: 'tickets'
    });

    merchandising.products = merchandising.products.map(p => {
        const demandBase = 1000 * performanceFactor;
        const priceEffect = Math.max(0.2, 1 - (p.sellingPrice / (p.manufacturingCost * 5)));
        const potentialSales = Math.round(demandBase * priceEffect);

        const unitsToSell = Math.min(p.stock, potentialSales);
        const revenue = unitsToSell * p.sellingPrice;

        finances.budget += revenue;
        transactions.push({
            date: new Date().toISOString(),
            description: `Ventas de ${p.name} (${unitsToSell} uds)`,
            amount: revenue,
            type: 'merchandising'
        });

        return {
            ...p,
            stock: p.stock - unitsToSell,
            unitsSold: (p.unitsSold || 0) + unitsToSell
        };
    });

    finances.transactions = [...(finances.transactions || []), ...transactions];
    return { finances, merchandising };
}

// --- FUNCIÓN PRINCIPAL ---
exports.simulateJornada = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const { userMatchResult } = data;
    const userId = context.auth.uid;
    const gameDocRef = db.collection("partidas").doc(userId);

    try {
        const partidaSnap = await gameDocRef.get();
        if (!partidaSnap.exists) throw new Error("Partida no encontrada");
        const partida = partidaSnap.data();
        const squadsMap = partida.squadsMap || {};
        const zonasDeLaLiga = partida.zones;
        const medicLevel = partida.staff?.medic || 1;

        const updatedFixture = partida.fixture.map(j => {
            if (j.jornada === partida.currentJornada) {
                return {
                    ...j,
                    matches: j.matches.map(m => {
                        try {
                            if ((m.home === partida.teamId || m.away === partida.teamId)) {
                                return { ...m, result: userMatchResult.finalScore, events: userMatchResult.finalEvents, homeTeam: userMatchResult.homeTeam, awayTeam: userMatchResult.awayTeam };
                            }
                            if (m.result) return m;

                            const homeSquad = squadsMap[m.home];
                            const awaySquad = squadsMap[m.away];
                            
                            if (homeSquad && awaySquad) {
                                const sim = simulateMatchLogic({ id: m.home, starters: homeSquad.starters }, { id: m.away, starters: awaySquad.starters });
                                return { ...m, result: sim.result, events: sim.events };
                            } else {
                                console.warn(`Faltan datos de squad: ${m.home} vs ${m.away}. Usando resultado aleatorio.`);
                                const homeGoals = Math.floor(Math.random() * 3);
                                const awayGoals = Math.floor(Math.random() * 3);
                                return { ...m, result: { homeGoals, awayGoals }, events: [] };
                            }
                        } catch (e) {
                            console.error(`Error al simular partido: ${m.home} vs ${m.away}. Error: ${e.message}`);
                            return { ...m, result: { homeGoals: 0, awayGoals: 0 }, events: [], error: true };
                        }
                    })
                };
            }
            return j;
        });

        const updatedLeagueState = recalculateLeagueState(updatedFixture, zonasDeLaLiga);
        const updatedPlayerStates = updateAllPlayerStats(partida.playerStates, updatedFixture, squadsMap, partida.currentJornada, medicLevel);

        const { finances: updatedFinances, merchandising: updatedMerchandising } = simulateFinancials(partida, updatedLeagueState);

        const newData = {
            fixture: updatedFixture,
            leagueState: updatedLeagueState,
            playerStates: updatedPlayerStates,
            finances: updatedFinances,
            merchandising: updatedMerchandising,
            matchPhase: 'pre-match',
            tempMatchResult: admin.firestore.FieldValue.delete(),
            currentJornada: partida.currentJornada + 1
        };

        await gameDocRef.update(newData);
        return { success: true, ...newData };
    } catch (error) {
        console.error("Error general en simulateJornada:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
