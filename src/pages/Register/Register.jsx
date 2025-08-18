import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config'; // Asegúrate que la ruta sea correcta
import './Register.css';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Limpiamos cualquier error anterior

        try {
            // Usamos la función de Firebase para crear un nuevo usuario
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Usuario registrado:', userCredential.user);
            
            // Si el registro es exitoso, lo redirigimos al dashboard principal
            navigate('/');
        } catch (err) {
            // Manejamos los errores más comunes de Firebase
            if (err.code === 'auth/email-already-in-use') {
                setError('El correo electrónico ya está en uso.');
            } else if (err.code === 'auth/invalid-email') {
                setError('El correo electrónico no es válido.');
            } else if (err.code === 'auth/weak-password') {
                setError('La contraseña debe tener al menos 6 caracteres.');
            } else {
                setError('Ocurrió un error al registrar el usuario.');
            }
            console.error(err.code, err.message);
        }
    };

    return (
        <div className="register-container">
            <div className="card p-4 shadow">
                <h2 className="text-center mb-4">Crear Cuenta</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="emailInput" className="form-label">Correo Electrónico</label>
                        <input
                            type="email"
                            className="form-control"
                            id="emailInput"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="passwordInput" className="form-label">Contraseña</label>
                        <input
                            type="password"
                            className="form-control"
                            id="passwordInput"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    {error && <p className="text-danger text-center">{error}</p>}
                    
                    <button type="submit" className="btn btn-primary w-100">Registrarse</button>
                </form>
                <p className="mt-3 text-center">
                    ¿Ya tienes una cuenta? <Link to="/login">Inicia Sesión</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;