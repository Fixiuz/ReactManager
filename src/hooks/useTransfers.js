// src/hooks/useTransfers.js

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, documentId, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useGameSession } from './useGameSession';

export const useTransfers = (activeTab, selectedTeamId = null) => {
    const { gameSession, isLoading: isGameSessionLoading } = useGameSession();

    const { data: players, isLoading: isLoadingPlayers, isError } = useQuery({
        queryKey: ['transfers', activeTab, selectedTeamId, gameSession?.userId],
        queryFn: async () => {
            const playersRef = collection(db, "jugadores");
            let q;
    
            if (activeTab === 'transferList') {
                q = query(playersRef, where("isTransferListed", "==", true));
            } else if (activeTab === 'freeAgents') {
                if (!gameSession?.playerStates) return [];
                
                const freeAgentIds = Object.keys(gameSession.playerStates).filter(
                    playerId => gameSession.playerStates[playerId]?.equipoId === 'free_agent'
                );
    
                if (freeAgentIds.length === 0) return [];
                q = query(playersRef, where(documentId(), "in", freeAgentIds));
    
            } else if (activeTab === 'scout' && selectedTeamId) {
                q = query(playersRef, where("equipoId", "==", selectedTeamId));
            } else {
                return [];
            }
            
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        enabled: !isGameSessionLoading && (activeTab !== 'scout' || (activeTab === 'scout' && !!selectedTeamId)),
    });
    
    const { data: teams, isLoading: isLoadingTeams } = useQuery({
        queryKey: ['teams'],
        queryFn: async () => {
            const teamsRef = collection(db, "equipos");
            const q = query(teamsRef, orderBy("nombre"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        enabled: activeTab === 'scout' && !selectedTeamId,
        staleTime: 1000 * 60 * 60,
    });

    return {
        players: players || [],
        teams: teams || [],
        isLoading: isGameSessionLoading || isLoadingPlayers || isLoadingTeams,
        isError,
    };
};