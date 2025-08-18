import React from 'react';
import { Link } from 'react-router-dom'; // Usaremos Link para la navegación futura

const Dashboard = () => {
  return (
    <div>
      <div className="row">
        {/* Columna D. TÉCNICO */}
        <div className="col-6">
          <h4 className="text-white-50">D. TÉCNICO</h4>
          <Link to="/results" className="btn btn-secondary d-block text-start p-3 mb-2">RESULTADOS</Link>
          <Link to="/positions" className="btn btn-secondary d-block text-start p-3 mb-2">POSICIONES</Link>
          <Link to="/fixture" className="btn btn-secondary d-block text-start p-3 mb-2">FIXTURE</Link>
        </div>
        {/* Columna FINANZAS */}
        <div className="col-6">
          <h4 className="text-white-50 text-end">FORMACIÓN</h4>
           <Link to="/formation" className="btn btn-secondary d-block text-start p-3 mb-2">FORMACIÓN</Link>
          <Link to="/tactics" className="btn btn-secondary d-block text-start p-3 mb-2">TÁCTICAS</Link>
          <Link to="/scout-opponent" className="btn btn-secondary d-block text-start p-3 mb-2">VER CONTRARIO</Link>
        </div>
      </div>

      <hr className="my-4" />

      <div className="row">
        {/* Columna MERCADO */}
        <div className="col-6">
          <Link to="/transfers" className="btn btn-success d-block text-start p-3 mb-2">FICHAR</Link>
          <Link to="/staff" className="btn btn-success d-block text-start p-3 mb-2">EMPLEADOS</Link>
          <Link to="/squad" className="btn btn-success d-block text-start p-3 mb-2">PLANTEL</Link>
        </div>
        {/* Columna FINANZAS */}
        <div className="col-6">
          <Link to="/finances" className="btn btn-warning d-block text-start p-3 mb-2">CAJA</Link>
          <Link to="/board" className="btn btn-warning d-block text-start p-3 mb-2">DECISIONES</Link>
          <Link to="/stadium" className="btn btn-warning d-block text-start p-3 mb-2">ESTADIO</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;