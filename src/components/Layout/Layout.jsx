import React, { useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import Footer from '../Footer/Footer'; // 1. Importamos el nuevo Footer
import { GameContext } from '../../context/GameContext';
import './Layout.css'; // 2. Nos aseguramos de importar el CSS del Layout

const Layout = () => {
    const { gameSession, loadingGame } = useContext(GameContext);

    if (loadingGame) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <h2>Cargando partida...</h2>
            </div>
        );
    }

    if (!gameSession) {
        return <Navigate to="/create-game" />;
    }

    // 3. Envolvemos todo en un div con una clase para manejar el padding
    return (
        <div className="layout-container-with-footer">
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
            <Footer /> {/* 4. Añadimos el componente Footer al final */}
        </div>
    );
};

export default Layout;