import React, { useContext, useState, useEffect, useMemo } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import './ViewOpponent.css';

// --- Reutilizamos los helpers y sub-componentes de Tactics ---
const getPositionColorClass = (pos) => {
    if (pos === 'Arquero') return 'pos-arquero';
    if (pos === 'Defensor') return 'pos-defensor';
    if (pos === 'Mediocampista') return 'pos-mediocampista';
    return 'pos-delantero';
};

const TeamStats = ({ players }) => {
    const stats = useMemo(() => {
        if (!players || players.length < 11) return { porteria: 0, defensa: 0, mediocampo: 0, ataque: 0, general: 0 };
        const goalkeepers = players.filter(p => p.posicion === 'Arquero');
        const defenders = players.filter(p => p.posicion === 'Defensor');
        const midfielders = players.filter(p => p.posicion === 'Mediocampista');
        const forwards = players.filter(p => p.posicion === 'Delantero');
        const avg = (arr, attr) => arr.length > 0 ? arr.reduce((sum, p) => sum + p.atributos[attr], 0) / arr.length : 0;
        const porteria = avg(goalkeepers, 'porteria');
        const defensa = avg(defenders, 'defensa');
        const mediocampo = avg(midfielders, 'mediocampo');
        const ataque = avg(forwards, 'ataque');
        const general = (porteria + defensa + mediocampo + ataque) / 4;
        return { porteria: Math.round(porteria), defensa: Math.round(defensa), mediocampo: Math.round(mediocampo), ataque: Math.round(ataque), general: Math.round(general) };
    }, [players]);

    const StarRating = ({ rating }) => {
        const totalStars = 5;
        const filledStars = Math.round((rating / 100) * totalStars);
        return <div className="star-rating">{[...Array(totalStars)].map((_, i) => <span key={i} className={i < filledStars ? 'star filled' : 'star'}>★</span>)}</div>;
    };

    return (
        <div className="card bg-dark text-white mt-4">
            <div className="card-body">
                <h5 className="card-title mb-3">Media del Equipo Rival</h5>
                <div className="stat-item"><span>Portería</span> <span className="fw-bold">{stats.porteria}</span></div>
                <div className="stat-item"><span>Defensa</span> <span className="fw-bold">{stats.defensa}</span></div>
                <div className="stat-item"><span>Mediocampo</span> <span className="fw-bold">{stats.mediocampo}</span></div>
                <div className="stat-item"><span>Ataque</span> <span className="fw-bold">{stats.ataque}</span></div>
                <hr />
                <div className="stat-item general"><span>General</span> <span className="fw-bold fs-5">{stats.general}</span></div>
                <StarRating rating={stats.general} />
            </div>
        </div>
    );
};

const PlayerDot = ({ player, position }) => (
    <div className={`player-dot ${getPositionColorClass(player.posicion)}`} style={{ top: position.top, left: position.left }} title={player.nombreCompleto} />
);

const ViewOpponent = () => {
    const { gameSession } = useContext(GameContext);
    const [opponentData, setOpponentData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (gameSession) {
            const findAndAnalyzeOpponent = async () => {
                const currentFixture = gameSession.fixture.find(j => j.jornada === gameSession.currentJornada);
                if (!currentFixture) { setLoading(false); return; }

                const match = currentFixture.matches.find(m => m.home === gameSession.teamId || m.away === gameSession.teamId);
                if (!match) {
                    setOpponentData({ isResting: true });
                    setLoading(false);
                    return;
                }

                const opponentId = match.home === gameSession.teamId ? match.away : match.home;

                try {
                    // 1. Cargar datos del equipo rival
                    const teamDoc = await getDoc(doc(db, 'equipos', opponentId));
                    if (!teamDoc.exists()) throw new Error("Opponent team not found");
                    const opponentTeamInfo = teamDoc.data();

                    // 2. Cargar plantel completo del rival
                    const playersRef = collection(db, "jugadores");
                    const q = query(playersRef, where("equipoId", "==", opponentId));
                    const querySnapshot = await getDocs(q);
                    const squadPlayers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    // 3. Lógica de IA para armar el "Mejor 11" en 4-4-2
                    const formation = { ARQ: 1, DEF: 4, MED: 4, DEL: 2 };
                    const best11 = [];
                    const availablePlayers = [...squadPlayers];

                    const selectBest = (pos, attr, count) => {
                        availablePlayers.sort((a, b) => b.atributos[attr] - a.atributos[attr]);
                        const selected = availablePlayers.filter(p => p.posicion === pos).slice(0, count);
                        best11.push(...selected);
                        selected.forEach(s => {
                            const index = availablePlayers.findIndex(p => p.id === s.id);
                            if (index > -1) availablePlayers.splice(index, 1);
                        });
                    };
                    
                    selectBest('Arquero', 'porteria', formation.ARQ);
                    selectBest('Defensor', 'defensa', formation.DEF);
                    selectBest('Mediocampista', 'mediocampo', formation.MED);
                    selectBest('Delantero', 'ataque', formation.DEL);
                    
                    setOpponentData({
                        teamInfo: opponentTeamInfo,
                        starters: best11,
                    });

                } catch (error) {
                    console.error("Error analyzing opponent:", error);
                }
                setLoading(false);
            };
            findAndAnalyzeOpponent();
        }
    }, [gameSession]);

    if (loading) {
        return <div className="text-center text-white">Analizando al rival...</div>;
    }

    if (!opponentData || opponentData.isResting) {
        return <div className="text-center text-white"><h2>Esta jornada tu equipo descansa.</h2></div>;
    }

    const { teamInfo, starters } = opponentData;
    const formationPositions = [ // Posiciones para un 4-4-2
        { top: '88%', left: '50%' }, { top: '70%', left: '15%' }, { top: '75%', left: '35%' }, { top: '75%', left: '65%' }, { top: '70%', left: '85%' },
        { top: '50%', left: '15%' }, { top: '50%', left: '35%' }, { top: '50%', left: '65%' }, { top: '50%', left: '85%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' }
    ];

    return (
        <div className="tactics-container">
            <h2 className="text-white text-center mb-4">Análisis del Rival: {teamInfo.nombreCorto}</h2>
            <div className="player-table-container card bg-dark text-white mb-4">
                <table className="table table-dark table-sm table-hover tactics-player-table">
                    <thead>
                        <tr><th>Jugador</th><th>Posición</th><th>POR</th><th>DEF</th><th>MED</th><th>ATA</th><th>VEL</th></tr>
                    </thead>
                    <tbody>
                        {starters.map(player => (
                            <tr key={player.id} className={getPositionColorClass(player.posicion)}>
                                <td className="text-start">{player.nombreCompleto}</td>
                                <td>{player.posicion}</td>
                                <td>{player.atributos.porteria}</td>
                                <td>{player.atributos.defensa}</td>
                                <td>{player.atributos.mediocampo}</td>
                                <td>{player.atributos.ataque}</td>
                                <td>{player.atributos.velocidad}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="row">
                <div className="col-md-3">
                    <TeamStats players={starters} />
                </div>
                <div className="col-md-9">
                    <div className="pitch">
                        {starters.map((player, index) => (
                            <PlayerDot key={player.id} player={player} position={formationPositions[index]} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewOpponent;