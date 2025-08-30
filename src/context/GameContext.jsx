import React, { createContext, useContext } from 'react';
import { useGameSession } from '../hooks/useGameSession';
import { AuthContext } from './AuthContext';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const { gameSession, isLoading } = useGameSession();

    // El contexto ahora provee SIEMPRE los datos actualizados de React Query
    return (
        <GameContext.Provider value={{ gameSession, loadingGame: isLoading }}>
            {children}
        </GameContext.Provider>
    );
};