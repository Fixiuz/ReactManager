import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import './Results.css';

const Results = () => {
    const { gameSession } = useContext(GameContext);
    const [teamsMap, setTeamsMap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedJornada, setSelectedJornada] = useState(1);

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

    useEffect(() => {
        if (gameSession) {
            // Al cargar, la vista se posiciona en la jornada actual del usuario
            setSelectedJornada(gameSession.currentJornada);
        }
    }, [gameSession]);

    if (loading || !gameSession || !teamsMap) {
        return <div className="text-center text-white">Cargando resultados...</div>;
    }

    // --- LÓGICA CORREGIDA ---
    const totalJornadas = gameSession.fixture.length;

    const handlePreviousJornada = () => {
        setSelectedJornada(prev => Math.max(1, prev - 1));
    };

    const handleNextJornada = () => {
        setSelectedJornada(prev => Math.min(totalJornadas, prev + 1));
    };
    
    const jornadaData = gameSession.fixture.find(j => j.jornada === selectedJornada);

    return (
        <div className="results-container">
            <h2 className="text-white text-center mb-4">Resultados - {gameSession.name}</h2>

            <div className="jornada-navigation card bg-dark text-white p-3 mb-4 d-flex flex-row justify-content-between align-items-center">
                <button 
                    className="btn btn-secondary" 
                    onClick={handlePreviousJornada}
                    // Se deshabilita solo si estamos en la primera jornada
                    disabled={selectedJornada <= 1}
                >
                    &lt; Anterior
                </button>
                <span className="fw-bold fs-5">Jornada {selectedJornada}</span>
                <button 
                    className="btn btn-secondary" 
                    onClick={handleNextJornada}
                    // Se deshabilita solo si estamos en la última jornada del fixture
                    disabled={selectedJornada >= totalJornadas}
                >
                    Siguiente &gt;
                </button>
            </div>

            <div className="results-list">
                {jornadaData && jornadaData.matches.map((match, index) => {
                    const homeTeam = teamsMap[match.home];
                    const awayTeam = teamsMap[match.away];

                    if (!homeTeam || !awayTeam) return null;

                    const homeGoals = match.result ? match.result.homeGoals : '-';
                    const awayGoals = match.result ? match.result.awayGoals : '-';

                    return (
                        <div key={index} className="match-result-card card card-body mb-2">
                            <span className="team-name text-end">
                                {homeTeam.nombreCorto}
                                <img src={homeTeam.escudoURL} alt={homeTeam.nombreCorto} className="escudo ms-2" />
                            </span>
                            <span className="score mx-3">
                                {homeGoals} : {awayGoals}
                            </span>
                            <span className="team-name text-start">
                                <img src={awayTeam.escudoURL} alt={awayTeam.nombreCorto} className="escudo me-2" />
                                {awayTeam.nombreCorto}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Results;