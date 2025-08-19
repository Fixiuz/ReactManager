import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './Formation.css';

const Formation = () => {
    const { gameSession, updateCurrentGameSession } = useContext(GameContext);
    
    const [allPlayers, setAllPlayers] = useState([]);
    const [starters, setStarters] = useState([]);
    const [substitutes, setSubstitutes] = useState([]);
    const [reserves, setReserves] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [draggedPlayer, setDraggedPlayer] = useState(null);
    const [dragOverPlayerId, setDragOverPlayerId] = useState(null);

    useEffect(() => {
        if (gameSession && gameSession.squad) {
            const fetchAndSetSquad = async () => {
                setLoading(true);
                try {
                    const playersRef = collection(db, "jugadores");
                    const q = query(playersRef, where("equipoId", "==", gameSession.teamId));
                    const querySnapshot = await getDocs(q);
                    const squadPlayers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setAllPlayers(squadPlayers);

                    const { squad } = gameSession;
                    const findAndSet = (ids) => ids.map(id => squadPlayers.find(p => p.id === id)).filter(Boolean);

                    setStarters(findAndSet(squad.starters));
                    setSubstitutes(findAndSet(squad.substitutes));
                    setReserves(findAndSet(squad.reserves));
                    
                } catch (error) {
                    console.error("Error fetching squad:", error);
                }
                setLoading(false);
            };
            fetchAndSetSquad();
        }
    }, [gameSession]);

    const handleSaveChanges = async () => {
        if (!gameSession) return;
        setIsSaving(true);
        try {
            const gameDocRef = doc(db, "partidas", gameSession.userId);
            const newSquadData = {
                starters: starters.map(p => p.id),
                substitutes: substitutes.map(p => p.id),
                reserves: reserves.map(p => p.id),
            };

            await updateDoc(gameDocRef, { squad: newSquadData });
            updateCurrentGameSession({ squad: newSquadData });

            Swal.fire({
                title: '¡Guardado!',
                text: 'Tu alineación ha sido guardada con éxito.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error("Error al guardar la alineación:", error);
            Swal.fire('Error', 'Hubo un problema al guardar los cambios.', 'error');
        }
        setIsSaving(false);
    };

    const handleDragStart = (e, player, sourceList) => {
        setDraggedPlayer({ player, sourceList });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, targetPlayer, targetList) => {
        e.stopPropagation();
        setDragOverPlayerId(null); 

        if (!draggedPlayer || !targetPlayer) return;

        const { player: dragged, sourceList } = draggedPlayer;
        if (dragged.id === targetPlayer.id) return;

        // --- REGLA: LÍMITE DE 1 ARQUERO ---
        if (targetList === 'starters' && dragged.posicion === 'Arquero' && targetPlayer.posicion !== 'Arquero') {
            const currentGoalkeepers = starters.filter(p => p.posicion === 'Arquero');
            if (currentGoalkeepers.length >= 1) {
                Swal.fire('Movimiento no permitido', 'Solo puede haber un arquero en el equipo titular.', 'error');
                setDraggedPlayer(null);
                return;
            }
        }

        if (targetList === 'starters' && dragged.posicion !== targetPlayer.posicion) {
            const result = await Swal.fire({
                title: '¿Posición Incorrecta!',
                text: `${dragged.nombreCompleto} (${dragged.posicion}) no juega naturalmente como ${targetPlayer.posicion}. ¿Estás seguro de que quieres hacer el cambio?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, mover igual',
                cancelButtonText: 'Cancelar'
            });

            if (!result.isConfirmed) {
                setDraggedPlayer(null);
                return;
            }
        }

        let newStarters = [...starters];
        let newSubstitutes = [...substitutes];
        let newReserves = [...reserves];

        const getList = (listName) => {
            if (listName === 'starters') return newStarters;
            if (listName === 'substitutes') return newSubstitutes;
            return newReserves;
        };

        const sourcePlayerList = getList(sourceList);
        const targetPlayerList = getList(targetList);

        const draggedIndex = sourcePlayerList.findIndex(p => p.id === dragged.id);
        const targetIndex = targetPlayerList.findIndex(p => p.id === targetPlayer.id);

        sourcePlayerList.splice(draggedIndex, 1);
        if (sourceList !== targetList) {
            targetPlayerList.splice(targetIndex, 1);
        }

        targetPlayerList.splice(targetIndex, 0, dragged);
        if (sourceList !== targetList) {
            sourcePlayerList.splice(draggedIndex, 0, targetPlayer);
        }

        setStarters(newStarters);
        setSubstitutes(newSubstitutes);
        setReserves(newReserves);

        setDraggedPlayer(null);
    };

    const renderPlayerRows = (players, listName) => {
        return players.map(player => (
            <tr 
                key={player.id}
                draggable
                onDragStart={(e) => handleDragStart(e, player, listName)}
                onDrop={(e) => handleDrop(e, player, listName)}
                onDragEnter={() => setDragOverPlayerId(player.id)}
                className={`draggable-player ${dragOverPlayerId === player.id ? 'drag-over-highlight' : ''}`}
            >
                <td>{player.nombreCompleto}</td>
                <td>{player.posicion.substring(0, 3).toUpperCase()}</td>
                <td>{player.edad}</td>
                <td>{player.atributos.porteria}</td>
                <td>{player.atributos.defensa}</td>
                <td>{player.atributos.mediocampo}</td>
                <td>{player.atributos.ataque}</td>
                <td>{player.atributos.velocidad}</td>
            </tr>
        ));
    };

    if (loading) {
        return <div className="text-center text-white">Cargando plantel...</div>;
    }

    const goalkeepers = starters.filter(p => p.posicion === 'Arquero');
    const defenders = starters.filter(p => p.posicion === 'Defensor');
    const midfielders = starters.filter(p => p.posicion === 'Mediocampista');
    const forwards = starters.filter(p => p.posicion === 'Delantero');

    return (
        <div className="formation-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-white mb-0">Alineación y Plantel</h2>
                <button 
                    className="btn btn-success" 
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                >
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
            
            <div className="player-list-container mb-4">
                <h4 className="text-white-50">11 Titulares ({starters.length})</h4>
                <table className="table table-dark table-sm table-hover formation-table">
                    <thead>
                        <tr>
                            <th>Jugador</th><th>Pos.</th><th>Edad</th><th>POR</th><th>DEF</th><th>MED</th><th>ATA</th><th>VEL</th>
                        </tr>
                    </thead>
                    <tbody onDragOver={handleDragOver} onDragLeave={() => setDragOverPlayerId(null)}>
                        <tr className="position-header"><td colSpan="8">Arqueros</td></tr>
                        {renderPlayerRows(goalkeepers, 'starters')}

                        <tr className="position-header"><td colSpan="8">Defensores</td></tr>
                        {renderPlayerRows(defenders, 'starters')}

                        <tr className="position-header"><td colSpan="8">Mediocampistas</td></tr>
                        {renderPlayerRows(midfielders, 'starters')}

                        <tr className="position-header"><td colSpan="8">Delanteros</td></tr>
                        {renderPlayerRows(forwards, 'starters')}
                    </tbody>
                </table>
            </div>

            <div className="player-list-container mb-4">
                <h4 className="text-white-50">Jugadores Convocados (Suplentes) ({substitutes.length})</h4>
                <table className="table table-dark table-sm table-hover formation-table">
                    <thead>
                        <tr>
                            <th>Jugador</th><th>Pos.</th><th>Edad</th><th>POR</th><th>DEF</th><th>MED</th><th>ATA</th><th>VEL</th>
                        </tr>
                    </thead>
                    <tbody onDragOver={handleDragOver} onDragLeave={() => setDragOverPlayerId(null)}>
                        {renderPlayerRows(substitutes, 'substitutes')}
                    </tbody>
                </table>
            </div>
            <div className="player-list-container mb-4">
                <h4 className="text-white-50">Jugadores no Convocados ({reserves.length})</h4>
                <table className="table table-dark table-sm table-hover formation-table">
                    <thead>
                        <tr>
                            <th>Jugador</th><th>Pos.</th><th>Edad</th><th>POR</th><th>DEF</th><th>MED</th><th>ATA</th><th>VEL</th>
                        </tr>
                    </thead>
                    <tbody onDragOver={handleDragOver} onDragLeave={() => setDragOverPlayerId(null)}>
                        {renderPlayerRows(reserves, 'reserves')}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Formation;