// src/hooks/useStadiumActions.js

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, writeBatch, increment, arrayUnion, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useGameSession } from './useGameSession';
import Swal from 'sweetalert2';

const UPGRADE_COSTS = {
    capacity: [0, 1000000, 2500000, 5000000, 10000000],
    pitch: [0, 500000, 1200000, 3000000, 7500000],
    facilities: [0, 750000, 1800000, 4000000, 9000000]
};

const UPGRADE_BENEFITS = {
    capacity: [0, 5000, 10000, 15000, 25000],
};

export const useStadiumActions = () => {
    const queryClient = useQueryClient();
    const { gameSession } = useGameSession();

    const { mutate: upgradeFacility, isPending: isUpgrading } = useMutation({
        mutationFn: async ({ upgradeType }) => {
            if (!gameSession) throw new Error("No game session");
            
            const { stadium, finances } = gameSession;
            const currentLevel = upgradeType === 'capacity' ? stadium.level : stadium[`${upgradeType}Level`];
            const cost = UPGRADE_COSTS[upgradeType][currentLevel];

            if (finances.budget < cost) throw new Error("Fondos Insuficientes");

            const batch = writeBatch(db);
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            
            const updatedStadiumData = { ...stadium };
            if (upgradeType === 'capacity') {
                updatedStadiumData.level += 1;
                updatedStadiumData.capacity += UPGRADE_BENEFITS.capacity[currentLevel];
            } else {
                updatedStadiumData[`${upgradeType}Level`] += 1;
            }

            const newTransaction = {
                date: new Date().toISOString(),
                description: `Mejora de ${upgradeType} (Nivel ${currentLevel + 1})`,
                amount: -cost,
                type: 'upgrade'
            };

            batch.update(gameDocRef, {
                'finances.budget': increment(-cost),
                'finances.transactions': arrayUnion(newTransaction),
                'stadium': updatedStadiumData
            });
            
            await batch.commit();
            return { newTransaction, cost, updatedStadiumData };
        },
        onSuccess: ({ newTransaction, cost, updatedStadiumData }) => {
            queryClient.setQueryData(['gameSession', gameSession?.userId], (oldData) => ({
                ...oldData,
                finances: {
                    ...oldData.finances,
                    budget: oldData.finances.budget - cost,
                    transactions: [...oldData.finances.transactions, newTransaction],
                },
                stadium: updatedStadiumData,
            }));
            
            queryClient.invalidateQueries({ queryKey: ['gameSession'] });
            Swal.fire('¡Mejora completada!', 'La instalación ha sido mejorada.', 'success');
        },
        onError: (error) => {
            if (error.message === "Fondos Insuficientes") {
                Swal.fire('Fondos Insuficientes', 'No tienes presupuesto para esta mejora.', 'error');
            } else {
                Swal.fire('Error', 'Hubo un problema al procesar la mejora.', 'error');
            }
        }
    });

    const { mutate: saveTicketPrice, isPending: isSavingPrice } = useMutation({
        mutationFn: async ({ newPrice }) => {
            if (!gameSession) throw new Error("No game session");
            if (isNaN(newPrice) || newPrice <= 0) throw new Error("Precio Inválido");

            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            await updateDoc(gameDocRef, { 'stadium.ticketPrice': newPrice });
            return newPrice;
        },
        onSuccess: (newPrice) => {
            queryClient.setQueryData(['gameSession', gameSession?.userId], (oldData) => ({
                ...oldData,
                stadium: {
                    ...oldData.stadium,
                    ticketPrice: newPrice
                }
            }));
            queryClient.invalidateQueries({ queryKey: ['gameSession'] });
            Swal.fire({
                title: 'Precio Actualizado',
                text: `El nuevo precio es ${newPrice.toLocaleString('es-AR', {style:'currency', currency:'ARS'})}.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        },
        onError: (error) => {
            if (error.message === "Precio Inválido") {
                 Swal.fire('Precio Inválido', 'Por favor, introduce un número positivo.', 'error');
            } else {
                Swal.fire('Error', 'Hubo un problema al guardar el precio.', 'error');
            }
        }
    });

    return { 
        upgradeFacility, 
        isUpgrading,
        saveTicketPrice,
        isSavingPrice
    };
};