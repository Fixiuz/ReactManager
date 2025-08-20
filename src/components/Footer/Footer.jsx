import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleContinue = () => {
        // Por ahora, su única función es iniciar el partido desde el dashboard
        navigate('/match');
    };

    const handleGoBack = () => {
        navigate('/');
    };

    // Ocultamos el footer en la pantalla de partido
    if (location.pathname.startsWith('/match')) {
        return null;
    }

    return (
        <footer className="app-footer">
            <div className="container-fluid d-flex justify-content-between align-items-center h-100 px-4">
                <div>
                    {location.pathname !== '/' && (
                        <button onClick={handleGoBack} className="btn btn-secondary btn-lg">
                            ← Volver
                        </button>
                    )}
                </div>
                <div>
                    <button onClick={handleContinue} className="btn btn-success btn-lg">
                        Seguir →
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;