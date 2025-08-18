import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleGoToMatch = () => {
        // En el futuro, aquí irá la lógica para simular el partido
        alert("¡Próximamente: Simulación del partido y avance de fecha!");
    };

    const handleGoBack = () => {
        navigate('/'); // La función de volver siempre te llevará al Dashboard principal
    };

    return (
        <footer className="app-footer">
            <div className="container-fluid d-flex justify-content-between align-items-center h-100 px-4">
                <div>
                    {/* El botón de Volver solo se muestra si NO estamos en la página principal ('/') */}
                    {location.pathname !== '/' && (
                        <button onClick={handleGoBack} className="btn btn-secondary btn-lg">
                            ← Volver
                        </button>
                    )}
                </div>
                <div>
                    <button onClick={handleGoToMatch} className="btn btn-success btn-lg">
                        Seguir →
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;