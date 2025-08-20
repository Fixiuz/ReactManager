import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './Decisions.css';

const DecisionsDashboard = () => (
    <div className="row">
        <div className="col-md-6 mb-4">
            <Link to="/board/sponsorship" className="decision-link-card">
                <div className="card bg-dark text-white h-100 shadow">
                    <div className="card-body text-center p-4">
                        <i className="bi bi-briefcase-fill display-4 mb-3"></i>
                        <h4 className="card-title">Contratos y Patrocinios</h4>
                        <p className="text-white-50">Negocia y gestiona las ofertas de patrocinadores y derechos de TV para asegurar el futuro económico del club.</p>
                    </div>
                </div>
            </Link>
        </div>
        <div className="col-md-6 mb-4">
            <Link to="/board/merchandising" className="decision-link-card">
                <div className="card bg-dark text-white h-100 shadow">
                    <div className="card-body text-center p-4">
                        <i className="bi bi-shop display-4 mb-3"></i>
                        <h4 className="card-title">Gestión de Merchandising</h4>
                        <p className="text-white-50">Controla la fabricación, stock y precios de los productos oficiales del club para maximizar los ingresos por ventas.</p>
                    </div>
                </div>
            </Link>
        </div>
        <div className="col-md-12 mb-4">
             <Link to="/board/reports" className="decision-link-card">
                <div className="card bg-dark text-white h-100 shadow">
                    <div className="card-body text-center p-4">
                        <i className="bi bi-graph-up-arrow display-4 mb-3"></i>
                        <h4 className="card-title">Informes Financieros</h4>
                        <p className="text-white-50">Analiza en detalle los ingresos generados por los patrocinadores y las ventas de merchandising.</p>
                    </div>
                </div>
            </Link>
        </div>
    </div>
);


const Decisions = () => {
    const location = useLocation();
    
    // Comprobamos si estamos en la página principal de 'board' o en una sub-ruta
    const isDashboard = location.pathname === '/board';

    return (
        <div className="decisions-container">
            <h2 className="text-white text-center mb-5">Centro de Gestión Financiera</h2>
            
            {/* El Outlet renderizará los componentes de las sub-rutas */}
            {/* Si estamos en /board, mostramos el Dashboard */}
            {isDashboard ? <DecisionsDashboard /> : <Outlet />}
        </div>
    );
};

export default Decisions;