// src/hooks/useSquad.js

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useGameSession } from './useGameSession';

export const useSquad = () => {
    const { gameSession } = useGameSession();

    const { data: squad, isLoading, isError, error } = useQuery({
        queryKey: ['squad', gameSession?.userId],
        queryFn: async () => {
            if (!gameSession?.playerStates) return [];
            const playerStates = gameSession.playerStates;
            const myTeamId = gameSession.teamId;
            const myPlayerIds = Object.keys(playerStates).filter(
                playerId => playerStates[playerId]?.equipoId === myTeamId
            );
            if (myPlayerIds.length === 0) return [];
            const playersRef = collection(db, "jugadores");
            const q = query(playersRef, where(documentId(), "in", myPlayerIds));
            const querySnapshot = await getDocs(q);
            const staticPlayerData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Mezcla los datos estáticos con los estados
            return staticPlayerData.map(p => ({
                ...p,
                state: playerStates[p.id] || {}
            }));
        },
        enabled: !!gameSession,
    });

    return { squad, isLoading, isError, error };
};