// src/hooks/useMatchSimulation.js

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const useMatchSimulation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userMatchResult }) => {
            const functions = getFunctions();
            const simulateJornada = httpsCallable(functions, 'simulateJornada');
            const result = await simulateJornada({ userMatchResult });
            if (!result.data.success) {
                throw new Error('Simulación fallida');
            }
            return result.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(['gameSession']);
            await queryClient.invalidateQueries(['squad']);
            await queryClient.invalidateQueries(['opponent']);
        },
        onError: (error) => {
            console.error("Error en la simulación:", error);
        }
    });
};