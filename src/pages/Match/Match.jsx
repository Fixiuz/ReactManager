import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, query, where, documentId, getDocs, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './Match.css';

const Match = () => {
    const { gameSession, updateCurrentGameSession } = useContext(GameContext);
    const navigate = useNavigate();

    const [matchPhase, setMatchPhase] = useState('pre-match');
    const [loading, setLoading] = useState(true);
    const [homeTeam, setHomeTeam] = useState(null);
    const [awayTeam, setAwayTeam] = useState(null);
    const [matchResult, setMatchResult] = useState(null);

    const calculateOverall = (player) => {
        if (!player || !player.atributos) return 0;
        const { atributos, posicion } = player;
        if (posicion === 'Arquero') return Math.round((atributos.porteria + atributos.velocidad) / 2);
        return Math.round((atributos.defensa + atributos.mediocampo + atributos.ataque + atributos.velocidad) / 4);
    };

    useEffect(() => {
        if (!gameSession) {
            navigate('/');
            return;
        }

        const setupMatch = async () => {
            setLoading(true);
            try {
                const currentFixture = gameSession.fixture.find(j => j.jornada === gameSession.currentJornada);
                const userMatch = currentFixture?.matches.find(m => m.home === gameSession.teamId || m.away === gameSession.teamId);
                if (!userMatch) {
                    navigate('/');
                    return;
                }

                const fetchTeamData = async (teamId, isUserTeam) => {
                    const teamRef = doc(db, 'equipos', teamId);
                    const teamSnap = await getDoc(teamRef);
                    const teamData = { id: teamSnap.id, ...teamSnap.data() };

                    const playersRef = collection(db, "jugadores");
                    const q = query(playersRef, where("equipoId", "==", teamId));
                    const playersSnapshot = await getDocs(q);
                    teamData.players = playersSnapshot.docs.map(d => ({id: d.id, ...d.data()}));

                    if (isUserTeam) {
                        const lineup = gameSession.matchTempLineup || gameSession.lineup;
                        const tactics = gameSession.matchTempTactics || gameSession.tactics;
                        teamData.formation = tactics?.formationName || '4-4-2';
                        const starterIds = lineup.starters;
                        teamData.starters = starterIds.map(id => teamData.players.find(p => p.id === id)).filter(Boolean);
                    } else {
                        teamData.formation = '4-4-2';
                        teamData.players.sort((a, b) => calculateOverall(b) - calculateOverall(a));
                        teamData.starters = teamData.players.slice(0, 11);
                    }
                    return teamData;
                };
                
                const homeData = await fetchTeamData(userMatch.home, userMatch.home === gameSession.teamId);
                const awayData = await fetchTeamData(userMatch.away, userMatch.away === gameSession.teamId);
                
                setHomeTeam(homeData);
                setAwayTeam(awayData);

                if (gameSession.matchTempLineup) {
                    setMatchPhase('halftime');
                    if (gameSession.tempMatchResult) {
                        setMatchResult(gameSession.tempMatchResult);
                    }
                    updateCurrentGameSession({ matchTempLineup: null, matchTempTactics: null });
                }

            } catch (error) {
                console.error("Error al preparar el partido:", error);
            } finally {
                setLoading(false);
            }
        };

        setupMatch();
    }, [gameSession, navigate]);

    const simulateHalf = (home, away, isSecondHalf = false) => {
        let homeGoals = 0, awayGoals = 0;
        const events = [];
        const stats = { homeShots: 0, awayShots: 0, homeFouls: 0, awayFouls: 0, homeCorners: 0, awayCorners: 0 };
        const baseMinute = isSecondHalf ? 45 : 0;

        const homeAttack = home.starters.reduce((sum, p) => sum + calculateOverall(p), 0) / 11;
        const awayAttack = away.starters.reduce((sum, p) => sum + calculateOverall(p), 0) / 11;
        
        for (let i = 0; i < 7; i++) {
            if (Math.random() * 100 < homeAttack) {
                stats.homeShots++;
                if (Math.random() < 0.3) {
                    homeGoals++;
                    const scorer = home.starters.filter(p => p.posicion === "Delantero")[Math.floor(Math.random() * 2)] || home.starters[10];
                    events.push({ minute: Math.floor(Math.random() * 45) + 1 + baseMinute, type: 'goal', team: 'home', player: scorer.nombreCompleto, playerId: scorer.id });
                }
            }
            if (Math.random() * 100 < awayAttack) {
                stats.awayShots++;
                if (Math.random() < 0.3) {
                    awayGoals++;
                    const scorer = away.starters.filter(p => p.posicion === "Delantero")[Math.floor(Math.random() * 2)] || away.starters[10];
                    events.push({ minute: Math.floor(Math.random() * 45) + 1 + baseMinute, type: 'goal', team: 'away', player: scorer.nombreCompleto, playerId: scorer.id });
                }
            }
            if (Math.random() < 0.3) stats.homeFouls++;
            if (Math.random() < 0.3) stats.awayFouls++;
            if (Math.random() < 0.15) stats.homeCorners++;
            if (Math.random() < 0.15) stats.awayCorners++;
        }
        
        [...home.starters, ...away.starters].forEach(player => {
             if (Math.random() < 0.1) {
                events.push({ minute: Math.floor(Math.random() * 45) + 1 + baseMinute, type: 'yellow', team: player.equipoId === home.id ? 'home' : 'away', player: player.nombreCompleto, playerId: player.id });
            }
        });
        
        events.sort((a,b) => a.minute - b.minute);
        const homePossession = Math.floor(50 + (homeAttack - awayAttack) / 2 + (Math.random() * 10 - 5));
        stats.homePossession = Math.max(20, Math.min(80, homePossession));
        stats.awayPossession = 100 - stats.homePossession;

        return { homeGoals, awayGoals, events, stats };
    };
    
    const handleSimulateFirstHalf = () => {
        const firstHalfResult = simulateHalf(homeTeam, awayTeam);
        setMatchResult({ firstHalf: firstHalfResult });
        updateCurrentGameSession({ tempMatchResult: { firstHalf: firstHalfResult } });
        setMatchPhase('halftime');
    };

    const handleSimulateSecondHalf = () => {
        const secondHalfResult = simulateHalf(homeTeam, awayTeam, true);
        const finalResult = {
            firstHalf: matchResult.firstHalf,
            secondHalf: secondHalfResult,
            finalScore: {
                homeGoals: matchResult.firstHalf.homeGoals + secondHalfResult.homeGoals,
                awayGoals: matchResult.firstHalf.awayGoals + secondHalfResult.awayGoals,
            },
            finalEvents: [...matchResult.firstHalf.events, ...secondHalfResult.events].sort((a, b) => a.minute - b.minute),
            finalStats: {
                homePossession: Math.round((matchResult.firstHalf.stats.homePossession + secondHalfResult.stats.homePossession) / 2),
                awayPossession: Math.round((matchResult.firstHalf.stats.awayPossession + secondHalfResult.stats.awayPossession) / 2),
                homeShots: matchResult.firstHalf.stats.homeShots + secondHalfResult.stats.homeShots,
                awayShots: matchResult.firstHalf.stats.awayShots + secondHalfResult.stats.awayShots,
                homeFouls: matchResult.firstHalf.stats.homeFouls + secondHalfResult.stats.homeFouls,
                awayFouls: matchResult.firstHalf.stats.awayFouls + secondHalfResult.stats.awayFouls,
                homeCorners: matchResult.firstHalf.stats.homeCorners + secondHalfResult.stats.homeCorners,
                awayCorners: matchResult.firstHalf.stats.awayCorners + secondHalfResult.stats.awayCorners,
            }
        };
        setMatchResult(finalResult);
        updateCurrentGameSession({ tempMatchResult: null });
        setMatchPhase('fulltime');
    };
    
    const handleFinishMatch = async () => {
        if (!gameSession || !matchResult) return;
    
        Swal.fire({
            title: 'Procesando Jornada',
            text: 'Simulando partidos y actualizando tablas. Por favor, espera...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    
        try {
            const currentJornadaData = gameSession.fixture.find(j => j.jornada === gameSession.currentJornada);
            const userMatchData = currentJornadaData.matches.find(m => m.home === gameSession.teamId || m.away === gameSession.teamId);
    
            const newLeagueState = JSON.parse(JSON.stringify(gameSession.leagueState));
            const newPlayerStates = JSON.parse(JSON.stringify(gameSession.playerStates));
            const newFixture = JSON.parse(JSON.stringify(gameSession.fixture));
    
            const fetchFullTeamData = async (teamId) => {
                const teamRef = doc(db, 'equipos', teamId);
                const teamSnap = await getDoc(teamRef);
                const teamData = { id: teamSnap.id, ...teamSnap.data() };
    
                const playersRef = collection(db, "jugadores");
                const q = query(playersRef, where("equipoId", "==", teamId));
                const playersSnapshot = await getDocs(q);
                teamData.players = playersSnapshot.docs.map(d => ({id: d.id, ...d.data()}));
                
                teamData.players.sort((a, b) => calculateOverall(b) - calculateOverall(a));
                teamData.starters = teamData.players.slice(0, 11);
                return teamData;
            };
    
            const aiMatches = currentJornadaData.matches.filter(m => m.home !== gameSession.teamId && m.away !== gameSession.teamId);
            const aiMatchResults = [];
    
            for (const match of aiMatches) {
                const homeTeamData = await fetchFullTeamData(match.home);
                const awayTeamData = await fetchFullTeamData(match.away);
                
                const firstHalf = simulateHalf(homeTeamData, awayTeamData);
                const secondHalf = simulateHalf(homeTeamData, awayTeamData, true);
    
                const finalScore = {
                    homeGoals: firstHalf.homeGoals + secondHalf.homeGoals,
                    awayGoals: firstHalf.awayGoals + secondHalf.awayGoals,
                };
                const finalEvents = [...firstHalf.events, ...secondHalf.events].sort((a,b) => a.minute - b.minute);
                
                aiMatchResults.push({
                    home: match.home,
                    away: match.away,
                    result: finalScore,
                    events: finalEvents
                });
            }
            
            const allResultsForJornada = [
                ...aiMatchResults,
                {
                    home: userMatchData.home,
                    away: userMatchData.away,
                    result: matchResult.finalScore,
                    events: matchResult.finalEvents
                }
            ];
            
            const jornadaFixtureToUpdate = newFixture.find(j => j.jornada === gameSession.currentJornada);
    
            for (const game of allResultsForJornada) {
                const matchInFixture = jornadaFixtureToUpdate.matches.find(m => m.home === game.home && m.away === game.away);
                if (matchInFixture) {
                    matchInFixture.result = game.result;
                }
    
                const teamsToUpdate = [
                    { id: game.home, goalsFor: game.result.homeGoals, goalsAgainst: game.result.awayGoals },
                    { id: game.away, goalsFor: game.result.awayGoals, goalsAgainst: game.result.homeGoals }
                ];
    
                for (const teamUpdate of teamsToUpdate) {
                    let table, teamStats;
                    table = newLeagueState.zonaA;
                    teamStats = table.find(t => t.teamId === teamUpdate.id);
                    if (!teamStats) {
                        table = newLeagueState.zonaB;
                        teamStats = table.find(t => t.teamId === teamUpdate.id);
                    }
    
                    if (teamStats) {
                        teamStats.pj += 1;
                        teamStats.gf += teamUpdate.goalsFor;
                        teamStats.gc += teamUpdate.goalsAgainst;
                        teamStats.dif = teamStats.gf - teamStats.gc;
                        
                        if (game.result.homeGoals === game.result.awayGoals) {
                            teamStats.pe += 1;
                            teamStats.pts += 1;
                        } else if ((teamUpdate.id === game.home && game.result.homeGoals > game.result.awayGoals) || (teamUpdate.id === game.away && game.result.awayGoals > game.result.homeGoals)) {
                            teamStats.pg += 1;
                            teamStats.pts += 3;
                        } else {
                            teamStats.pp += 1;
                        }
                    }
                }
    
                for (const event of game.events) {
                    if (event.playerId && newPlayerStates[event.playerId]) {
                        const playerStats = newPlayerStates[event.playerId].seasonStats;
                        if(event.type === 'goal') playerStats.goals += 1;
                        if(event.type === 'yellow') playerStats.yellowCards += 1;
                    }
                }
            }
    
            const updatedGameData = {
                leagueState: newLeagueState,
                playerStates: newPlayerStates,
                fixture: newFixture,
                currentJornada: gameSession.currentJornada + 1,
                tempMatchResult: null, 
                matchTempLineup: null,
                matchTempTactics: null,
            };
            
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            await updateDoc(gameDocRef, updatedGameData);
            
            updateCurrentGameSession(updatedGameData);
    
            Swal.close();
            navigate('/');
    
        } catch (error) {
            console.error("Error al finalizar el partido y procesar la jornada:", error);
            Swal.fire('Error', 'Hubo un problema al procesar la jornada. Revisa la consola para más detalles.', 'error');
        }
    };

    if (loading || !homeTeam || !awayTeam) {
        return <div className="match-container-fullscreen loading"><h1>Preparando Partido...</h1></div>;
    }

    if (matchPhase === 'pre-match') {
        return (
            <div className="match-container-fullscreen">
                <div className="pre-match-header"><h2>Jornada {gameSession.currentJornada}</h2></div>
                <div className="pre-match-body">
                    <div className="team-column">
                        <img src={homeTeam.escudoURL} alt={homeTeam.nombreCorto} className="team-logo-large" />
                        <h3>{homeTeam.nombre}</h3>
                        <p className="formation-text">{homeTeam.formation}</p>
                        <ul className="player-list">
                            {homeTeam.starters.map(p => <li key={p.id}>{p.nombreCompleto}</li>)}
                        </ul>
                    </div>
                    <div className="vs-column"><span className="display-2">VS</span></div>
                    <div className="team-column">
                        <img src={awayTeam.escudoURL} alt={awayTeam.nombreCorto} className="team-logo-large" />
                        <h3>{awayTeam.nombre}</h3>
                        <p className="formation-text">{awayTeam.formation}</p>
                        <ul className="player-list">
                            {awayTeam.starters.map(p => <li key={p.id}>{p.nombreCompleto}</li>)}
                        </ul>
                    </div>
                </div>
                <div className="pre-match-footer">
                    <button className="btn btn-success btn-lg" onClick={handleSimulateFirstHalf}>Simular 1er Tiempo →</button>
                </div>
            </div>
        );
    }

    if (matchPhase === 'halftime' && matchResult) {
        const { firstHalf } = matchResult;
        return (
             <div className="match-container-fullscreen halftime-container">
                <div className="score-header card bg-dark">
                    <div className="team-score">
                        <img src={homeTeam.escudoURL} alt={homeTeam.nombreCorto} className="team-logo-small" />
                        <h4 className="d-none d-md-block">{homeTeam.nombre}</h4>
                        <h4 className="d-block d-md-none">{homeTeam.nombreCorto}</h4>
                    </div>
                    <div className="score-board">
                        <span className="score">{firstHalf.homeGoals} - {firstHalf.awayGoals}</span>
                        <span className="halftime-text">ENTRETIEMPO</span>
                    </div>
                    <div className="team-score">
                         <h4 className="d-none d-md-block">{awayTeam.nombre}</h4>
                         <h4 className="d-block d-md-none">{awayTeam.nombreCorto}</h4>
                        <img src={awayTeam.escudoURL} alt={awayTeam.nombreCorto} className="team-logo-small" />
                    </div>
                </div>
                <div className="halftime-body card bg-dark">
                    <div className="events-section">
                        <h5>Incidencias</h5>
                        <ul className="events-list">
                            {firstHalf.events.filter(e => e.type === 'goal').map((event, i) => (
                                <li key={`g-${i}`} className="event-item"><i className="bi bi-futbol text-success"></i> {event.minute}' {event.player} ({event.team === 'home' ? homeTeam.nombreCorto : awayTeam.nombreCorto})</li>
                            ))}
                             {firstHalf.events.filter(e => e.type === 'yellow').map((event, i) => (
                                <li key={`y-${i}`} className="event-item"><div className="yellow-card"></div> {event.minute}' {event.player}</li>
                            ))}
                            {firstHalf.events.length === 0 && <li className="event-item text-white-50">Sin incidencias en la primera mitad.</li>}
                        </ul>
                    </div>
                    <div className="stats-section">
                        <h5>Estadísticas</h5>
                        <table className="stats-table">
                            <thead>
                                <tr><th>{homeTeam.nombreCorto}</th><th>Estadística</th><th>{awayTeam.nombreCorto}</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>{firstHalf.stats.homePossession}%</td><td className="stat-name">Posesión</td><td>{firstHalf.stats.awayPossession}%</td></tr>
                                <tr><td>{firstHalf.stats.homeShots}</td><td className="stat-name">Remates</td><td>{firstHalf.stats.awayShots}</td></tr>
                                <tr><td>{firstHalf.stats.homeFouls}</td><td className="stat-name">Faltas</td><td>{firstHalf.stats.awayFouls}</td></tr>
                                <tr><td>{firstHalf.stats.homeCorners}</td><td className="stat-name">Córners</td><td>{firstHalf.stats.awayCorners}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="halftime-footer">
                     <button className="btn btn-primary btn-lg me-3" onClick={() => navigate('/match/tactics')}>Ajustar Tácticas</button>
                     <button className="btn btn-success btn-lg" onClick={handleSimulateSecondHalf}>Simular 2do Tiempo →</button>
                </div>
            </div>
        );
    }

    if (matchPhase === 'fulltime' && matchResult) {
        const { finalScore, finalEvents, finalStats } = matchResult;
        return (
             <div className="match-container-fullscreen halftime-container">
                <div className="score-header card bg-dark">
                    <div className="team-score">
                        <img src={homeTeam.escudoURL} alt={homeTeam.nombreCorto} className="team-logo-small" />
                        <h4 className="d-none d-md-block">{homeTeam.nombre}</h4>
                        <h4 className="d-block d-md-none">{homeTeam.nombreCorto}</h4>
                    </div>
                    <div className="score-board">
                        <span className="score">{finalScore.homeGoals} - {finalScore.awayGoals}</span>
                        <span className="halftime-text">FINAL DEL PARTIDO</span>
                    </div>
                    <div className="team-score">
                         <h4 className="d-none d-md-block">{awayTeam.nombre}</h4>
                         <h4 className="d-block d-md-none">{awayTeam.nombreCorto}</h4>
                        <img src={awayTeam.escudoURL} alt={awayTeam.nombreCorto} className="team-logo-small" />
                    </div>
                </div>
                <div className="halftime-body card bg-dark">
                    <div className="events-section">
                        <h5>Incidencias</h5>
                        <ul className="events-list">
                            {finalEvents.map((event, i) => (
                                <li key={i} className="event-item">
                                    {event.type === 'goal' && <i className="bi bi-futbol text-success"></i>}
                                    {event.type === 'yellow' && <div className="yellow-card"></div>}
                                    {event.minute}' {event.player}
                                </li>
                            ))}
                            {finalEvents.length === 0 && <li className="event-item text-white-50">Sin incidencias.</li>}
                        </ul>
                    </div>
                    <div className="stats-section">
                        <h5>Estadísticas Finales</h5>
                        <table className="stats-table">
                             <thead>
                                <tr><th>{homeTeam.nombreCorto}</th><th>Estadística</th><th>{awayTeam.nombreCorto}</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>{finalStats.homePossession}%</td><td className="stat-name">Posesión</td><td>{finalStats.awayPossession}%</td></tr>
                                <tr><td>{finalStats.homeShots}</td><td className="stat-name">Remates</td><td>{finalStats.awayShots}</td></tr>
                                <tr><td>{finalStats.homeFouls}</td><td className="stat-name">Faltas</td><td>{finalStats.awayFouls}</td></tr>
                                <tr><td>{finalStats.homeCorners}</td><td className="stat-name">Córners</td><td>{finalStats.awayCorners}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="halftime-footer">
                     <button className="btn btn-info btn-lg" onClick={handleFinishMatch}>Finalizar y Continuar →</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="match-container-fullscreen loading">
            <h1>Cargando Partido...</h1>
        </div>
    );
};

export default Match;