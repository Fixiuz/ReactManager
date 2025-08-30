import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import './Positions.css';

const Positions = () => {
    const { gameSession } = useContext(GameContext);
    const [teamsMap, setTeamsMap] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- LOG 1: VER EL ESTADO DE gameSession EN CADA RENDER ---
    // Este es el log más importante. Nos mostrará si gameSession cambia, si se vuelve nulo,
    // o si pierde la propiedad `leagueState` después de simular.
    console.log('[LOG 1] Renderizando Positions. gameSession actual:', gameSession);

    useEffect(() => {
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

    const renderTable = (title, standingsData) => {
        // --- LOG 3: VER QUÉ DATOS LLEGAN A LA FUNCIÓN DE LA TABLA ---
        // Esto nos confirmará si a la tabla le está llegando un array vacío o datos incorrectos.
        console.log(`[LOG 3] Renderizando tabla "${title}". Recibiendo standingsData:`, standingsData);

        // NOTA: La Cloud Function ya devuelve los datos ordenados. Este sort es redundante,
        // pero no debería causar el error. Lo mantenemos para la depuración.
        const sortedStandings = [...(standingsData || [])].sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.dif !== a.dif) return b.dif - a.dif;
            return b.gf - a.gf;
        });

        return (
            <div className="mb-5">
                <h3 className="text-white text-center mb-3">{title}</h3>
                <table className="table table-dark table-striped table-hover positions-table">
                    {/* ... (el resto de la tabla se mantiene igual) ... */}
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
                            
                            // --- LOG 4: VERIFICAR CADA FILA ---
                            // Si vemos este log pero no filas en la tabla, el problema está en el renderizado.
                            // Si no lo vemos, es porque `sortedStandings` está vacío.
                            console.log(`[LOG 4] Mapeando fila ${index + 1}:`, { teamStats, teamEncontrado: team });

                            if (!team) return null;

                            return (
                                <tr key={teamStats.teamId}>
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
    
    // --- LOG 2: VER CON QUÉ DATOS SE VA A RENDERIZAR FINALMENTE ---
    // Este log se mostrará solo cuando todas las cargas hayan terminado y el componente
    // esté listo para mostrar las tablas. Es nuestra "foto final" de los datos.
    console.log('%c[LOG 2] Datos listos para renderizar:', 'color: lightgreen; font-weight: bold;', {
        leagueState: gameSession.leagueState,
        teamsMap: teamsMap
    });


    return (
        <div className="positions-container">
            <h2 className="text-white text-center mb-5">{gameSession.name || 'Temporada Actual'}</h2>
            <div className="row">
                <div className="col-12">
                    {/* Se añade una comprobación para no intentar renderizar si leagueState no existe */}
                    {gameSession.leagueState && gameSession.leagueState.zonaA ? renderTable('Zona A', gameSession.leagueState.zonaA) : <p>No hay datos para Zona A.</p>}
                </div>
                <div className="col-12">
                    {gameSession.leagueState && gameSession.leagueState.zonaB ? renderTable('Zona B', gameSession.leagueState.zonaB) : <p>No hay datos para Zona B.</p>}
                </div>
            </div>
        </div>
    );
};

export default Positions;