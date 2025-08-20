import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './Transfers.css';

const Transfers = () => {
    const [activeTab, setActiveTab] = useState('transferList');
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlayers = async () => {
            setLoading(true);
            try {
                const playersRef = collection(db, "jugadores");
                let q;

                if (activeTab === 'transferList') {
                    q = query(playersRef, where("isTransferListed", "==", true));
                }
                // Aquí añadiremos la lógica para 'freeAgents' y 'scout' en el futuro

                if (q) {
                    const querySnapshot = await getDocs(q);
                    const fetchedPlayers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setPlayers(fetchedPlayers);
                } else {
                    setPlayers([]);
                }

            } catch (error) {
                console.error("Error fetching players:", error);
            }
            setLoading(false);
        };

        fetchPlayers();
    }, [activeTab]); // Se ejecuta cada vez que cambiamos de pestaña

    const handlePlayerClick = (playerId) => {
        navigate(`/player/${playerId}`); // Reutilizamos la vista de detalle
    };

    const calculateOverall = (player) => {
        if (!player || !player.atributos) return 0;
        const { atributos, posicion } = player;
        if (posicion === 'Arquero') return Math.round((atributos.porteria + atributos.velocidad) / 2);
        return Math.round((atributos.defensa + atributos.mediocampo + atributos.ataque + atributos.velocidad) / 4);
    };

    return (
        <div className="transfers-container">
            <h2 className="text-white text-center mb-4">Mercado de Fichajes</h2>

            {/* Navegación por Pestañas */}
            <ul className="nav nav-tabs nav-fill mb-4">
                <li className="nav-item"><button className={`nav-link ${activeTab === 'transferList' ? 'active' : ''}`} onClick={() => setActiveTab('transferList')}>Lista de Transferibles</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'freeAgents' ? 'active' : ''}`} onClick={() => setActiveTab('freeAgents')} disabled>Agentes Libres</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'scout' ? 'active' : ''}`} onClick={() => setActiveTab('scout')} disabled>Buscar por Club</button></li>
            </ul>

            {/* Tabla de Jugadores */}
            <div className="card bg-dark text-white">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center p-5">Cargando jugadores...</div>
                    ) : (
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
                                    <tr key={player.id} onClick={() => handlePlayerClick(player.id)} className="player-row">
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default Transfers;