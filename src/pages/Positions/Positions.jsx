import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import './Positions.css';

const Positions = () => {
    const { gameSession } = useContext(GameContext);
    const [teamsMap, setTeamsMap] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Cargamos los datos de todos los equipos para tener sus nombres y escudos.
        const fetchTeams = async () => {
            try {
                const teamsCollection = collection(db, 'equipos');
                const teamSnapshot = await getDocs(teamsCollection);
                const teamsData = {};
                teamSnapshot.forEach(doc => {
                    teamsData[doc.id] = doc.data();
                });
                setTeamsMap(teamsData);
            } catch (error) {
                console.error("Error al cargar los equipos:", error);
            }
            setLoading(false);
        };

        fetchTeams();
    }, []);

    // Función para renderizar una tabla de posiciones
    const renderTable = (title, standingsData) => {
        // Ordenamos la tabla por Puntos (descendente), luego por Diferencia de Gol, y luego por Goles a Favor.
        const sortedStandings = [...standingsData].sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.dif !== a.dif) return b.dif - a.dif;
            return b.gf - a.gf;
        });

        return (
            <div className="mb-5">
                <h3 className="text-white text-center mb-3">{title}</h3>
                <table className="table table-dark table-striped table-hover positions-table">
                    <thead>
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col" className="text-start">Equipo</th>
                            <th scope="col">PJ</th>
                            <th scope="col">PG</th>
                            <th scope="col">PE</th>
                            <th scope="col">PP</th>
                            <th scope="col">GF</th>
                            <th scope="col">GC</th>
                            <th scope="col">DIF</th>
                            <th scope="col">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStandings.map((teamStats, index) => {
                            const team = teamsMap[teamStats.teamId];
                            if (!team) return null; // No renderizar si el equipo no se encuentra

                            return (
                                <tr key={team.id}>
                                    <th scope="row">{index + 1}</th>
                                    <td className="text-start team-cell">
                                        <img src={team.escudoURL} alt={team.nombreCorto} className="escudo me-2" />
                                        {team.nombreCorto}
                                    </td>
                                    <td>{teamStats.pj}</td>
                                    <td>{teamStats.pg}</td>
                                    <td>{teamStats.pe}</td>
                                    <td>{teamStats.pp}</td>
                                    <td>{teamStats.gf}</td>
                                    <td>{teamStats.gc}</td>
                                    <td>{teamStats.dif}</td>
                                    <td className="fw-bold">{teamStats.pts}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    if (loading || !gameSession || !teamsMap) {
        return <div className="text-center text-white">Cargando tablas de posiciones...</div>;
    }

    return (
        <div className="positions-container">
            <h2 className="text-white text-center mb-5">{gameSession.name || 'Temporada Actual'}</h2>
            <div className="row">
                <div className="col-12">
                    {renderTable('Zona A', gameSession.leagueState.zonaA)}
                </div>
                <div className="col-12">
                    {renderTable('Zona B', gameSession.leagueState.zonaB)}
                </div>
            </div>
        </div>
    );
};

export default Positions;