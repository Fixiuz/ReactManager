// src/hooks/useGameSession.js

import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuthContext } from '../context/AuthContext';

export const useGameSession = () => {
    const { user } = useContext(AuthContext);

    const { data, isLoading, isError, error, ...rest } = useQuery({
        queryKey: ['gameSession', user?.uid],
        queryFn: async () => {
            console.log("--- PASO 1: Iniciando useGameSession ---");
            if (!user) {
                console.log("DEBUG: No hay usuario, deteniendo useGameSession.");
                return null;
            }

            const gameDocRef = doc(db, 'partidas', user.uid);
            const gameDocSnap = await getDoc(gameDocRef);

            if (!gameDocSnap.exists()) {
                console.error("ERROR FATAL: No se encontró la partida para el usuario:", user.uid);
                throw new Error("Game session not found for this user.");
            }
            console.log("Paso 1.1: Documento de partida encontrado.");

            const fetchedGameData = { id: gameDocSnap.id, ...gameDocSnap.data() };
            
            if (!fetchedGameData.teamId) {
                console.error("ERROR FATAL: La partida no tiene teamId.", fetchedGameData);
                throw new Error("Game data is corrupted, missing teamId.");
            }

            const teamDocRef = doc(db, 'equipos', fetchedGameData.teamId);
            const teamDocSnap = await getDoc(teamDocRef);
            const fetchedTeamData = teamDocSnap.exists() ? teamDocSnap.data() : null;
            console.log("Paso 1.2: Datos del equipo del usuario cargados.");
            
            console.log("--- PASO 1: useGameSession completado con éxito. ---");
            return {
                ...fetchedGameData,
                team: fetchedTeamData
            };
        },
        enabled: !!user,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    return { gameSession: data, isLoading, isError, error, ...rest };
};