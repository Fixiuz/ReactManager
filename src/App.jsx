import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Componentes
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

// Páginas
import Dashboard from './pages/Dashboard';
import Register from './pages/Register/Register';
import Login from './pages/Login/Login';
import CreateGame from './pages/CreateGame/CreateGame';
import Fixture from './pages/Fixture/Fixture';
import Positions from './pages/Positions/Positions';
import Results from './pages/Results/Results';
import Formation from './pages/Formation/Formation';
import Tactics from './pages/Tactics/Tactics';
import ViewOpponent from './pages/ViewOpponent/ViewOpponent'; // 1. Importa la nueva página
import Finances from './pages/Finances/Finances';
import Stadium from './pages/Stadium/Stadium';
import Decisions from './pages/Decisions/Decisions'; // 1. Importa el componente
import Squad from './pages/Squad/Squad'; 
// Aquí importaremos los futuros componentes, por ahora los dejamos comentados
import Merchandising from './pages/Decisions/Merchandising'; 
import Sponsorship from './pages/Decisions/Sponsorship.jsx';
import Reports from './pages/Decisions/Reports'; // 1. Importa el nuevo componente
import PlayerDetail from './pages/PlayerDetail/PlayerDetail'; // 1. Importa el nuevo componente
import Staff from './pages/Staff/Staff'; // 1. Importa el componente
import Transfers from './pages/Transfers/Transfers'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas Protegidas */}
        <Route path="/create-game" element={<ProtectedRoute><CreateGame /></ProtectedRoute>} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="fixture" element={<Fixture />} />
          <Route path="positions" element={<Positions />} />
          <Route path="results" element={<Results />} />
          <Route path="formation" element={<Formation />} />
          <Route path="tactics" element={<Tactics />} />
          <Route path="scout-opponent" element={<ViewOpponent />} /> 
          <Route path="finances" element={<Finances />}/>
          <Route path="stadium" element={<Stadium />} />
          <Route path="board" element={<Decisions />}>
            {/* Aquí vivirán las futuras sub-secciones. Por ahora las dejamos así. */}
            {/* <Route index element={<BoardDashboard />} /> */}
            <Route path="merchandising" element={<Merchandising />} />
            <Route path="reports" element={<Reports />} />
            <Route path="sponsorship" element={<Sponsorship />} />
          </Route>
          <Route path="squad" element={<Squad />} />
          <Route path="player/:playerId" element={<PlayerDetail />} /> {/* 2. Añade la ruta dinámica */}
          <Route path="staff" element={<Staff />} /> {/* 2. Añade la ruta */}
          <Route path="transfers" element={<Transfers />} />


        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;