import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import './Squad.css';

const Squad = () => {
    const { gameSession } = useContext(GameContext);
    const [squad, setSquad] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!gameSession?.playerStates || !gameSession?.teamId) {
            setLoading(false);
            return;
        }

        const fetchSquad = async () => {
            setLoading(true);
            try {
                const playerStates = gameSession.playerStates;
                const myTeamId = gameSession.teamId;

                const myPlayerIds = Object.keys(playerStates).filter(
                    playerId => playerStates[playerId].equipoId === myTeamId
                );

                if (myPlayerIds.length === 0) {
                    setSquad([]);
                    setLoading(false);
                    return;
                }
                
                const playersRef = collection(db, "jugadores");
                const q = query(playersRef, where(documentId(), "in", myPlayerIds));
                
                const querySnapshot = await getDocs(q);
                const staticPlayerData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                const mergedSquad = staticPlayerData.map(staticPlayer => ({
                    ...staticPlayer,
                    state: playerStates[staticPlayer.id]
                }));

                const positionOrder = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
                mergedSquad.sort((a, b) => positionOrder[a.posicion] - positionOrder[b.posicion]);

                setSquad(mergedSquad);
            } catch (error) {
                console.error("Error al cargar el plantel:", error);
            }
            setLoading(false);
        };

        fetchSquad();
    }, [gameSession]);

    const handlePlayerClick = (playerId) => {
        navigate(`/player/${playerId}`);
    };
    
    const calculateOverall = (player) => {
        if (!player || !player.atributos) return 0;
        const { atributos, posicion } = player;
        if (posicion === 'Arquero') {
            return Math.round((atributos.porteria + atributos.velocidad) / 2);
        } else {
            const { defensa, mediocampo, ataque, velocidad } = atributos;
            return Math.round((defensa + mediocampo + ataque + velocidad) / 4);
        }
    };

    if (loading) {
        return <div className="text-center text-white">Cargando plantel...</div>;
    }

    return (
        <div className="squad-container">
            <h2 className="text-white text-center mb-4">Plantel Principal - {gameSession.team.nombre}</h2>
            <div className="card bg-dark text-white">
                <div className="card-body p-0">
                    <table className="table table-dark table-hover mb-0 squad-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Posición</th>
                                <th>PJ</th>
                                <th>Goles</th>
                                <th>T.A.</th>
                                <th>Valoración</th>
                            </tr>
                        </thead>
                        <tbody>
                            {squad.map(player => (
                                <tr key={player.id} onClick={() => handlePlayerClick(player.id)} className="player-row">
                                    <td className="align-middle fw-bold">{player.nombreCompleto}</td>
                                    <td className="align-middle">{player.posicion}</td>
                                    {/* --- MODIFICACIÓN CLAVE --- */}
                                    {/* Leemos los datos de `player.state.seasonStats` */}
                                    <td className="align-middle">{player.state?.seasonStats?.matchesPlayed || 0}</td>
                                    <td className="align-middle">{player.state?.seasonStats?.goals || 0}</td>
                                    <td className="align-middle">{player.state?.seasonStats?.yellowCards || 0}</td>
                                    {/* ------------------------- */}
                                    <td className="align-middle fw-bold">{calculateOverall(player)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Squad;