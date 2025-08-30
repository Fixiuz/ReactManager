// src/hooks/useBoardActions.js

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, writeBatch, arrayUnion, increment, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useGameSession } from './useGameSession';
import Swal from 'sweetalert2';

export const useBoardActions = () => {
    const queryClient = useQueryClient();
    const { gameSession } = useGameSession();

    // --- MUTACIÓN: COMPRAR STOCK (MERCHANDISING) ---
    const { mutate: buyStock, isPending: isBuyingStock } = useMutation({
        mutationFn: async ({ product, quantity }) => {
            if (!gameSession) throw new Error("No game session");
            const totalCost = product.manufacturingCost * quantity;
            if (gameSession.finances.budget < totalCost) throw new Error("Fondos Insuficientes");

            const batch = writeBatch(db);
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            
            const newTransaction = { date: new Date().toISOString(), description: `Compra de stock: ${quantity.toLocaleString()} x ${product.name}`, amount: -totalCost, type: 'merchandising' };
            const newProducts = gameSession.merchandising.products.map(p => 
                p.id === product.id ? { ...p, stock: p.stock + quantity } : p
            );

            batch.update(gameDocRef, {
                'finances.budget': increment(-totalCost),
                'finances.transactions': arrayUnion(newTransaction),
                'merchandising.products': newProducts
            });
            await batch.commit();

            return { newTransaction, totalCost, newProducts };
        },
        onSuccess: ({ newTransaction, totalCost, newProducts }) => {
            queryClient.setQueryData(['gameSession', gameSession.userId], (oldData) => ({
                ...oldData,
                finances: {
                    ...oldData.finances,
                    budget: oldData.finances.budget - totalCost,
                    transactions: [...oldData.finances.transactions, newTransaction]
                },
                merchandising: { ...oldData.merchandising, products: newProducts }
            }));
            queryClient.invalidateQueries({ queryKey: ['gameSession'] });
            Swal.fire('¡Compra Exitosa!', `Se ha añadido nuevo stock al almacén.`, 'success');
        },
        onError: (error) => {
            if (error.message === "Fondos Insuficientes") Swal.fire('Fondos Insuficientes', 'No tienes presupuesto para esta compra.', 'error');
            else Swal.fire('Error', 'Hubo un problema al procesar la compra.', 'error');
        }
    });

    // --- MUTACIÓN: GUARDAR PRECIO (MERCHANDISING) ---
    const { mutate: savePrice, isPending: isSavingPrice } = useMutation({
        mutationFn: async ({ productId, newPrice }) => {
            if (!gameSession) throw new Error("No game session");
            const newProducts = gameSession.merchandising.products.map(p => 
                p.id === productId ? { ...p, sellingPrice: newPrice } : p
            );
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            await updateDoc(gameDocRef, { 'merchandising.products': newProducts });
            return newProducts;
        },
        onSuccess: (newProducts) => {
            queryClient.setQueryData(['gameSession', gameSession.userId], (oldData) => ({
                ...oldData,
                merchandising: { ...oldData.merchandising, products: newProducts }
            }));
            queryClient.invalidateQueries({ queryKey: ['gameSession'] });
            Swal.fire('Precio Actualizado', 'El nuevo precio de venta ha sido guardado.', 'success');
        },
        onError: () => Swal.fire('Error', 'Hubo un problema al guardar el precio.', 'error')
    });

    // --- MUTACIÓN: FIRMAR PATROCINIO (SPONSORSHIP) ---
    const { mutate: signSponsorship, isPending: isSigningSponsorship } = useMutation({
        mutationFn: async ({ offer }) => {
            if (!gameSession) throw new Error("No game session");
            
            const newActiveContract = { ...offer, startDate: new Date().toISOString(), season: gameSession.season };
            const newTransaction = { date: new Date().toISOString(), description: `Pago inicial patrocinio: ${offer.sponsorName}`, amount: offer.upfrontPayment, type: 'sponsorship' };
            const newSponsorshipData = { activeContract: newActiveContract, availableOffers: [] };

            const batch = writeBatch(db);
            const gameDocRef = doc(db, 'partidas', gameSession.userId);

            batch.update(gameDocRef, {
                'finances.budget': increment(offer.upfrontPayment),
                'finances.transactions': arrayUnion(newTransaction),
                'sponsorship': newSponsorshipData
            });
            await batch.commit();

            return { newTransaction, upfrontPayment: offer.upfrontPayment, newSponsorshipData };
        },
        onSuccess: ({ newTransaction, upfrontPayment, newSponsorshipData }) => {
             queryClient.setQueryData(['gameSession', gameSession.userId], (oldData) => ({
                ...oldData,
                finances: {
                    ...oldData.finances,
                    budget: oldData.finances.budget + upfrontPayment,
                    transactions: [...oldData.finances.transactions, newTransaction]
                },
                sponsorship: newSponsorshipData
            }));
            queryClient.invalidateQueries({ queryKey: ['gameSession'] });
            Swal.fire('¡Contrato Firmado!', `Has firmado un nuevo acuerdo de patrocinio.`, 'success');
        },
        onError: () => Swal.fire('Error', 'Hubo un problema al firmar el contrato.', 'error')
    });

    return { 
        buyStock, isBuyingStock,
        savePrice, isSavingPrice,
        signSponsorship, isSigningSponsorship
    };
};