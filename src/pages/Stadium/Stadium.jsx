import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './Stadium.css';

// --- DATOS DE MEJORAS ---
const UPGRADE_COSTS = {
    capacity: [0, 1000000, 2500000, 5000000, 10000000],
    pitch: [0, 500000, 1200000, 3000000, 7500000],
    facilities: [0, 750000, 1800000, 4000000, 9000000]
};

const UPGRADE_BENEFITS = {
    capacity: [0, 5000, 10000, 15000, 25000],
    pitch: ["Malo", "Regular", "Bueno", "Excelente", "Clase Mundial"],
    facilities: ["Básicas", "Estándar", "Modernas", "Avanzadas", "Élite"]
};

const MAX_LEVEL = 5;

const Stadium = () => {
    const { gameSession, updateCurrentGameSession } = useContext(GameContext);
    
    // Estados para controlar las operaciones en curso
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isSavingPrice, setIsSavingPrice] = useState(false);

    // Estado local para el input del precio de la entrada
    const [ticketPriceInput, setTicketPriceInput] = useState('');

    useEffect(() => {
        // Sincroniza el estado del input con los datos del juego cuando se cargan
        if (gameSession?.stadium?.ticketPrice) {
            setTicketPriceInput(gameSession.stadium.ticketPrice);
        }
    }, [gameSession?.stadium?.ticketPrice]);


    if (!gameSession || !gameSession.stadium) {
        return <div className="text-center text-white">Cargando datos del estadio...</div>;
    }

    const { stadium, finances, userId } = gameSession;
    const { budget, transactions } = finances;

    const handleUpgrade = async (upgradeType) => {
        setIsUpgrading(true);
        const currentLevel = upgradeType === 'capacity' ? stadium.level : stadium[`${upgradeType}Level`];
        
        if (currentLevel >= MAX_LEVEL) {
            Swal.fire('Mejora al Máximo', 'Ya has alcanzado el nivel máximo.', 'info');
            setIsUpgrading(false);
            return;
        }

        const cost = UPGRADE_COSTS[upgradeType][currentLevel];

        if (budget < cost) {
            Swal.fire('Fondos Insuficientes', 'No tienes presupuesto para esta mejora.', 'error');
            setIsUpgrading(false);
            return;
        }

        const result = await Swal.fire({
            title: '¿Confirmar Mejora?',
            html: `Esto costará <strong>${cost.toLocaleString('es-AR', {style: 'currency', currency: 'ARS'})}</strong>.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#48bb78',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, mejorar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const newBudgetData = budget - cost;
                const newTransaction = {
                    date: new Date().toISOString(),
                    description: `Mejora de ${upgradeType} (Nivel ${currentLevel + 1})`,
                    amount: -cost,
                    type: 'upgrade'
                };

                const updatedStadiumData = { ...stadium };
                if (upgradeType === 'capacity') {
                    updatedStadiumData.level = currentLevel + 1;
                    updatedStadiumData.capacity += UPGRADE_BENEFITS.capacity[currentLevel];
                } else {
                    updatedStadiumData[`${upgradeType}Level`] = currentLevel + 1;
                }
                
                const gameDocRef = doc(db, 'partidas', userId);
                await updateDoc(gameDocRef, {
                    'finances.budget': newBudgetData,
                    'finances.transactions': [...transactions, newTransaction],
                    'stadium': updatedStadiumData
                });

                updateCurrentGameSession({
                    finances: { ...finances, budget: newBudgetData, transactions: [...transactions, newTransaction] },
                    stadium: updatedStadiumData
                });

                Swal.fire('¡Mejora completada!', 'La instalación ha sido mejorada.', 'success');

            } catch (error) {
                console.error("Error al mejorar el estadio:", error);
                Swal.fire('Error', 'Hubo un problema al procesar la mejora.', 'error');
            }
        }
        setIsUpgrading(false);
    };

    const handleSaveTicketPrice = async (e) => {
        e.preventDefault();
        setIsSavingPrice(true);

        const newPrice = parseInt(ticketPriceInput, 10);

        if (isNaN(newPrice) || newPrice <= 0) {
            Swal.fire('Precio Inválido', 'Por favor, introduce un número positivo.', 'error');
            setIsSavingPrice(false);
            return;
        }

        try {
            const gameDocRef = doc(db, 'partidas', userId);
            await updateDoc(gameDocRef, { 'stadium.ticketPrice': newPrice });

            updateCurrentGameSession({
                stadium: { ...stadium, ticketPrice: newPrice }
            });

            Swal.fire({
                title: 'Precio Actualizado',
                text: `El nuevo precio de la entrada es ${newPrice.toLocaleString('es-AR', {style:'currency', currency:'ARS'})}.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            console.error("Error al guardar el precio:", error);
            Swal.fire('Error', 'Hubo un problema al guardar el precio.', 'error');
        }
        setIsSavingPrice(false);
    };

    const renderUpgradeCard = (type, title, description, currentLevelKey, benefitsKey) => {
        const currentLevel = stadium[currentLevelKey];
        const isMaxLevel = currentLevel >= MAX_LEVEL;
        const cost = isMaxLevel ? 0 : UPGRADE_COSTS[type][currentLevel];
        
        return (
            <div className="col-md-4 mb-4">
                <div className="card bg-dark text-white h-100 stadium-card">
                    <div className="card-body d-flex flex-column">
                        <h5 className="card-title">{title}</h5>
                        <p className="card-text text-white-50">{description}</p>
                        <div className="mt-auto">
                            <p className="mb-1">Nivel Actual: <span className="fw-bold">{currentLevel} / {MAX_LEVEL}</span></p>
                            <p className="mb-3">Estado: <span className="fw-bold">{UPGRADE_BENEFITS[benefitsKey][currentLevel-1]}</span></p>
                            <button 
                                className="btn btn-success w-100"
                                onClick={() => handleUpgrade(type)}
                                disabled={isMaxLevel || isUpgrading || isSavingPrice || budget < cost}
                            >
                                {isMaxLevel ? 'Máximo Nivel' : `Mejorar (${cost.toLocaleString('es-AR', {style:'currency', currency:'ARS'})})`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="stadium-container">
            <h2 className="text-white text-center mb-4">Gestión del Estadio: {stadium.name}</h2>
            
            <div className="row mb-4">
                <div className="col-lg-6">
                    <div className="card bg-dark text-white mb-4 shadow text-center h-100">
                        <div className="card-body">
                            <h5 className="card-title text-white-50">CAPACIDAD TOTAL</h5>
                            <p className="card-text display-5 fw-bold">{stadium.capacity.toLocaleString()} Espectadores</p>
                        </div>
                    </div>
                </div>
                <div className="col-lg-6">
                     <div className="card bg-dark text-white mb-4 shadow text-center h-100">
                        <div className="card-body">
                           <h5 className="card-title text-white-50">PRECIO DE LA ENTRADA</h5>
                           <form onSubmit={handleSaveTicketPrice} className="d-flex align-items-center justify-content-center gap-3">
                                <input 
                                    type="number" 
                                    className="form-control form-control-lg bg-secondary text-white border-secondary text-center price-input" 
                                    value={ticketPriceInput}
                                    onChange={(e) => setTicketPriceInput(e.target.value)}
                                    disabled={isSavingPrice || isUpgrading}
                                />
                                <button type="submit" className="btn btn-primary btn-lg" disabled={isSavingPrice || isUpgrading}>
                                    {isSavingPrice ? 'Guardando...' : 'Guardar'}
                                </button>
                           </form>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="text-white-50 my-4" />

            <div className="row">
                {renderUpgradeCard('capacity', 'Ampliar Gradas', 'Aumenta la capacidad del estadio para generar más ingresos.', 'level', 'capacity')}
                {renderUpgradeCard('pitch', 'Mejorar Césped', 'Reduce el riesgo de lesiones y mejora el rendimiento del equipo.', 'pitchLevel', 'pitch')}
                {renderUpgradeCard('facilities', 'Mejorar Instalaciones', 'Potencia el desarrollo y la recuperación de los jugadores.', 'facilitiesLevel', 'facilities')}
            </div>
        </div>
    );
};

export default Stadium;