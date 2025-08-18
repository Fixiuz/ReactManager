import React, { createContext, useState, useEffect, useContext } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuthContext } from './AuthContext';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
    const [gameSession, setGameSession] = useState(null);
    const [loadingGame, setLoadingGame] = useState(true);

    const { user, loading: loadingAuth } = useContext(AuthContext);

    useEffect(() => {
        const fetchGameSession = async () => {
            if (loadingAuth) return;

            setLoadingGame(true);
            setGameSession(null);

            if (user) {
                try {
                    const gameDocRef = doc(db, 'partidas', user.uid);
                    const gameDocSnap = await getDoc(gameDocRef);

                    if (gameDocSnap.exists()) {
                        const fetchedGameData = { id: gameDocSnap.id, ...gameDocSnap.data() };
                        const teamDocRef = doc(db, 'equipos', fetchedGameData.teamId);
                        const teamDocSnap = await getDoc(teamDocRef);

                        if (teamDocSnap.exists()) {
                            const fetchedTeamData = teamDocSnap.data();
                            setGameSession({
                                ...fetchedGameData,
                                team: fetchedTeamData
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error al cargar la sesión de juego:", error);
                }
            }
            setLoadingGame(false);
        };

        fetchGameSession();
    }, [user, loadingAuth]);

    // --- NUEVA FUNCIÓN PARA ACTUALIZAR EL ESTADO GLOBAL ---
    // Esta función actualizará el estado local de gameSession inmediatamente
    const updateCurrentGameSession = (newData) => {
        setGameSession(prevSession => ({
            ...prevSession,
            ...newData
        }));
    };

    return (
        <GameContext.Provider value={{ gameSession, loadingGame, updateCurrentGameSession }}>
            {children}
        </GameContext.Provider>
    );
};