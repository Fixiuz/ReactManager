import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import './Fixture.css';

const Fixture = () => {
    const { gameSession } = useContext(GameContext);
    const [teamsMap, setTeamsMap] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Esta función carga todos los equipos una sola vez y los guarda
        // en un formato fácil de consultar (un "mapa" o diccionario).
        const fetchTeams = async () => {
            const teamsCollection = collection(db, 'equipos');
            const teamSnapshot = await getDocs(teamsCollection);
            const teamsData = {};
            teamSnapshot.forEach(doc => {
                teamsData[doc.id] = doc.data();
            });
            setTeamsMap(teamsData);
            setLoading(false);
        };

        fetchTeams();
    }, []);

    if (loading || !gameSession || !teamsMap) {
        return <div className="text-center text-white">Cargando fixture...</div>;
    }

    return (
        <div className="fixture-container">
            <h2 className="text-white text-center mb-4">{gameSession.name || 'Temporada Actual'}</h2>
            
            {gameSession.fixture.map(({ jornada, matches }) => (
                <div key={jornada} className="jornada-card card mb-4">
                    <div className="card-header fw-bold">
                        Jornada {jornada}
                    </div>
                    <ul className="list-group list-group-flush">
                        {matches.map((match, index) => {
                            const homeTeam = teamsMap[match.home];
                            const awayTeam = teamsMap[match.away];

                            // Si por alguna razón un equipo no se encuentra, mostramos el ID
                            if (!homeTeam || !awayTeam) {
                                return (
                                    <li key={index} className="list-group-item">
                                        Partido no disponible
                                    </li>
                                );
                            }

                            return (
                                <li key={index} className="list-group-item d-flex justify-content-center align-items-center">
                                    <span className="team-name text-end">
                                        {homeTeam.nombreCorto}
                                        <img src={homeTeam.escudoURL} alt={homeTeam.nombreCorto} className="escudo ms-2" />
                                    </span>
                                    <span className="vs-separator mx-3">VS</span>
                                    <span className="team-name text-start">
                                        <img src={awayTeam.escudoURL} alt={awayTeam.nombreCorto} className="escudo me-2" />
                                        {awayTeam.nombreCorto}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default Fixture;