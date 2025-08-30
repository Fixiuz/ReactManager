import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { AuthContext } from '../../context/AuthContext';
import { GameContext } from '../../context/GameContext';
import { auth, db } from '../../firebase/config';

const Header = () => {
    const { user } = useContext(AuthContext);
    const { gameSession } = useContext(GameContext);
    const navigate = useNavigate();
    const [nextMatchInfo, setNextMatchInfo] = useState('Cargando próximo partido...');

    useEffect(() => {
        const fetchNextMatchDetails = async () => {
            if (gameSession && gameSession.fixture) {
                const currentFixture = gameSession.fixture.find(j => j.jornada === gameSession.currentJornada);
                if (currentFixture) {
                    const match = currentFixture.matches.find(m => m.home === gameSession.teamId || m.away === gameSession.teamId);
                    if (match) {
                        try {
                            const homeTeamDoc = await getDoc(doc(db, 'equipos', match.home));
                            const awayTeamDoc = await getDoc(doc(db, 'equipos', match.away));
                            if (homeTeamDoc.exists() && awayTeamDoc.exists()) {
                                const homeTeamName = homeTeamDoc.data().nombreCorto;
                                const awayTeamName = awayTeamDoc.data().nombreCorto;
                                setNextMatchInfo(`Jornada ${gameSession.currentJornada}: ${homeTeamName} vs ${awayTeamName}`);
                            }
                        } catch (error) {
                            setNextMatchInfo(`Jornada ${gameSession.currentJornada}`);
                        }
                    } else {
                        setNextMatchInfo(`Jornada ${gameSession.currentJornada}: Descansa`);
                    }
                }
            }
        };
        fetchNextMatchDetails();
    }, [gameSession]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const handleEndGame = async () => {
        if (!user) return;
        const isConfirmed = window.confirm("¿Estás seguro de que quieres finalizar tu partida actual? Todo tu progreso se borrará y deberás empezar una nueva.");
        if (isConfirmed) {
            try {
                const gameDocRef = doc(db, 'partidas', user.uid);
                await deleteDoc(gameDocRef);
                window.location.reload();
            } catch (error) {
                alert("Hubo un error al intentar finalizar tu partida.");
            }
        }
    };

    if (!gameSession) {
        return <header className="bg-light p-3 border-bottom shadow-sm">Cargando...</header>;
    }

    return (
        <header className="bg-light p-3 border-bottom shadow-sm">
            <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <img src={gameSession.team.escudoURL} alt="Escudo" style={{ width: '30px', marginRight: '10px' }} />
                    <span className="fw-bold">{gameSession.team.nombre}</span>
                </div>
                <span>{nextMatchInfo}</span>
                <div className="d-flex align-items-center">
                    <span className="me-3">Manager: {gameSession.managerName}</span>
                    <button onClick={handleEndGame} className="btn btn-warning btn-sm me-2">
                        Finalizar Partida
                    </button>
                    <button onClick={handleLogout} className="btn btn-danger btn-sm">
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;