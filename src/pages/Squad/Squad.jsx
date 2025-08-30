// src/pages/Squad/Squad.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Squad.css';

// --- Nuestros nuevos Hooks ---
import { useGameSession } from '../../hooks/useGameSession';
import { useSquad } from '../../hooks/useSquad';

const Squad = () => {
    const navigate = useNavigate();
    
    const { gameSession } = useGameSession();
    const { squad, isLoading, isError } = useSquad();

    const handlePlayerClick = (playerId) => {
        navigate(`/player/${playerId}`);
    };
    
    const calculateOverall = (player) => {
        if (!player?.atributos) return 0;
        const { atributos, posicion } = player;
        if (posicion === 'Arquero') {
            return Math.round((atributos.porteria + atributos.velocidad) / 2);
        }
        const { defensa, mediocampo, ataque, velocidad } = atributos;
        return Math.round((defensa + mediocampo + ataque + velocidad) / 4);
    };

    // --- NUEVO: Renderizar estado del jugador ---
    const renderStatus = (player) => {
        const state = player.state || {};
        if (state.injuryMatches > 0) {
            return <span className="badge bg-danger">🤕 Lesionado ({state.injuryMatches})</span>;
        }
        if (state.suspensionMatches > 0) {
            return <span className="badge bg-warning text-dark">🚫 Suspendido ({state.suspensionMatches})</span>;
        }
        return <span className="badge bg-success">✔️ Disponible</span>;
    };

    if (isLoading) {
        return <div className="text-center text-white">Cargando plantel...</div>;
    }

    if (isError) {
        return <div className="text-center text-white">Error al cargar el plantel.</div>;
    }

    return (
        <div className="squad-container">
            <h2 className="text-white text-center mb-4">Plantel Principal - {gameSession?.team?.nombre}</h2>
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
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {squad.map(player => (
                                <tr key={player.id} onClick={() => handlePlayerClick(player.id)} className="player-row">
                                    <td className="align-middle fw-bold">{player.nombreCompleto}</td>
                                    <td className="align-middle">{player.posicion}</td>
                                    <td className="align-middle">{player.state?.seasonStats?.matchesPlayed || 0}</td>
                                    <td className="align-middle">{player.state?.seasonStats?.goals || 0}</td>
                                    <td className="align-middle">{player.state?.seasonStats?.yellowCards || 0}</td>
                                    <td className="align-middle fw-bold">{calculateOverall(player)}</td>
                                    <td className="align-middle">{renderStatus(player)}</td>
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
