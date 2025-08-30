// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// 1. Importaciones para la nueva arquitectura
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Importaciones de Contextos existentes
import { AuthProvider } from './context/AuthContext.jsx';
import { GameProvider } from './context/GameContext.jsx'; // Aún la necesitamos temporalmente

// Importaciones de DnD
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// 2. Creamos una instancia única de QueryClient
// Este objeto es como el "cerebro" que manejará toda la caché de datos de nuestra app.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita recargas automáticas molestas en un juego
      staleTime: 1000 * 60 * 5, // Los datos se consideran "frescos" por 5 minutos
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 3. Envolvemos TODA la aplicación en el QueryClientProvider */}
    <QueryClientProvider client={queryClient}>
      <DndProvider backend={HTML5Backend}>
        <AuthProvider>
          <GameProvider> {/* Dejamos GameProvider por ahora, lo vaciaremos al final */}
            <App />
          </GameProvider>
        </AuthProvider>
      </DndProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);