// src/pages/Stadium/Stadium.jsx

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './Stadium.css';

import { useGameSession } from '../../hooks/useGameSession';
import { useStadiumActions } from '../../hooks/useStadiumActions';

const UPGRADE_COSTS = {
    capacity: [0, 1000000, 2500000, 5000000, 10000000],
    pitch: [0, 500000, 1200000, 3000000, 7500000],
    facilities: [0, 750000, 1800000, 4000000, 9000000]
};

const UPGRADE_BENEFITS_DESC = {
    capacity: [], 
    pitch: ["Malo", "Regular", "Bueno", "Excelente", "Clase Mundial"],
    facilities: ["Básicas", "Estándar", "Modernas", "Avanzadas", "Élite"]
};
const MAX_LEVEL = 5;

const Stadium = () => {
    const { gameSession, isLoading } = useGameSession();
    const { upgradeFacility, isUpgrading, saveTicketPrice, isSavingPrice } = useStadiumActions();
    
    // --- LÍNEA CORREGIDA ---
    const [ticketPriceInput, setTicketPriceInput] = useState('');

    useEffect(() => {
        if (gameSession?.stadium?.ticketPrice) {
            setTicketPriceInput(gameSession.stadium.ticketPrice);
        }
    }, [gameSession?.stadium?.ticketPrice]);

    if (isLoading || !gameSession) {
        return <div className="text-center text-white">Cargando datos del estadio...</div>;
    }

    const { stadium, finances } = gameSession;

    const handleUpgrade = async (upgradeType) => {
        const currentLevel = upgradeType === 'capacity' ? stadium.level : stadium[`${upgradeType}Level`];
        if (currentLevel >= MAX_LEVEL) {
            Swal.fire('Mejora al Máximo', 'Ya has alcanzado el nivel máximo.', 'info');
            return;
        }

        const cost = UPGRADE_COSTS[upgradeType][currentLevel];
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
            upgradeFacility({ upgradeType });
        }
    };

    const handleSaveTicketPrice = (e) => {
        e.preventDefault();
        const newPrice = parseInt(ticketPriceInput, 10);
        saveTicketPrice({ newPrice });
    };

    const renderUpgradeCard = (type, title, description, currentLevelKey, benefitsKey) => {
        const currentLevel = stadium[currentLevelKey];
        const isMaxLevel = currentLevel >= MAX_LEVEL;
        const cost = isMaxLevel ? 0 : UPGRADE_COSTS[type][currentLevel];
        
        const statusText = type === 'capacity' 
            ? `${stadium.capacity.toLocaleString()} Espectadores` 
            : UPGRADE_BENEFITS_DESC[benefitsKey][currentLevel-1];

        return (
            <div className="col-md-4 mb-4">
                <div className="card bg-dark text-white h-100 stadium-card">
                    <div className="card-body d-flex flex-column">
                        <h5 className="card-title">{title}</h5>
                        <p className="card-text text-white-50">{description}</p>
                        <div className="mt-auto">
                            <p className="mb-1">Nivel Actual: <span className="fw-bold">{currentLevel} / {MAX_LEVEL}</span></p>
                            <p className="mb-3">Estado: <span className="fw-bold">{statusText}</span></p>
                            <button className="btn btn-success w-100" onClick={() => handleUpgrade(type)} disabled={isMaxLevel || isUpgrading || isSavingPrice || finances.budget < cost}>
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
                {renderUpgradeCard('pitch', 'Mejorar Césped', 'Reduce el riesgo de lesiones y mejora el rendimiento.', 'pitchLevel', 'pitch')}
                {renderUpgradeCard('facilities', 'Mejorar Instalaciones', 'Potencia el desarrollo y la recuperación de jugadores.', 'facilitiesLevel', 'facilities')}
            </div>
        </div>
    );
};

export default Stadium;