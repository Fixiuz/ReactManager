import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importación de Componentes de Layout y Seguridad
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

// Importación de Páginas
import Dashboard from './pages/Dashboard';
import Register from './pages/Register/Register';
import Login from './pages/Login/Login';
import CreateGame from './pages/CreateGame/CreateGame';
import Fixture from './pages/Fixture/Fixture';
import Positions from './pages/Positions/Positions';
import Results from './pages/Results/Results'; // 1. Importa la nueva página

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Rutas Públicas --- */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* --- Rutas Protegidas --- */}
        <Route 
          path="/create-game" 
          element={
            <ProtectedRoute>
              <CreateGame />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="fixture" element={<Fixture />} />
          <Route path="positions" element={<Positions />} />
          <Route path="results" element={<Results />} /> {/* 2. Añade la ruta */}
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;