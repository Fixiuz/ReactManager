// src/hooks/usePlayerActions.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, writeBatch, arrayUnion, increment, collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useGameSession } from './useGameSession';
import Swal from 'sweetalert2';

export const usePlayerActions = (player) => {
    const queryClient = useQueryClient();
    const { gameSession } = useGameSession();
    const playerId = player?.id;

    const { mutate: toggleTransferList, isPending: isTogglingList } = useMutation({
        mutationFn: async (newStatus) => {
            if (!gameSession) throw new Error("No game session");
            const batch = writeBatch(db);
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            batch.update(gameDocRef, { [`playerStates.${playerId}.isTransferListed`]: newStatus });
            await batch.commit();
            return newStatus;
        },
        onSuccess: (newStatus) => {
            queryClient.setQueryData(['gameSession', gameSession?.userId], (oldData) => {
                const newPlayerStates = { ...oldData.playerStates };
                if (newPlayerStates[playerId]) {
                    newPlayerStates[playerId].isTransferListed = newStatus;
                }
                return { ...oldData, playerStates: newPlayerStates };
            });
            const actionText = newStatus ? 'puesto en' : 'quitado de';
            Swal.fire('¡Éxito!', `${player.nombreCompleto} ha sido ${actionText} la lista de transferibles.`, 'success');
        },
        onError: (error) => Swal.fire('Error', 'Hubo un problema al actualizar el estado del jugador.', 'error'),
    });

    const { mutate: renewContract, isPending: isRenewing } = useMutation({
        mutationFn: async ({ newSalary, newYears }) => {
            if (!gameSession) throw new Error("No game session");
            const renewalBonus = newSalary * 4;
            if (gameSession.finances.budget < renewalBonus) throw new Error("Fondos Insuficientes");
            const batch = writeBatch(db);
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            const newTransaction = { date: new Date().toISOString(), description: `Prima de renovación: ${player.nombreCompleto}`, amount: -renewalBonus, type: 'contract' };
            batch.update(gameDocRef, {
                'finances.budget': increment(-renewalBonus),
                'finances.transactions': arrayUnion(newTransaction),
                [`playerStates.${playerId}.salary`]: newSalary,
                [`playerStates.${playerId}.contractYears`]: newYears
            });
            await batch.commit();
            return { newYears, newTransaction, renewalBonus };
        },
        onSuccess: ({ newYears, newTransaction, renewalBonus }) => {
            queryClient.setQueryData(['gameSession', gameSession?.userId], (oldData) => ({
                ...oldData,
                finances: { ...oldData.finances, budget: oldData.finances.budget - renewalBonus, transactions: [...oldData.finances.transactions, newTransaction] },
            }));
            Swal.fire('¡Contrato Renovado!', `${player.nombreCompleto} ha firmado por ${newYears} año(s).`, 'success');
        },
        onError: (error) => {
            if (error.message === "Fondos Insuficientes") Swal.fire('Fondos Insuficientes', 'No tienes dinero para la prima de renovación.', 'error');
            else Swal.fire('Error', 'Hubo un problema al procesar la renovación.', 'error');
        }
    });

    const { mutate: firePlayer, isPending: isFiring } = useMutation({
        mutationFn: async () => {
            if (!gameSession || !player) throw new Error("Missing data");
            let newLineup = { ...gameSession.lineup };
            const isStarter = gameSession.lineup.starters.includes(playerId);
            if (isStarter) {
                const myPlayerIds = Object.keys(gameSession.playerStates).filter(id => gameSession.playerStates[id]?.equipoId === gameSession.teamId);
                if (myPlayerIds.length > 1) {
                    const playersRef = collection(db, "jugadores");
                    const q = query(playersRef, where(documentId(), "in", myPlayerIds));
                    const querySnapshot = await getDocs(q);
                    const fullSquadData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const substitutes = fullSquadData.filter(p => gameSession.lineup.substitutes.includes(p.id));
                    if (substitutes.length > 0) {
                        const calculateOverall = (p) => {
                            if (!p?.atributos) return 0;
                            const { atributos, posicion } = p;
                            if (posicion === 'Arquero') return Math.round((atributos.porteria + atributos.velocidad) / 2);
                            return Math.round((atributos.defensa + atributos.mediocampo + atributos.ataque + atributos.velocidad) / 4);
                        };
                        const samePositionSubs = substitutes.filter(p => p.posicion === player.posicion);
                        let replacement = samePositionSubs.length > 0 ? samePositionSubs.sort((a,b) => calculateOverall(b) - calculateOverall(a))[0] : substitutes.sort((a,b) => calculateOverall(b) - calculateOverall(a))[0];
                        newLineup.starters = newLineup.starters.filter(id => id !== playerId).concat(replacement.id);
                        newLineup.substitutes = newLineup.substitutes.filter(id => id !== replacement.id);
                    } else {
                        newLineup.starters = newLineup.starters.filter(id => id !== playerId);
                    }
                } else {
                     newLineup.starters = newLineup.starters.filter(id => id !== playerId);
                }
            }
            const severanceFee = player.state.salary * 52 * player.state.contractYears * 0.5;
            if (gameSession.finances.budget < severanceFee) throw new Error("Fondos Insuficientes");
            const batch = writeBatch(db);
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            const newTransaction = { date: new Date().toISOString(), description: `Indemnización: ${player.nombreCompleto}`, amount: -severanceFee, type: 'contract' };
            batch.update(gameDocRef, {
                'finances.budget': increment(-severanceFee),
                'finances.transactions': arrayUnion(newTransaction),
                [`playerStates.${playerId}.equipoId`]: "free_agent",
                'lineup': newLineup
            });
            await batch.commit();
            return { newTransaction, severanceFee, newLineup };
        },
        onSuccess: ({ newTransaction, severanceFee, newLineup }) => {
            // **LA CORRECCIÓN DEFINITIVA ESTÁ AQUÍ**
            // Actualizamos la caché del plantel ('squad') DIRECTAMENTE.
            queryClient.setQueryData(['squad', gameSession?.userId], (oldSquadData) => {
                if (!oldSquadData) return [];
                // Devolvemos una nueva lista del plantel que ya no incluye al jugador despedido.
                return oldSquadData.filter(p => p.id !== playerId);
            });

            // Y también actualizamos la caché de la sesión de juego como antes.
            queryClient.setQueryData(['gameSession', gameSession?.userId], (oldData) => {
                const newPlayerStates = { ...oldData.playerStates };
                if (newPlayerStates[playerId]) {
                    newPlayerStates[playerId].equipoId = "free_agent";
                }
                return {
                    ...oldData,
                    finances: { ...oldData.finances, budget: oldData.finances.budget - severanceFee, transactions: [...oldData.finances.transactions, newTransaction], },
                    playerStates: newPlayerStates,
                    lineup: newLineup,
                }
            });

            // Invalidamos la lista de transferencias para que se recargue y muestre al nuevo agente libre.
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            
            Swal.fire('Jugador Despedido', `${player.nombreCompleto} ya no forma parte del club.`, 'success');
        },
        onError: (error) => {
             if (error.message === "Fondos Insuficientes") Swal.fire('Fondos Insuficientes', 'No tienes dinero para pagar la indemnización.', 'error');
             else Swal.fire('Error', 'Hubo un problema al procesar el despido.', 'error');
        }
    });

    const { mutate: makeOffer, isPending: isOffering } = useMutation({
        mutationFn: async ({ fee, salary, years }) => {
            if (!gameSession || !player) throw new Error("Missing data");
            const isFreeAgent = player.state.equipoId === 'free_agent';
            const signingBonus = salary * 4;
            const totalCost = fee + signingBonus;
            if (gameSession.finances.budget < totalCost) throw new Error("Fondos Insuficientes");
            const clubAccepts = isFreeAgent || fee >= player.valor * 0.9;
            const playerAccepts = salary >= (player.state.salary || 20000) * 1.1;
            if (!clubAccepts) throw new Error("Oferta Rechazada por el Club");
            if (!playerAccepts) throw new Error("Oferta Rechazada por el Jugador");
            const batch = writeBatch(db);
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            const newTransactions = [
                { date: new Date().toISOString(), description: `Fichaje (traspaso): ${player.nombreCompleto}`, amount: -fee, type: 'transfer' },
                { date: new Date().toISOString(), description: `Fichaje (prima): ${player.nombreCompleto}`, amount: -signingBonus, type: 'contract' }
            ].filter(t => t.amount !== 0);
            batch.update(gameDocRef, {
                'finances.budget': increment(-totalCost),
                'finances.transactions': arrayUnion(...newTransactions),
                [`playerStates.${playerId}`]: { equipoId: gameSession.teamId, salary: salary, contractYears: years, isTransferListed: false, seasonStats: { matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, isInjured: false, injuryEndDate: null }}
            });
            await batch.commit();
            return { newTransactions, totalCost };
        },
        onSuccess: ({ newTransactions, totalCost }) => {
             queryClient.setQueryData(['gameSession', gameSession?.userId], (oldData) => ({
                ...oldData,
                finances: { ...oldData.finances, budget: oldData.finances.budget - totalCost, transactions: [...oldData.finances.transactions, ...newTransactions], },
             }));
             Swal.fire('¡Fichaje Realizado!', `${player.nombreCompleto} es nuevo jugador de tu club.`, 'success');
        },
        onError: (error) => {
            if (error.message === "Fondos Insuficientes") Swal.fire('Fondos Insuficientes', 'No tienes el dinero para esta operación.', 'error');
            else if (error.message === "Oferta Rechazada por el Club") Swal.fire('Oferta Rechazada', 'El club rival ha rechazado la oferta.', 'error');
            else if (error.message === "Oferta Rechazada por el Jugador") Swal.fire('Oferta Rechazada', 'El jugador ha rechazado la oferta.', 'error');
            else Swal.fire('Error', 'Hubo un problema al procesar el fichaje.', 'error');
        }
    });

    return { 
        toggleTransferList, isTogglingList,
        renewContract, isRenewing,
        firePlayer, isFiring,
        makeOffer, isOffering
    };
};