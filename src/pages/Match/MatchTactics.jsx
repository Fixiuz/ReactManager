import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrag, useDrop } from 'react-dnd';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, documentId } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './MatchTactics.css';

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
    const { gameSession, updateCurrentGameSession } = useContext(GameContext);
    const navigate = useNavigate();

    const [starters, setStarters] = useState([]);
    const [substitutes, setSubstitutes] = useState([]);
    const [playerPositions, setPlayerPositions] = useState({});
    const [currentFormation, setCurrentFormation] = useState('4-4-2');
    const [substitutionsMade, setSubstitutionsMade] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (!gameSession?.lineup || !gameSession?.playerStates) {
            navigate('/match');
            return;
        }

        const fetchAndSetSquad = async () => {
            setLoading(true);
            try {
                const { lineup, playerStates, tactics } = gameSession;
                const allPlayerIds = [...lineup.starters, ...lineup.substitutes];
                if (allPlayerIds.length === 0) { setLoading(false); return; }

                const playersRef = collection(db, "jugadores");
                const q = query(playersRef, where(documentId(), "in", allPlayerIds));
                const querySnapshot = await getDocs(q);
                const staticPlayerData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const mergedPlayers = staticPlayerData.map(staticPlayer => ({
                    ...staticPlayer,
                    state: playerStates[staticPlayer.id]
                }));
                
                const getPlayerById = (id) => mergedPlayers.find(p => p.id === id);
                
                const currentStarters = lineup.starters.map(getPlayerById).filter(Boolean);
                setStarters(currentStarters);
                setSubstitutes(lineup.substitutes.map(getPlayerById).filter(Boolean));
                setCurrentFormation(tactics.formationName || '4-4-2');
                
            } catch (error) {
                console.error("Error fetching squad:", error);
            }
            setLoading(false);
        };
        fetchAndSetSquad();
    }, []);

    useEffect(() => {
        if (starters.length > 0) {
            const newPositions = {};
            const positionOrder = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
            const sortedStarters = [...starters].sort((a, b) => positionOrder[a.posicion] - positionOrder[b.posicion]);
    
            sortedStarters.forEach((player, index) => {
                newPositions[player.id] = formations[currentFormation][index];
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

        if (sourceListName === targetListName) {
            const list = sourceListName === 'starters' ? newStarters : newSubstitutes;
            const draggedIndex = list.findIndex(p => p.id === draggedPlayer.id);
            const targetIndex = list.findIndex(p => p.id === targetPlayer.id);
            [list[draggedIndex], list[targetIndex]] = [list[targetIndex], list[draggedIndex]];
            if (sourceListName === 'starters') setStarters(list);
            else setSubstitutes(list);
        } else {
            if (substitutionsMade >= MAX_SUBSTITUTIONS) {
                Swal.fire('Límite de Cambios', `Ya has realizado los ${MAX_SUBSTITUTIONS} cambios permitidos.`, 'error');
                return;
            }
            const sourceList = sourceListName === 'starters' ? newStarters : newSubstitutes;
            const targetList = targetListName === 'starters' ? newStarters : newSubstitutes;
            const draggedIndex = sourceList.findIndex(p => p.id === draggedPlayer.id);
            const targetIndex = targetList.findIndex(p => p.id === targetPlayer.id);
            sourceList.splice(draggedIndex, 1, targetPlayer);
            targetList.splice(targetIndex, 1, draggedPlayer);
            setStarters(newStarters);
            setSubstitutes(newSubstitutes);
            setSubstitutionsMade(prev => prev + 1);
        }
    };

    const handleFormationChange = (e) => {
        setCurrentFormation(e.target.value);
    };

    const handleConfirmChanges = async () => {
        if (starters.length !== 11) {
            Swal.fire('Equipo Incompleto', `Debes tener exactamente 11 jugadores en el campo.`, 'error');
            return;
        }
        setIsSaving(true);
        updateCurrentGameSession({
            matchTempLineup: {
                starters: starters.map(p => p.id),
                substitutes: substitutes.map(p => p.id),
                reserves: gameSession.lineup.reserves
            },
            matchTempTactics: {
                formationName: currentFormation,
                playerPositions: playerPositions
            }
        });
        await Swal.fire('Cambios Confirmados', 'El equipo está listo para el segundo tiempo.', 'success');
        navigate('/match');
    };

    const PlayerListItem = ({ player, listName }) => {
        const [{ isDragging }, drag] = useDrag(() => ({
            type: 'player',
            item: { player, listName },
            collect: monitor => ({ isDragging: !!monitor.isDragging() }),
        }));
        const [, drop] = useDrop(() => ({
            accept: 'player',
            drop: (item) => handleDrop(item, { player, listName }),
        }));
        return (
            <li ref={node => drag(drop(node))} className={`player-item ${isDragging ? 'dragging' : ''}`}>
                <span className="player-pos">{player.posicion.substring(0, 3).toUpperCase()}</span>
                <span className="player-name">{player.nombreCompleto}</span>
            </li>
        );
    };

    if (loading) {
        return <div className="match-tactics-container loading">Cargando Tácticas de Partido...</div>;
    }

    return (
        <div className="match-tactics-container">
            <div className="left-panel">
                <div className="card bg-dark text-white mb-3">
                    <div className="card-header"><h4>Sustituciones</h4></div>
                    <div className="card-body">
                        <p className="sub-counter">Cambios Realizados: <strong>{substitutionsMade} / {MAX_SUBSTITUTIONS}</strong></p>
                    </div>
                </div>
                <div className="player-list-card card bg-dark text-white flex-grow-1">
                    <div className="card-header"><h5>En Campo ({starters.length}/11)</h5></div>
                    <ul className="list-group list-group-flush">
                        {starters.map(p => <PlayerListItem key={p.id} player={p} listName="starters" />)}
                    </ul>
                </div>
                <div className="player-list-card card bg-dark text-white flex-grow-1 mt-3">
                    <div className="card-header"><h5>Suplentes ({substitutes.length})</h5></div>
                     <ul className="list-group list-group-flush">
                        {substitutes.map(p => <PlayerListItem key={p.id} player={p} listName="substitutes" />)}
                    </ul>
                </div>
            </div>
            <div className="right-panel">
                <div className="card bg-dark text-white h-100">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h4 className="mb-0">Pizarra Táctica</h4>
                        <select className="form-select form-select-sm w-auto bg-secondary text-white" value={currentFormation} onChange={handleFormationChange}>
                            {Object.keys(formations).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div className="card-body p-0">
                         <div className="pitch">
                            {starters.map(player => (
                                playerPositions[player.id] && <PlayerNode key={player.id} player={player} position={playerPositions[player.id]} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="footer-panel">
                <button className="btn btn-success btn-lg" onClick={handleConfirmChanges} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Confirmar Cambios y Volver al Partido'}
                </button>
            </div>
        </div>
    );
};

export default MatchTactics;