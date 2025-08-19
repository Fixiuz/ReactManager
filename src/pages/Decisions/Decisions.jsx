import React, { useContext, useState } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './Decisions.css';

const Decisions = () => {
    const { gameSession, updateCurrentGameSession } = useContext(GameContext);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!gameSession || !gameSession.decisions) {
        return <div className="text-center text-white">Cargando decisiones...</div>;
    }

    const { decisions, finances, userId } = gameSession;
    const availableDecisions = decisions.available || [];

    const handleDecision = async (decision, option) => {
        setIsProcessing(true);

        // Clonamos los datos actuales para modificarlos
        const newFinances = { ...finances };
        const newDecisions = { 
            available: [...decisions.available],
            history: [...(decisions.history || [])]
        };
        let alertMessage = `Has rechazado la oferta.`;

        // Lógica específica para cada decisión
        if (decision.id === 'SPONSOR_01' && option === 'Aceptar') {
            const reward = decision.reward || 0;
            newFinances.budget += reward;
            
            const newTransaction = {
                date: new Date().toISOString(),
                description: `Ingreso por patrocinio: ${decision.title}`,
                amount: reward,
                type: 'sponsor'
            };
            newFinances.transactions.push(newTransaction);
            alertMessage = `¡Has aceptado el patrocinio y ganado ${reward.toLocaleString('es-AR', {style:'currency', currency:'ARS'})}!`;
        }

        // Mover la decisión de 'available' a 'history'
        const decisionIndex = newDecisions.available.findIndex(d => d.id === decision.id);
        if (decisionIndex > -1) {
            const takenDecision = {
                ...newDecisions.available[decisionIndex],
                takenOn: new Date().toISOString(),
                choice: option
            };
            newDecisions.history.push(takenDecision);
            newDecisions.available.splice(decisionIndex, 1);
        }

        try {
            const gameDocRef = doc(db, 'partidas', userId);
            await updateDoc(gameDocRef, {
                finances: newFinances,
                decisions: newDecisions
            });

            // Actualizar estado global
            updateCurrentGameSession({
                finances: newFinances,
                decisions: newDecisions
            });

            Swal.fire('Decisión Tomada', alertMessage, 'success');

        } catch (error) {
            console.error("Error al procesar la decisión:", error);
            Swal.fire('Error', 'Hubo un problema al guardar tu decisión.', 'error');
        }

        setIsProcessing(false);
    };

    return (
        <div className="decisions-container">
            <h2 className="text-white text-center mb-4">Decisiones de la Directiva</h2>
            {availableDecisions.length > 0 ? (
                availableDecisions.map(decision => (
                    <div key={decision.id} className="card bg-dark text-white mb-4 shadow decision-card">
                        <div className="card-header">
                            <h5 className="mb-0">{decision.title}</h5>
                        </div>
                        <div className="card-body">
                            <p className="card-text text-white-50">{decision.description}</p>
                        </div>
                        <div className="card-footer d-flex justify-content-end gap-2">
                            {decision.options.map(option => (
                                <button
                                    key={option}
                                    className={`btn ${option === 'Aceptar' ? 'btn-success' : 'btn-danger'}`}
                                    onClick={() => handleDecision(decision, option)}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Procesando...' : option}
                                </button>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="card bg-dark text-white text-center p-5">
                    <p className="h5 text-white-50">No hay decisiones pendientes por el momento.</p>
                </div>
            )}
        </div>
    );
};

export default Decisions;