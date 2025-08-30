// src/pages/Match/MatchTactics.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrag, useDrop } from 'react-dnd';
import Swal from 'sweetalert2';
import './MatchTactics.css';

import { useGameSession } from '../../hooks/useGameSession';
import { useSquad } from '../../hooks/useSquad';
import { useMatchActions } from '../../hooks/useMatchActions';

const formations = {
  '4-4-2': [{ top: '88%', left: '50%' }, { top: '70%', left: '15%' }, { top: '75%', left: '35%' }, { top: '75%', left: '65%' }, { top: '70%', left: '85%' }, { top: '50%', left: '15%' }, { top: '50%', left: '35%' }, { top: '50%', left: '65%' }, { top: '50%', left: '85%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' }],
  '4-3-3': [{ top: '88%', left: '50%' }, { top: '70%', left: '15%' }, { top: '75%', left: '35%' }, { top: '75%', left: '65%' }, { top: '70%', left: '85%' }, { top: '50%', left: '25%' }, { top: '55%', left: '50%' }, { top: '50%', left: '75%' }, { top: '25%', left: '20%' }, { top: '20%', left: '50%' }, { top: '25%', left: '80%' }],
  '3-4-3': [{ top: '88%', left: '50%' }, { top: '75%', left: '25%' }, { top: '78%', left: '50%' }, { top: '75%', left: '75%' }, { top: '50%', left: '15%' }, { top: '50%', left: '35%' }, { top: '50%', left: '65%' }, { top: '50%', left: '85%' }, { top: '25%', left: '20%' }, { top: '20%', left: '50%' }, { top: '25%', left: '80%' }],
  '4-5-1': [{ top: '88%', left: '50%' }, { top: '70%', left: '15%' }, { top: '75%', left: '35%' }, { top: '75%', left: '65%' }, { top: '70%', left: '85%' }, { top: '50%', left: '10%' }, { top: '45%', left: '30%' }, { top: '55%', left: '50%' }, { top: '45%', left: '70%' }, { top: '50%', left: '90%' }, { top: '20%', left: '50%' }],
};
const MAX_SUBSTITUTIONS = 5;

const getPositionColorClass = (pos) => {
    if (pos === 'Arquero') return 'pos-arquero';
    if (pos === 'Defensor') return 'pos-defensor';
    if (pos === 'Mediocampista') return 'pos-mediocampista';
    return 'pos-delantero';
};

const PlayerNode = ({ player, position }) => {
    const lastName = player.nombreCompleto.split(' ').pop();
    const posShort = player.posicion.substring(0, 3).toUpperCase();
    return (
        <div className="player-node" style={{ top: position.top, left: position.left }}>
            <div className="player-info-on-pitch">
                <span className="player-name-on-pitch">{lastName}</span>
                <span className="player-pos-on-pitch">{posShort}</span>
            </div>
            <div className={`player-dot ${getPositionColorClass(player.posicion)}`}></div>
        </div>
    );
};

const MatchTactics = () => {
    const navigate = useNavigate();
    const { gameSession, isLoading: isSessionLoading } = useGameSession();
    const { squad, isLoading: isSquadLoading } = useSquad();
    const { confirmChanges, isConfirming } = useMatchActions();

    const [starters, setStarters] = useState([]);
    const [substitutes, setSubstitutes] = useState([]);
    const [playerPositions, setPlayerPositions] = useState({});
    const [currentFormation, setCurrentFormation] = useState('4-4-2');
    const [substitutionsMade, setSubstitutionsMade] = useState(0);

    const lineupToUse = useMemo(() => gameSession?.matchTempLineup || gameSession?.lineup, [gameSession]);
    const tacticsToUse = useMemo(() => gameSession?.matchTempTactics || gameSession?.tactics, [gameSession]);

    useEffect(() => {
        if (!isSquadLoading && squad.length > 0 && lineupToUse) {
            const getPlayerById = (id) => squad.find(p => p.id === id);
            setStarters(lineupToUse.starters.map(getPlayerById).filter(Boolean));
            setSubstitutes(lineupToUse.substitutes.map(getPlayerById).filter(Boolean));
            setCurrentFormation(tacticsToUse?.formationName || '4-4-2');
        }
    }, [squad, lineupToUse, tacticsToUse, isSquadLoading]);

    useEffect(() => {
        if (starters.length > 0) {
            const newPositions = {};
            const positionOrder = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
            const sortedStarters = [...starters].sort((a, b) => positionOrder[a.posicion] - positionOrder[b.posicion]);
            sortedStarters.forEach((player, index) => {
                newPositions[player.id] = formations[currentFormation]?.[index] || { top: '50%', left: '50%' };
            });
            setPlayerPositions(newPositions);
        }
    }, [starters, currentFormation]);

    const handleDrop = (draggedItem, targetItem) => {
        const { player: draggedPlayer, listName: sourceListName } = draggedItem;
        const { player: targetPlayer, listName: targetListName } = targetItem;
        if (draggedPlayer.id === targetPlayer.id) return;
        let newStarters = [...starters];
        let newSubstitutes = [...substitutes];
        if (sourceListName === 'substitutes' && targetListName === 'starters') {
            if (substitutionsMade >= MAX_SUBSTITUTIONS) {
                Swal.fire('Límite de Cambios', `Ya has realizado los ${MAX_SUBSTITUTIONS} cambios permitidos.`, 'error');
                return;
            }
            const starterIndex = newStarters.findIndex(p => p.id === targetPlayer.id);
            const substituteIndex = newSubstitutes.findIndex(p => p.id === draggedPlayer.id);
            if (starterIndex === -1 || substituteIndex === -1) return;
            newStarters[starterIndex] = draggedPlayer;
            newSubstitutes[substituteIndex] = targetPlayer;
            setStarters(newStarters);
            setSubstitutes(newSubstitutes);
            setSubstitutionsMade(prev => prev + 1);
        }
    };

    const handleConfirmChanges = () => {
        if (starters.length !== 11) {
            Swal.fire('Equipo Incompleto', 'Debes tener 11 jugadores.', 'error');
            return;
        }
        const newTactics = { formationName: currentFormation, playerPositions };
        confirmChanges({ newStarters: starters, newSubstitutes: substitutes, newTactics });
        navigate('/match');
    };
    
    const PlayerListItem = ({ player, listName }) => {
        const [{ isDragging }, drag] = useDrag(() => ({ type: 'player', item: { player, listName }, collect: monitor => ({ isDragging: !!monitor.isDragging() }) }));
        const [, drop] = useDrop(() => ({ accept: 'player', drop: (item) => handleDrop(item, { player, listName }) }));
        return (<li ref={node => drag(drop(node))} className={`player-item ${isDragging ? 'dragging' : ''}`}><span className="player-pos">{player.posicion.substring(0, 3).toUpperCase()}</span><span className="player-name">{player.nombreCompleto}</span></li>);
    };

    if (isSessionLoading || isSquadLoading) return <div className="match-tactics-container loading"><h1>Cargando Tácticas...</h1></div>;

    return (
        <div className="match-tactics-container">
            <div className="left-panel">
                <div className="card bg-dark text-white mb-3"><div className="card-header"><h4>Sustituciones</h4></div><div className="card-body"><p className="sub-counter">Cambios: <strong>{substitutionsMade}/{MAX_SUBSTITUTIONS}</strong></p></div></div>
                <div className="player-list-card card bg-dark text-white flex-grow-1"><div className="card-header"><h5>En Campo</h5></div><ul className="list-group list-group-flush">{starters.map(p => <PlayerListItem key={p.id} player={p} listName="starters" />)}</ul></div>
                <div className="player-list-card card bg-dark text-white flex-grow-1 mt-3"><div className="card-header"><h5>Suplentes</h5></div><ul className="list-group list-group-flush">{substitutes.map(p => <PlayerListItem key={p.id} player={p} listName="substitutes" />)}</ul></div>
            </div>
            <div className="right-panel">
                <div className="card bg-dark text-white h-100"><div className="card-header d-flex justify-content-between align-items-center"><h4 className="mb-0">Pizarra</h4><select className="form-select form-select-sm w-auto bg-secondary text-white" value={currentFormation} onChange={e => setCurrentFormation(e.target.value)}>{Object.keys(formations).map(name => <option key={name} value={name}>{name}</option>)}</select></div><div className="card-body p-0"><div className="pitch">{starters.map(player => (playerPositions[player.id] && <PlayerNode key={player.id} player={player} position={playerPositions[player.id]} />))}</div></div></div>
            </div>
            <div className="footer-panel"><button className="btn btn-success btn-lg" onClick={handleConfirmChanges} disabled={isConfirming}>{isConfirming ? 'Guardando...' : 'Confirmar y Volver'}</button></div>
        </div>
    );
};

export default MatchTactics;