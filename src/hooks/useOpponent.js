// src/hooks/useOpponent.js

import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useGameSession } from './useGameSession';

export const useOpponent = () => {
    const { gameSession } = useGameSession(); // Ya no necesitamos isGameSessionLoading aquí

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['opponent', gameSession?.currentJornada],
        queryFn: async () => {
            console.log("--- PASO 3: Iniciando useOpponent ---");
            if (!gameSession) {
                console.log("DEBUG: No hay gameSession para useOpponent.");
                return null;
            }

            const { fixture, currentJornada, teamId } = gameSession;
            console.log(`Paso 3.1: Buscando partido para la jornada ${currentJornada}.`);

            const currentFixture = fixture.find(j => j.jornada === currentJornada);
            if (!currentFixture) {
                console.log("DEBUG: No hay fixture para la jornada actual. Se asume descanso.");
                return { isResting: true };
            }

            const match = currentFixture.matches.find(m => m.home === teamId || m.away === teamId);
            if (!match) {
                console.log("DEBUG: No hay partido para el usuario en esta jornada. Se asume descanso.");
                return { isResting: true };
            }

            const opponentId = match.home === teamId ? match.away : match.home;
            const isHomeMatch = match.home === teamId;
            console.log(`Paso 3.2: Rival encontrado: ${opponentId}. Partido de local: ${isHomeMatch}.`);

            console.log("Paso 3.3: Cargando datos del equipo rival...");
            const teamDocRef = doc(db, 'equipos', opponentId);
            const teamDocSnap = await getDoc(teamDocRef);
            if (!teamDocSnap.exists()) {
                console.error(`ERROR FATAL: El equipo rival con ID ${opponentId} no fue encontrado en la DB.`);
                throw new Error(`Opponent team ${opponentId} not found`);
            }
            const teamInfo = { id: teamDocSnap.id, ...teamDocSnap.data() };
            console.log("Paso 3.4: Datos del equipo rival cargados.");

            console.log("Paso 3.5: Cargando plantel del rival...");
            const playersRef = collection(db, "jugadores");
            const q = query(playersRef, where("equipoId", "==", opponentId));
            const querySnapshot = await getDocs(q);
            const squad = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log(`Paso 3.6: Plantel del rival cargado (${squad.length} jugadores).`);
            
            const starters = [];
            const availablePlayers = [...squad];
            const calculateOverall = (p) => {
                if (!p?.atributos) return 0;
                const { atributos, posicion } = p;
                if (posicion === 'Arquero') return Math.round((atributos.porteria + atributos.velocidad) / 2);
                return Math.round((atributos.defensa + atributos.mediocampo + atributos.ataque + atributos.velocidad) / 4);
            };
            availablePlayers.sort((a,b) => calculateOverall(b) - calculateOverall(a));
            
            starters.push(...availablePlayers.filter(p => p.posicion === 'Delantero').slice(0, 2));
            starters.push(...availablePlayers.filter(p => p.posicion === 'Mediocampista').slice(0, 4));
            starters.push(...availablePlayers.filter(p => p.posicion === 'Defensor').slice(0, 4));
            starters.push(...availablePlayers.filter(p => p.posicion === 'Arquero').slice(0, 1));
            
            console.log("--- PASO 3: useOpponent completado con éxito. ---");
            return { teamInfo, squad, starters: starters.slice(0, 11), isHomeMatch, isResting: false };
        },
        enabled: !!gameSession,
    });

    // LA CORRECCIÓN: El hook ahora solo reporta SU PROPIO estado de carga.
    return { data, isLoading, isError, error };
};