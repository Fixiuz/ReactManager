// src/hooks/useTeamSetup.js

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useGameSession } from './useGameSession';
import Swal from 'sweetalert2';

export const useTeamSetup = () => {
    const queryClient = useQueryClient();
    const { gameSession } = useGameSession();

    const { mutate: saveLineup, isPending: isSavingLineup } = useMutation({
        mutationFn: async ({ starters, substitutes, reserves }) => {
            if (!gameSession) throw new Error("No game session");
            
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            const newLineupData = {
                starters: starters.map(p => p.id),
                substitutes: substitutes.map(p => p.id),
                reserves: reserves.map(p => p.id),
            };

            await updateDoc(gameDocRef, { lineup: newLineupData });
            return newLineupData;
        },
        onSuccess: (newLineupData) => {
            queryClient.setQueryData(['gameSession', gameSession?.userId], (oldData) => ({
                ...oldData,
                lineup: newLineupData
            }));
            Swal.fire({
                title: '¡Guardado!',
                text: 'Tu alineación ha sido guardada con éxito.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        },
        onError: (error) => {
            Swal.fire('Error', 'Hubo un problema al guardar la alineación.', 'error');
        }
    });

    const { mutate: saveTactics, isPending: isSavingTactics } = useMutation({
        mutationFn: async ({ formationName, playerPositions }) => {
            if (!gameSession) throw new Error("No game session");
            
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            const newTacticsData = { formationName, playerPositions };
            
            await updateDoc(gameDocRef, { tactics: newTacticsData });
            return newTacticsData;
        },
        onSuccess: (newTacticsData) => {
            queryClient.setQueryData(['gameSession', gameSession?.userId], (oldData) => ({
                ...oldData,
                tactics: newTacticsData
            }));
            Swal.fire({
                title: '¡Guardado!',
                text: 'Tu táctica ha sido guardada con éxito.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        },
        onError: (error) => {
             Swal.fire('Error', 'Hubo un problema al guardar la táctica.', 'error');
        }
    });

    return {
        saveLineup,
        isSavingLineup,
        saveTactics,
        isSavingTactics
    };
};