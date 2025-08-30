// src/hooks/useMatchActions.js

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGameSession } from './useGameSession';

export const useMatchActions = () => {
    const queryClient = useQueryClient();
    const { gameSession } = useGameSession();

    const { mutate: confirmChanges, isPending: isConfirming } = useMutation({
        mutationFn: async (payload) => {
            return payload;
        },
        onSuccess: (payload) => {
            queryClient.setQueryData(['gameSession', gameSession?.id], (oldData) => {
                if (!oldData) return;
                return { ...oldData, ...payload };
            });
            // No invalidar queries aquí, solo actualizar el cache local
        },
    });

    return { confirmChanges, isConfirming };
};