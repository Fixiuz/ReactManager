// src/pages/Formation/Formation.jsx

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './Formation.css';

import { useSquad } from '../../hooks/useSquad';
import { useGameSession } from '../../hooks/useGameSession';
import { useTeamSetup } from '../../hooks/useTeamSetup';

const Formation = () => {
    const { gameSession } = useGameSession();
    const { squad, isLoading } = useSquad();
    const { saveLineup, isSavingLineup } = useTeamSetup();
    
    const [starters, setStarters] = useState([]);
    const [substitutes, setSubstitutes] = useState([]);
    const [reserves, setReserves] = useState([]);
    
    const [draggedPlayer, setDraggedPlayer] = useState(null);

    useEffect(() => {
        if (squad && gameSession?.lineup) {
            const { lineup } = gameSession;
            const getPlayerById = (id) => squad.find(p => p.id === id);

            setStarters(lineup.starters.map(getPlayerById).filter(Boolean));
            setSubstitutes(lineup.substitutes.map(getPlayerById).filter(Boolean));
            setReserves(lineup.reserves.map(getPlayerById).filter(Boolean));
        }
    }, [squad, gameSession?.lineup]);

    const handleSaveChanges = () => {
        if (starters.length !== 11) {
            Swal.fire('Equipo Incompleto', 'Debes tener 11 jugadores titulares para guardar.', 'error');
            return;
        }
        saveLineup({ starters, substitutes, reserves });
    };

    const handleDragStart = (e, player, sourceList) => {
        setDraggedPlayer({ player, sourceList });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = (targetList, targetPlayer = null) => {
        if (!draggedPlayer) return;
        const { player: dragged, sourceList } = draggedPlayer;

        // 🚫 Bloqueo: no permitir mover jugadores lesionados o suspendidos como titulares
        if (targetList === "starters" && (dragged.state?.suspensionMatches > 0 || dragged.state?.injuryMatches > 0)) {
            Swal.fire('Jugador no disponible', 'Este jugador está suspendido o lesionado y no puede ser titular.', 'warning');
            return;
        }

        let lists = {
            starters: [...starters],
            substitutes: [...substitutes],
            reserves: [...reserves],
        };

        lists[sourceList] = lists[sourceList].filter(p => p.id !== dragged.id);

        if (targetPlayer) {
            const targetIndex = lists[targetList].findIndex(p => p.id === targetPlayer.id);
            lists[targetList] = lists[targetList].filter(p => p.id !== targetPlayer.id);
            lists[targetList].splice(targetIndex, 0, dragged);
            lists[sourceList].push(targetPlayer);
        } else {
            lists[targetList].push(dragged);
        }

        setStarters(lists.starters);
        setSubstitutes(lists.substitutes);
        setReserves(lists.reserves);
        setDraggedPlayer(null);
    };

    const renderPlayerRows = (players, listName) => {
        return players.map(player => {
            const unavailable = player.state?.suspensionMatches > 0 || player.state?.injuryMatches > 0;
            return (
                <tr 
                    key={player.id}
                    draggable
                    className={unavailable ? "table-danger" : ""}
                    onDragStart={(e) => handleDragStart(e, player, listName)}
                    onDrop={(e) => { e.stopPropagation(); handleDrop(listName, player); }}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <td>
                        {player.nombreCompleto}{" "}
                        {unavailable && (
                            <span className="badge bg-danger ms-2">
                                {player.state?.injuryMatches > 0 ? `🤕 (${player.state.injuryMatches})` : `🚫 (${player.state?.suspensionMatches})`}
                            </span>
                        )}
                    </td>
                    <td>{player.posicion.substring(0, 3).toUpperCase()}</td>
                    <td>{player.edad}</td>
                    <td>{player.atributos.porteria}</td>
                    <td>{player.atributos.defensa}</td>
                    <td>{player.atributos.mediocampo}</td>
                    <td>{player.atributos.ataque}</td>
                    <td>{player.atributos.velocidad}</td>
                </tr>
            );
        });
    };

    if (isLoading) {
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
                <button className="btn btn-success" onClick={handleSaveChanges} disabled={isSavingLineup}>
                    {isSavingLineup ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
            
            <div className="player-list-container mb-4">
                <h4 className="text-white-50">11 Titulares ({starters.length})</h4>
                <table className="table table-dark table-sm table-hover formation-table">
                    <thead><tr><th>Jugador</th><th>Pos.</th><th>Edad</th><th>POR</th><th>DEF</th><th>MED</th><th>ATA</th><th>VEL</th></tr></thead>
                    <tbody onDragOver={handleDragOver} onDrop={() => handleDrop('starters')}>
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
                    <thead><tr><th>Jugador</th><th>Pos.</th><th>Edad</th><th>POR</th><th>DEF</th><th>MED</th><th>ATA</th><th>VEL</th></tr></thead>
                    <tbody onDragOver={handleDragOver} onDrop={() => handleDrop('substitutes')}>
                        {renderPlayerRows(substitutes, 'substitutes')}
                    </tbody>
                </table>
            </div>

            <div className="player-list-container">
                <h4 className="text-white-50">Jugadores no Convocados ({reserves.length})</h4>
                <table className="table table-dark table-sm table-hover formation-table">
                    <thead><tr><th>Jugador</th><th>Pos.</th><th>Edad</th><th>POR</th><th>DEF</th><th>MED</th><th>ATA</th><th>VEL</th></tr></thead>
                    <tbody onDragOver={handleDragOver} onDrop={() => handleDrop('reserves')}>
                        {renderPlayerRows(reserves, 'reserves')}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Formation;
