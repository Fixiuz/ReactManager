import React, { useContext, useState } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './Staff.css';

// --- CONFIGURACIÓN DEL JUEGO PARA LOS EMPLEADOS ---
const STAFF_CONFIG = {
    scout: {
        title: "Ojeador",
        description: "Un buen ojeador revela con mayor precisión los atributos reales y el potencial de los jugadores que quieres fichar.",
        levels: [
            { level: 1, bonus: "Precisión Baja", salary: 5000, upgradeCost: 100000 },
            { level: 2, bonus: "Precisión Moderada", salary: 15000, upgradeCost: 300000 },
            { level: 3, bonus: "Precisión Alta", salary: 40000, upgradeCost: 800000 },
            { level: 4, bonus: "Precisión de Élite", salary: 100000, upgradeCost: 2000000 },
            { level: 5, bonus: "Clase Mundial", salary: 250000, upgradeCost: 0 },
        ]
    },
    medic: {
        title: "Cuerpo Médico",
        description: "Reduce el tiempo de recuperación de las lesiones de tus jugadores.",
        levels: [
            { level: 1, bonus: "-0% tiempo de lesión", salary: 8000, upgradeCost: 150000 },
            { level: 2, bonus: "-15% tiempo de lesión", salary: 20000, upgradeCost: 400000 },
            { level: 3, bonus: "-30% tiempo de lesión", salary: 50000, upgradeCost: 1000000 },
            { level: 4, bonus: "-50% tiempo de lesión", salary: 120000, upgradeCost: 2500000 },
            { level: 5, bonus: "-75% tiempo de lesión", salary: 300000, upgradeCost: 0 },
        ]
    },
    trainer: {
        title: "Preparador Físico",
        description: "Mejora la condición física del plantel, reduciendo la fatiga y mejorando el desarrollo de atributos físicos.",
        levels: [
            { level: 1, bonus: "Desarrollo Básico", salary: 7000, upgradeCost: 120000 },
            { level: 2, bonus: "Desarrollo Intermedio", salary: 18000, upgradeCost: 350000 },
            { level: 3, bonus: "Desarrollo Avanzado", salary: 45000, upgradeCost: 900000 },
            { level: 4, bonus: "Desarrollo Profesional", salary: 110000, upgradeCost: 2200000 },
            { level: 5, bonus: "Ciencia del Deporte", salary: 280000, upgradeCost: 0 },
        ]
    },
    marketing: {
        title: "Director de Marketing",
        description: "Aumenta los ingresos generados por merchandising y mejora las ofertas de patrocinio.",
        levels: [
            { level: 1, bonus: "+0% ingresos extra", salary: 10000, upgradeCost: 200000 },
            { level: 2, bonus: "+5% ingresos extra", salary: 25000, upgradeCost: 500000 },
            { level: 3, bonus: "+12% ingresos extra", salary: 60000, upgradeCost: 1200000 },
            { level: 4, bonus: "+20% ingresos extra", salary: 150000, upgradeCost: 3000000 },
            { level: 5, bonus: "+35% ingresos extra", salary: 400000, upgradeCost: 0 },
        ]
    }
};
const MAX_LEVEL = 5;

const Staff = () => {
    const { gameSession, updateCurrentGameSession } = useContext(GameContext);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!gameSession || !gameSession.staff) {
        return <div className="text-center text-white">Cargando empleados...</div>;
    }

    const handleUpgrade = async (staffKey) => {
        setIsProcessing(true);

        const currentLevel = gameSession.staff[staffKey];
        if (currentLevel >= MAX_LEVEL) {
            Swal.fire('Nivel Máximo', 'Este empleado ya está en su máximo nivel.', 'info');
            setIsProcessing(false);
            return;
        }

        const cost = STAFF_CONFIG[staffKey].levels[currentLevel - 1].upgradeCost;
        if (gameSession.finances.budget < cost) {
            Swal.fire('Fondos Insuficientes', 'No tienes el presupuesto para esta mejora.', 'error');
            setIsProcessing(false);
            return;
        }

        const result = await Swal.fire({
            title: `¿Mejorar ${STAFF_CONFIG[staffKey].title}?`,
            text: `La mejora al Nivel ${currentLevel + 1} tiene un costo único de $${cost.toLocaleString()}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, mejorar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const newBudgetData = gameSession.finances.budget - cost;
                const newTransaction = {
                    date: new Date().toISOString(),
                    description: `Mejora de empleado: ${STAFF_CONFIG[staffKey].title} Nivel ${currentLevel + 1}`,
                    amount: -cost,
                    type: 'staff'
                };
                const newStaffData = { ...gameSession.staff, [staffKey]: currentLevel + 1 };

                const gameDocRef = doc(db, 'partidas', gameSession.userId);
                await updateDoc(gameDocRef, {
                    'finances.budget': newBudgetData,
                    'finances.transactions': [...gameSession.finances.transactions, newTransaction],
                    'staff': newStaffData
                });

                updateCurrentGameSession({
                    finances: { ...gameSession.finances, budget: newBudgetData, transactions: [...gameSession.finances.transactions, newTransaction] },
                    staff: newStaffData
                });

                Swal.fire('¡Mejora Realizada!', `Has mejorado a tu ${STAFF_CONFIG[staffKey].title}.`, 'success');

            } catch (error) {
                console.error("Error al mejorar empleado:", error);
                Swal.fire('Error', 'Hubo un problema al procesar la mejora.', 'error');
            }
        }
        setIsProcessing(false);
    };

    return (
        <div className="staff-container">
            <h2 className="text-white text-center mb-5">Cuerpo Técnico y Empleados</h2>
            <div className="row">
                {Object.keys(STAFF_CONFIG).map(key => {
                    const staffMember = STAFF_CONFIG[key];
                    const currentLevel = gameSession.staff[key];
                    const levelData = staffMember.levels[currentLevel - 1];
                    const isMaxLevel = currentLevel >= MAX_LEVEL;
                    
                    return (
                        <div key={key} className="col-lg-6 mb-4">
                            <div className="card bg-dark text-white h-100 staff-card">
                                <div className="card-body">
                                    <h4 className="card-title">{staffMember.title}</h4>
                                    <p className="text-white-50">{staffMember.description}</p>
                                    <p><strong>Nivel Actual:</strong> {currentLevel} / {MAX_LEVEL}</p>
                                    <p><strong>Bonus Actual:</strong> <span className="bonus-text">{levelData.bonus}</span></p>
                                    <p><strong>Salario Mensual:</strong> <span className="text-danger">${levelData.salary.toLocaleString()}</span></p>
                                    <button 
                                        className="btn btn-success w-100 mt-auto"
                                        onClick={() => handleUpgrade(key)}
                                        disabled={isMaxLevel || isProcessing || gameSession.finances.budget < levelData.upgradeCost}
                                    >
                                        {isMaxLevel ? 'NIVEL MÁXIMO' : `Mejorar (Costo: $${levelData.upgradeCost.toLocaleString()})`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Staff;