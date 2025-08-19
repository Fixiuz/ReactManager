import React, { useContext } from 'react';
import { GameContext } from '../../context/GameContext';
import './Finances.css';

const Finances = () => {
    const { gameSession } = useContext(GameContext);

    // Protección por si los datos aún no han cargado
    if (!gameSession || !gameSession.finances) {
        return <div className="text-center text-white">Cargando finanzas...</div>;
    }

    const { budget, transactions } = gameSession.finances;

    // Función para formatear números como moneda
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS', // Puedes cambiarlo a USD o EUR si prefieres
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Ordenamos las transacciones de más reciente a más antigua
    const sortedTransactions = transactions ? [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)) : [];

    return (
        <div className="finances-container">
            <h2 className="text-white text-center mb-4">Finanzas del Club</h2>

            <div className="card bg-dark text-white mb-5 shadow">
                <div className="card-body text-center">
                    <h5 className="card-title text-white-50">PRESUPUESTO ACTUAL</h5>
                    <p className="card-text display-4 fw-bold">{formatCurrency(budget)}</p>
                </div>
            </div>

            <div className="card bg-dark text-white shadow">
                <div className="card-header">
                    <h5 className="mb-0">Historial de Transacciones</h5>
                </div>
                <div className="card-body p-0">
                    <table className="table table-dark table-striped table-hover mb-0 finances-table">
                        <thead>
                            <tr>
                                <th scope="col">Fecha</th>
                                <th scope="col">Descripción</th>
                                <th scope="col" className="text-end">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTransactions.length > 0 ? (
                                sortedTransactions.map((tx, index) => (
                                    <tr key={index}>
                                        <td>{new Date(tx.date).toLocaleDateString('es-ES')}</td>
                                        <td>{tx.description}</td>
                                        <td className={`text-end fw-bold ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {formatCurrency(tx.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="text-center">No hay transacciones registradas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Finances;