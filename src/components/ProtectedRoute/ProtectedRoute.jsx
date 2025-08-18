import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // Ajusta la ruta si es necesario

const ProtectedRoute = ({ children }) => {
    // Nos conectamos al "Wi-Fi" de la autenticación para saber si hay un usuario
    const { user } = useContext(AuthContext);

    // Si no hay un usuario, lo redirigimos a la página de login
    if (!user) {
        return <Navigate to="/login" />;
    }

    // Si hay un usuario, mostramos el contenido que esta ruta está protegiendo
    return children;
};

export default ProtectedRoute;