// src/pages/Transfers/Transfers.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Transfers.css';

import { useGameSession } from '../../hooks/useGameSession';
import { useTransfers } from '../../hooks/useTransfers';

const Transfers = () => {
    const navigate = useNavigate();
    
    // El estado de la UI se mantiene en el componente
    const [activeTab, setActiveTab] = useState('transferList');
    const [selectedTeam, setSelectedTeam] = useState(null);

    // Obtenemos los datos y estados de nuestros hooks
    const { gameSession } = useGameSession();
    const { players, teams, isLoading } = useTransfers(activeTab, selectedTeam?.id);

    const handlePlayerClick = (playerId) => {
        navigate(`/player/${playerId}`);
    };

    const calculateOverall = (player) => {
        if (!player?.atributos) return 0;
        const { atributos, posicion } = player;
        if (posicion === 'Arquero') return Math.round((atributos.porteria + atributos.velocidad) / 2);
        const { defensa, mediocampo, ataque, velocidad } = atributos;
        return Math.round((defensa + mediocampo + ataque + velocidad) / 4);
    };

    const handleTabClick = (tabName) => {
        setActiveTab(tabName);
        setSelectedTeam(null);
    };

    const renderPlayerTable = () => (
        <table className="table table-dark table-hover mb-0 transfers-table">
            <thead>
                <tr><th>Nombre</th><th>Posición</th><th>Edad</th><th>Valoración</th><th>Valor de Mercado</th></tr>
            </thead>
            <tbody>
                {players.length > 0 ? players.map(player => (
                    <tr key={player.id} onClick={() => handlePlayerClick(player.id)} className={`player-row ${gameSession?.playerStates[player.id]?.equipoId === gameSession?.teamId ? 'my-player-listed' : ''}`}>
                        <td className="align-middle fw-bold">{player.nombreCompleto}</td><td className="align-middle">{player.posicion}</td><td className="align-middle">{player.edad}</td><td className="align-middle fw-bold">{calculateOverall(player)}</td><td className="align-middle">${player.valor.toLocaleString()}</td>
                    </tr>
                )) : (
                    <tr><td colSpan="5" className="text-center p-4">No hay jugadores que cumplan los criterios.</td></tr>
                )}
            </tbody>
        </table>
    );

    const renderTeamSelection = () => (
        <div className="row p-3">
            {teams.map(team => (
                <div key={team.id} className="col-6 col-md-4 col-lg-3 mb-4">
                    <div className="team-card" onClick={() => setSelectedTeam(team)}>
                        <img src={team.escudoURL} alt={team.nombreCorto} className="team-logo" />
                        <span className="team-name">{team.nombreCorto}</span>
                    </div>
                </div>
            ))}
        </div>
    );
    
    return (
        <div className="transfers-container">
            <h2 className="text-white text-center mb-4">Mercado de Fichajes</h2>
            <ul className="nav nav-tabs nav-fill mb-4">
                <li className="nav-item"><button className={`nav-link ${activeTab === 'transferList' ? 'active' : ''}`} onClick={() => handleTabClick('transferList')}>Lista de Transferibles</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'freeAgents' ? 'active' : ''}`} onClick={() => handleTabClick('freeAgents')}>Agentes Libres</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'scout' ? 'active' : ''}`} onClick={() => handleTabClick('scout')}>Buscar por Club</button></li>
            </ul>
            <div className="card bg-dark text-white">
                {activeTab === 'scout' && selectedTeam && (
                     <div className="card-header d-flex justify-content-between align-items-center">
                        <h4 className="mb-0">Plantel de {selectedTeam.nombre}</h4>
                        <button className="btn btn-secondary" onClick={() => setSelectedTeam(null)}>← Volver a Clubes</button>
                    </div>
                )}
                <div className="card-body p-0">
                    {isLoading ? (<div className="text-center p-5">Cargando...</div>) : (activeTab === 'scout' && !selectedTeam ? renderTeamSelection() : renderPlayerTable())}
                </div>
            </div>
        </div>
    );
};

export default Transfers;