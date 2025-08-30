// src/pages/Match/Match.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Match.css';
import { useGameSession } from '../../hooks/useGameSession';
import { useSquad } from '../../hooks/useSquad';
import { useOpponent } from '../../hooks/useOpponent';
import { useMatchSimulation } from '../../hooks/useMatchSimulation';
import { useMatchActions } from '../../hooks/useMatchActions';
import { simulateHalf } from '../../gameLogic/matchSimulator';

const Match = () => {
    const navigate = useNavigate();
    const { gameSession, isLoading: isSessionLoading } = useGameSession();
    const { squad, isLoading: isSquadLoading } = useSquad();
    const { data: opponentData, isLoading: isOpponentLoading } = useOpponent();
    const { mutate: simulateJornada, isPending: isSimulatingJornada } = useMatchSimulation();
    const { confirmChanges } = useMatchActions();

    // LOG DE DEPURACIÓN
    console.log("Match debug:", {
        gameSession,
        squad,
        opponentData,
        isSessionLoading,
        isSquadLoading,
        isOpponentLoading
    });

    const isLoading = isSessionLoading || isSquadLoading || isOpponentLoading;

    if (isLoading) return <div className="match-container-fullscreen loading"><h1>Preparando Partido...</h1></div>;
    if (!gameSession || !squad || !opponentData) return <div className="match-container-fullscreen loading"><h1>Cargando Datos del Partido...</h1></div>;
    
    const matchPhase = gameSession.matchPhase || 'pre-match';
    const localResult = gameSession.tempMatchResult || null;
    const lineupToUse = gameSession.matchTempLineup || gameSession.lineup;
    const userTeamStarters = squad.filter(p => lineupToUse.starters.includes(p.id));
    const allPlayersInMatch = new Map([...squad, ...(opponentData.squad || [])].map(p => [p.id, p]));

    const handleSimulateFirstHalf = () => {
        const userTeamForSim = { ...gameSession.team, starters: userTeamStarters };
        const opponentTeamForSim = { ...opponentData.teamInfo, starters: opponentData.starters };
        const homeTeam = opponentData.isHomeMatch ? userTeamForSim : opponentTeamForSim;
        const awayTeam = opponentData.isHomeMatch ? opponentTeamForSim : userTeamForSim;
        const firstHalfResult = simulateHalf(homeTeam, awayTeam);
        const financials = opponentData.isHomeMatch ? { attendance: 15000, revenue: 750000, totalSeats: 20000 } : null;
        confirmChanges({ matchPhase: 'halftime', tempMatchResult: { firstHalf: firstHalfResult, homeTeam, awayTeam, financials } });
    };

    const handleSimulateSecondHalf = () => {
        const { homeTeam, awayTeam, firstHalf } = localResult;
        const secondHalfResult = simulateHalf(homeTeam, awayTeam, true);
        const finalResult = {
            ...localResult,
            secondHalf: secondHalfResult,
            finalScore: { homeGoals: firstHalf.homeGoals + secondHalfResult.homeGoals, awayGoals: firstHalf.awayGoals + secondHalfResult.awayGoals },
            finalEvents: [...firstHalf.events, ...secondHalfResult.events].sort((a, b) => a.minute - b.minute),
            finalStats: {
                homePossession: Math.round((firstHalf.stats.homePossession + secondHalfResult.stats.homePossession) / 2),
                awayPossession: 100 - Math.round((firstHalf.stats.homePossession + secondHalfResult.stats.homePossession) / 2),
                homeShots: firstHalf.stats.homeShots + secondHalfResult.stats.homeShots,
                awayShots: firstHalf.stats.awayShots + secondHalfResult.stats.awayShots,
                homeFouls: firstHalf.stats.homeFouls + secondHalfResult.stats.homeFouls,
                awayFouls: firstHalf.stats.awayFouls + secondHalfResult.stats.awayFouls,
                homeCorners: firstHalf.stats.homeCorners + secondHalfResult.stats.homeCorners,
                awayCorners: firstHalf.stats.awayCorners + secondHalfResult.stats.awayCorners
            }
        };
        confirmChanges({ matchPhase: 'fulltime', tempMatchResult: finalResult });
    };

    const handleFinishMatch = () => {
        console.log("localResult:", localResult); // <-- Agrega este log aquí
        console.log("Enviando a simulateJornada:", localResult); // LOG para depuración
        Swal.fire({ title: 'Procesando Jornada', text: 'Simulando todos los partidos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        simulateJornada({ userMatchResult: localResult }, {
            onSuccess: (data) => { 
                console.log("Simulación exitosa, data recibida:", data); // LOG para depuración
                Swal.close(); 
                navigate('/'); 
            },
            onError: (error) => { 
                console.error("Error en la simulación:", error); // LOG para depuración
                Swal.fire('Error', 'Hubo un problema al procesar la jornada.', 'error'); 
            }
        });
    };
    
    if (opponentData.isResting) return <div className="match-container-fullscreen loading"><h2>Esta jornada tu equipo descansa.</h2></div>;
    
    const homeTeamData = opponentData.isHomeMatch ? gameSession.team : opponentData.teamInfo;
    const awayTeamData = opponentData.isHomeMatch ? opponentData.teamInfo : gameSession.team;
    console.log("Renderizando pantalla de partido", {
        matchPhase,
        homeTeamData,
        awayTeamData,
        userTeamStarters,
        opponentData
    });
    if (matchPhase === 'pre-match' || matchPhase === 'dashboard') {
        return (
            <div className="match-container-fullscreen">
                <div className="pre-match-header"><h2>Jornada {gameSession.currentJornada}</h2></div>
                <div className="pre-match-body">
                    <div className="team-column"><img src={homeTeamData.escudoURL} alt={homeTeamData.nombreCorto} className="team-logo-large" /><h3>{homeTeamData.nombre}</h3><p className="formation-text">{gameSession.tactics?.formationName || '4-4-2'}</p><ul className="player-list">{userTeamStarters.map(p => <li key={p.id}>{p.nombreCompleto}</li>)}</ul></div>
                    <div className="vs-column"><span className="display-2">VS</span></div>
                    <div className="team-column"><img src={awayTeamData.escudoURL} alt={awayTeamData.nombreCorto} className="team-logo-large" /><h3>{opponentData.teamInfo.nombre}</h3><p className="formation-text">4-4-2</p><ul className="player-list">{opponentData.starters.map(p => <li key={p.id}>{p.nombreCompleto}</li>)}</ul></div>
                </div>
                <div className="pre-match-footer"><button className="btn btn-success btn-lg" onClick={handleSimulateFirstHalf} disabled={userTeamStarters.length !== 11}>Simular 1er Tiempo →</button>{userTeamStarters.length !== 11 && (<p className="text-danger mt-3">Debes tener 11 jugadores en tu alineación titular.</p>)}</div>
            </div>
        );
    }

    if (matchPhase === 'halftime' && localResult) {
        const { firstHalf, homeTeam, awayTeam } = localResult;
        return (
             <div className="match-container-fullscreen halftime-container">
                <div className="score-header card bg-dark"><div className="team-score"><img src={homeTeam.escudoURL} alt={homeTeam.nombreCorto} className="team-logo-small" /><h4>{homeTeam.nombre}</h4></div><div className="score-board"><span className="score">{firstHalf.homeGoals} - {firstHalf.awayGoals}</span><span className="halftime-text">ENTRETIEMPO</span></div><div className="team-score"><h4>{awayTeam.nombre}</h4><img src={awayTeam.escudoURL} alt={awayTeam.nombreCorto} className="team-logo-small" /></div></div>
                <div className="halftime-body card bg-dark"><div className="events-section"><h5>Incidencias</h5><ul className="events-list">{firstHalf.events.map((event, i) => (<li key={`event-${i}`} className="event-item">{event.type === 'goal' && <i className="bi bi-futbol text-success me-2"></i>}{event.type === 'yellowCard' && <div className="yellow-card me-2"></div>}{` ${event.minute}' ${allPlayersInMatch.get(event.player)?.nombreCompleto || 'Jugador'}`}</li>))}{firstHalf.events.length === 0 && <li className="event-item text-white-50">Sin incidencias.</li>}</ul></div><div className="stats-section"><h5>Estadísticas</h5><table className="stats-table"><thead><tr><th>{homeTeam.nombreCorto}</th><th>Estadística</th><th>{awayTeam.nombreCorto}</th></tr></thead><tbody><tr><td>{firstHalf.stats.homePossession}%</td><td className="stat-name">Posesión</td><td>{firstHalf.stats.awayPossession}%</td></tr><tr><td>{firstHalf.stats.homeShots}</td><td className="stat-name">Remates</td><td>{firstHalf.stats.awayShots}</td></tr><tr><td>{firstHalf.stats.homeFouls}</td><td className="stat-name">Faltas</td><td>{firstHalf.stats.awayFouls}</td></tr><tr><td>{firstHalf.stats.homeCorners}</td><td className="stat-name">Córners</td><td>{firstHalf.stats.awayCorners}</td></tr></tbody></table></div></div>
                <div className="halftime-footer"><button className="btn btn-primary btn-lg me-3" onClick={() => navigate('/match/tactics')}>Ajustar Tácticas</button><button className="btn btn-success btn-lg" onClick={handleSimulateSecondHalf}>Simular 2do Tiempo →</button></div>
            </div>
        );
    }

    if (matchPhase === 'fulltime' && localResult) {
        const { finalScore, finalEvents, finalStats, homeTeam, awayTeam } = localResult;
        return (
             <div className="match-container-fullscreen halftime-container">
                <div className="score-header card bg-dark"><div className="team-score"><img src={homeTeam.escudoURL} alt={homeTeam.nombreCorto} className="team-logo-small" /><h4>{homeTeam.nombre}</h4></div><div className="score-board"><span className="score">{finalScore.homeGoals} - {finalScore.awayGoals}</span><span className="halftime-text">FINAL DEL PARTIDO</span></div><div className="team-score"><h4>{awayTeam.nombre}</h4><img src={awayTeam.escudoURL} alt={awayTeam.nombreCorto} className="team-logo-small" /></div></div>
                <div className="halftime-body card bg-dark"><div className="events-section"><h5>Incidencias</h5><ul className="events-list">{finalEvents.map((event, i) => (<li key={i} className="event-item">{event.type === 'goal' && <i className="bi bi-futbol text-success me-2"></i>}{event.type === 'yellow' && <div className="yellow-card me-2"></div>}{event.minute}' {allPlayersInMatch.get(event.player)?.nombreCompleto || 'Jugador'}</li>))}</ul></div><div className="stats-section"><h5>Estadísticas Finales</h5><table className="stats-table"><thead><tr><th>{homeTeam.nombreCorto}</th><th>Estadística</th><th>{awayTeam.nombreCorto}</th></tr></thead><tbody><tr><td>{finalStats.homePossession}%</td><td className="stat-name">Posesión</td><td>{finalStats.awayPossession}%</td></tr><tr><td>{finalStats.homeShots}</td><td className="stat-name">Remates</td><td>{finalStats.awayShots}</td></tr><tr><td>{finalStats.homeFouls}</td><td className="stat-name">Faltas</td><td>{finalStats.awayFouls}</td></tr><tr><td>{finalStats.homeCorners}</td><td className="stat-name">Córners</td><td>{finalStats.awayCorners}</td></tr></tbody></table></div></div>
                <div className="halftime-footer"><button className="btn btn-info btn-lg" onClick={handleFinishMatch} disabled={isSimulatingJornada}>{isSimulatingJornada ? 'Procesando Jornada...' : 'Finalizar y Continuar →'}</button></div>
            </div>
        );
    }
    
    return <div className="match-container-fullscreen loading"><h1>Cargando...</h1></div>;
};

export default Match;