import React, { useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import { GameContext } from '../../context/GameContext';

const Layout = () => {
    // Consumimos el nuevo estado 'gameSession'
    const { gameSession, loadingGame } = useContext(GameContext);

    if (loadingGame) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <h2>Cargando partida...</h2>
            </div>
        );
    }

    // Si no hay sesión de juego, redirigimos
    if (!gameSession) {
        return <Navigate to="/create-game" />;
    }

    // Si hay sesión, mostramos el juego
    return (
        <div className="container-fluid min-vh-100 d-flex flex-column p-0">
            <div className="row g-0 flex-grow-1">
                <div className="col-2 bg-dark">
                    <Sidebar />
                </div>
                <div className="col-10 d-flex flex-column">
                    <Header />
                    <main className="flex-grow-1 p-4" style={{ backgroundColor: '#2d3748' }}>
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Layout;