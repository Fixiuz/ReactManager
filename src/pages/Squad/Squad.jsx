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
                // --- PUNTOS DE DEPURACIÓN ---
                console.log("--- INICIANDO CARGA DE PLANTEL ---");
                const playerStates = gameSession.playerStates;
                const myTeamId = gameSession.teamId;

                console.log("ID de mi equipo:", myTeamId);
                console.log("Estados de jugadores en la partida:", playerStates);

                const myPlayerIds = Object.keys(playerStates).filter(
                    playerId => playerStates[playerId].equipoId === myTeamId
                );

                console.log("IDs de jugadores encontrados para mi equipo:", myPlayerIds);
                // --- FIN DEPURACIÓN ---

                if (myPlayerIds.length === 0) {
                    console.warn("Advertencia: No se encontraron jugadores para el equipo actual en playerStates. La tabla quedará vacía.");
                    setSquad([]);
                    setLoading(false);
                    return;
                }
                
                const playersRef = collection(db, "jugadores");
                // Usamos documentId() que es la forma correcta de consultar por el ID del documento
                const q = query(playersRef, where(documentId(), "in", myPlayerIds));
                
                const querySnapshot = await getDocs(q);
                const staticPlayerData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                console.log("Datos fijos de jugadores traídos de la BD:", staticPlayerData);
                
                const mergedSquad = staticPlayerData.map(staticPlayer => ({
                    ...staticPlayer,
                    state: playerStates[staticPlayer.id]
                }));

                const positionOrder = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
                mergedSquad.sort((a, b) => positionOrder[a.posicion] - positionOrder[b.posicion]);

                setSquad(mergedSquad);
                 console.log("--- PLANTEL FINAL FUSIONADO ---", mergedSquad);
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
                                <th>Edad</th>
                                <th>Valoración</th>
                                <th>Contrato Restante</th>
                            </tr>
                        </thead>
                        <tbody>
                            {squad.map(player => (
                                <tr key={player.id} onClick={() => handlePlayerClick(player.id)} className="player-row">
                                    <td className="align-middle fw-bold">{player.nombreCompleto}</td>
                                    <td className="align-middle">{player.posicion}</td>
                                    <td className="align-middle">{player.edad}</td>
                                    <td className="align-middle fw-bold">{calculateOverall(player)}</td>
                                    <td className={`align-middle fw-bold ${player.state?.contractYears === 1 ? 'contract-warning' : ''}`}>
                                        {player.state?.contractYears ? `${player.state.contractYears} año(s)` : 'N/A'}
                                    </td>
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