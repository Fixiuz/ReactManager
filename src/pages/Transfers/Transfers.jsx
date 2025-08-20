import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, documentId, orderBy } from 'firebase/firestore';
import './Transfers.css';

const Transfers = () => {
    const { gameSession } = useContext(GameContext);
    const [activeTab, setActiveTab] = useState('transferList');
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]); // <-- Nuevo estado para la lista de equipos
    const [selectedTeam, setSelectedTeam] = useState(null); // <-- Nuevo estado para el equipo seleccionado
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            setPlayers([]);
            setTeams([]);

            try {
                const playersRef = collection(db, "jugadores");
                
                if (activeTab === 'transferList') {
                    const q = query(playersRef, where("isTransferListed", "==", true));
                    const querySnapshot = await getDocs(q);
                    setPlayers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } else if (activeTab === 'freeAgents') {
                    if (gameSession.playerStates) {
                        const freeAgentIds = Object.keys(gameSession.playerStates).filter(
                            playerId => gameSession.playerStates[playerId].equipoId === 'free_agent'
                        );
                        if (freeAgentIds.length > 0) {
                            const q = query(playersRef, where(documentId(), "in", freeAgentIds));
                            const querySnapshot = await getDocs(q);
                            setPlayers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                        }
                    }
                } else if (activeTab === 'scout') {
                    if (selectedTeam) {
                        // Si hay un equipo seleccionado, buscamos sus jugadores
                        const q = query(playersRef, where("equipoId", "==", selectedTeam.id));
                        const querySnapshot = await getDocs(q);
                        setPlayers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    } else {
                        // Si no, buscamos la lista de todos los equipos
                        const teamsRef = collection(db, "equipos");
                        const q = query(teamsRef, orderBy("nombre"));
                        const querySnapshot = await getDocs(q);
                        setTeams(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    }
                }
            } catch (error) {
                console.error("Error fetching content:", error);
            }
            setLoading(false);
        };

        if (gameSession) {
            fetchContent();
        }
    }, [activeTab, selectedTeam, gameSession]); // Se re-ejecuta si cambia la pestaña o el equipo seleccionado

    // --- Nuevas Funciones ---
    const handleTeamSelect = (team) => {
        setSelectedTeam(team);
    };

    const handleBackToTeams = () => {
        setSelectedTeam(null);
    };
    // --------------------

    const handlePlayerClick = (playerId) => {
        navigate(`/player/${playerId}`);
    };

    const calculateOverall = (player) => {
        if (!player || !player.atributos) return 0;
        const { atributos, posicion } = player;
        if (posicion === 'Arquero') return Math.round((atributos.porteria + atributos.velocidad) / 2);
        const { defensa, mediocampo, ataque, velocidad } = atributos;
        return Math.round((defensa + mediocampo + ataque + velocidad) / 4);
    };

    const renderPlayerTable = () => (
        <table className="table table-dark table-hover mb-0 transfers-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Posición</th>
                    <th>Edad</th>
                    <th>Valoración</th>
                    <th>Valor de Mercado</th>
                </tr>
            </thead>
            <tbody>
                {players.length > 0 ? players.map(player => (
                    <tr key={player.id} onClick={() => handlePlayerClick(player.id)} className={`player-row ${gameSession.playerStates[player.id]?.equipoId === gameSession.teamId ? 'my-player-listed' : ''}`}>
                        <td className="align-middle fw-bold">{player.nombreCompleto}</td>
                        <td className="align-middle">{player.posicion}</td>
                        <td className="align-middle">{player.edad}</td>
                        <td className="align-middle fw-bold">{calculateOverall(player)}</td>
                        <td className="align-middle">${player.valor.toLocaleString()}</td>
                    </tr>
                )) : (
                    <tr>
                        <td colSpan="5" className="text-center p-4">No hay jugadores en esta lista.</td>
                    </tr>
                )}
            </tbody>
        </table>
    );

    const renderTeamSelection = () => (
        <div className="row">
            {teams.map(team => (
                <div key={team.id} className="col-6 col-md-4 col-lg-3 mb-4">
                    <div className="team-card" onClick={() => handleTeamSelect(team)}>
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
                <li className="nav-item"><button className={`nav-link ${activeTab === 'transferList' ? 'active' : ''}`} onClick={() => { setActiveTab('transferList'); setSelectedTeam(null); }}>Lista de Transferibles</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'freeAgents' ? 'active' : ''}`} onClick={() => { setActiveTab('freeAgents'); setSelectedTeam(null); }}>Agentes Libres</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'scout' ? 'active' : ''}`} onClick={() => { setActiveTab('scout'); setSelectedTeam(null); }}>Buscar por Club</button></li>
            </ul>

            <div className="card bg-dark text-white">
                {/* --- Lógica de renderizado condicional para la pestaña de búsqueda --- */}
                {activeTab === 'scout' && selectedTeam && (
                     <div className="card-header d-flex justify-content-between align-items-center">
                        <h4 className="mb-0">Plantel de {selectedTeam.nombre}</h4>
                        <button className="btn btn-secondary" onClick={handleBackToTeams}>← Volver a Clubes</button>
                    </div>
                )}

                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center p-5">Cargando...</div>
                    ) : (
                        activeTab === 'scout' && !selectedTeam ? renderTeamSelection() : renderPlayerTable()
                    )}
                </div>
            </div>
        </div>
    );
};

export default Transfers;