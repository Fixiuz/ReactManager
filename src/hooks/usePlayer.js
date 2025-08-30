// src/hooks/usePlayer.js

import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useGameSession } from './useGameSession';

export const usePlayer = (playerId) => {
    const { gameSession, isLoading: isGameSessionLoading } = useGameSession();

    const { data: player, isLoading, isError } = useQuery({
        queryKey: ['player', playerId, gameSession?.teamId],
        queryFn: async () => {
            const playerRef = doc(db, 'jugadores', playerId);
            const playerSnap = await getDoc(playerRef);

            if (!playerSnap.exists()) {
                throw new Error("Player static data not found.");
            }
            const staticData = { id: playerSnap.id, ...playerSnap.data() };
            const playerState = gameSession.playerStates?.[playerId];

            return {
                ...staticData,
                state: playerState || {
                    equipoId: staticData.equipoId,
                    salary: staticData.salary,
                    contractYears: staticData.contractYears,
                    isTransferListed: staticData.isTransferListed || false,
                }
            };
        },
        enabled: !!playerId && !!gameSession,
    });

    return { player, isLoading: isLoading || isGameSessionLoading, isError };
};