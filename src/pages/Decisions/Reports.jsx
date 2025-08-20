import React, { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GameContext } from '../../context/GameContext';
import './Reports.css';

const Reports = () => {
    const { gameSession } = useContext(GameContext);

    // --- CÁLCULOS PARA MERCHANDISING (sin cambios) ---
    const reportData = useMemo(() => {
        if (!gameSession?.merchandising?.products) return { products: [], totals: {} };
        const products = gameSession.merchandising.products.map(p => {
            const totalUnitsManufactured = p.stock + p.unitsSold;
            const totalExpenses = totalUnitsManufactured * p.manufacturingCost;
            const totalIncome = p.unitsSold * p.sellingPrice;
            const netProfit = totalIncome - totalExpenses;
            return { ...p, totalUnitsManufactured, totalExpenses, totalIncome, netProfit };
        });
        const totals = products.reduce((acc, p) => {
            acc.totalUnitsManufactured += p.totalUnitsManufactured;
            acc.totalExpenses += p.totalExpenses;
            acc.totalIncome += p.totalIncome;
            acc.netProfit += p.netProfit;
            return acc;
        }, { totalUnitsManufactured: 0, totalExpenses: 0, totalIncome: 0, netProfit: 0 });
        return { products, totals };
    }, [gameSession?.merchandising?.products]);

    // --- DATOS DEL PATROCINIO ACTIVO ---
    const activeSponsor = gameSession?.sponsorship?.activeContract;

    if (!gameSession) {
        return <div className="text-center text-white">Cargando informes...</div>;
    }

    const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    const getProfitClass = (amount) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-white');

    return (
        <div>
            <Link to="/board" className="btn btn-secondary mb-4">← Volver al Centro de Gestión</Link>

            {/* --- INFORME DE MERCHANDISING --- */}
            <div className="card bg-dark text-white mb-5">
                <div className="card-header"><h4 className="mb-0">Informe de Merchandising</h4></div>
                <div className="card-body p-0">
                    <table className="table table-dark table-hover mb-0 reports-table">
                         <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Unidades Fabricadas</th>
                                <th>Unidades Vendidas</th>
                                <th>Stock Actual</th>
                                <th>Gastos Totales</th>
                                <th>Ingresos Totales</th>
                                <th className="text-end">Beneficio Neto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.products.map(p => (
                                <tr key={p.id}>
                                    <td className="align-middle">{p.name}</td>
                                    <td className="align-middle">{p.totalUnitsManufactured.toLocaleString()}</td>
                                    <td className="align-middle">{p.unitsSold.toLocaleString()}</td>
                                    <td className="align-middle">{p.stock.toLocaleString()}</td>
                                    <td className="align-middle text-danger">{formatCurrency(p.totalExpenses)}</td>
                                    <td className="align-middle text-success">{formatCurrency(p.totalIncome)}</td>
                                    <td className={`align-middle text-end fw-bold ${getProfitClass(p.netProfit)}`}>{formatCurrency(p.netProfit)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="table-secondary">
                                <th colSpan="2" className="text-end">TOTALES</th>
                                <th>{reportData.totals.totalUnitsManufactured.toLocaleString()}</th>
                                <th>-</th>
                                <th className="text-danger">{formatCurrency(reportData.totals.totalExpenses)}</th>
                                <th className="text-success">{formatCurrency(reportData.totals.totalIncome)}</th>
                                <th className={`text-end fw-bold ${getProfitClass(reportData.totals.netProfit)}`}>{formatCurrency(reportData.totals.netProfit)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* --- NUEVO INFORME DE PATROCINIO --- */}
            <div className="card bg-dark text-white">
                <div className="card-header"><h4 className="mb-0">Informe de Patrocinio</h4></div>
                <div className="card-body">
                    {activeSponsor ? (
                        <div>
                            <h5 className="sponsor-name">{activeSponsor.sponsorName}</h5>
                            <div className="row mt-3">
                                <div className="col-md-4">
                                    <p className="mb-1 text-white-50">Valor Base / Temporada</p>
                                    <p className="h5">{formatCurrency(activeSponsor.baseAmount)}</p>
                                </div>
                                <div className="col-md-4">
                                    <p className="mb-1 text-white-50">Pago Inicial Recibido</p>
                                    <p className="h5 text-success">{formatCurrency(activeSponsor.upfrontPayment)}</p>
                                </div>
                                <div className="col-md-4">
                                    <p className="mb-1 text-white-50">Duración del Contrato</p>
                                    <p className="h5">{activeSponsor.duration} temporada(s)</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-white-50 text-center p-3">No hay un contrato de patrocinio activo para reportar.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;