import React, { useContext, useState, useEffect, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './Tactics.css';

// --- Definición de las Formaciones ---
const formations = {
  '4-4-2': [
    { top: '88%', left: '50%' }, // ARQ
    { top: '70%', left: '15%' }, { top: '75%', left: '35%' }, { top: '75%', left: '65%' }, { top: '70%', left: '85%' }, // DEF
    { top: '50%', left: '15%' }, { top: '50%', left: '35%' }, { top: '50%', left: '65%' }, { top: '50%', left: '85%' }, // MED
    { top: '25%', left: '40%' }, { top: '25%', left: '60%' }  // DEL
  ],
  '4-3-3': [
    { top: '88%', left: '50%' }, // ARQ
    { top: '70%', left: '15%' }, { top: '75%', left: '35%' }, { top: '75%', left: '65%' }, { top: '70%', left: '85%' }, // DEF
    { top: '50%', left: '25%' }, { top: '55%', left: '50%' }, { top: '50%', left: '75%' }, // MED
    { top: '25%', left: '20%' }, { top: '20%', left: '50%' }, { top: '25%', left: '80%' }  // DEL
  ],
  '3-4-3': [
    { top: '88%', left: '50%' }, // ARQ
    { top: '75%', left: '25%' }, { top: '78%', left: '50%' }, { top: '75%', left: '75%' }, // DEF
    { top: '50%', left: '15%' }, { top: '50%', left: '35%' }, { top: '50%', left: '65%' }, { top: '50%', left: '85%' }, // MED
    { top: '25%', left: '20%' }, { top: '20%', left: '50%' }, { top: '25%', left: '80%' }  // DEL
  ],
  '4-5-1': [
    { top: '88%', left: '50%' }, // ARQ
    { top: '70%', left: '15%' }, { top: '75%', left: '35%' }, { top: '75%', left: '65%' }, { top: '70%', left: '85%' }, // DEF
    { top: '50%', left: '10%' }, { top: '45%', left: '30%' }, { top: '55%', left: '50%' }, { top: '45%', left: '70%' }, { top: '50%', left: '90%' }, // MED
    { top: '20%', left: '50%' }  // DEL
  ],
};

const getPositionColorClass = (pos) => {
    if (pos === 'Arquero') return 'pos-arquero';
    if (pos === 'Defensor') return 'pos-defensor';
    if (pos === 'Mediocampista') return 'pos-mediocampista';
    return 'pos-delantero';
};

const TeamStats = ({ players }) => {
    const stats = useMemo(() => {
        if (!players || players.length < 11) {
            return { porteria: 0, defensa: 0, mediocampo: 0, ataque: 0, general: 0 };
        }
        const goalkeepers = players.filter(p => p.posicion === 'Arquero');
        const defenders = players.filter(p => p.posicion === 'Defensor');
        const midfielders = players.filter(p => p.posicion === 'Mediocampista');
        const forwards = players.filter(p => p.posicion === 'Delantero');

        const avg = (arr, attr) => arr.length > 0 ? arr.reduce((sum, p) => sum + p.atributos[attr], 0) / arr.length : 0;

        const porteria = avg(goalkeepers, 'porteria');
        const defensa = avg(defenders, 'defensa');
        const mediocampo = avg(midfielders, 'mediocampo');
        const ataque = avg(forwards, 'ataque');
        
        const general = (porteria + defensa + mediocampo + ataque) / 4;

        return {
            porteria: Math.round(porteria),
            defensa: Math.round(defensa),
            mediocampo: Math.round(mediocampo),
            ataque: Math.round(ataque),
            general: Math.round(general)
        };
    }, [players]);

    const StarRating = ({ rating }) => {
        const totalStars = 5;
        const filledStars = Math.round((rating / 100) * totalStars);
        return (
            <div className="star-rating">
                {[...Array(totalStars)].map((_, i) => (
                    <span key={i} className={i < filledStars ? 'star filled' : 'star'}>★</span>
                ))}
            </div>
        );
    };

    return (
        <div className="card bg-dark text-white mt-4">
            <div className="card-body">
                <h5 className="card-title mb-3">Media del Equipo</h5>
                <div className="stat-item"><span>Portería</span> <span className="fw-bold">{stats.porteria}</span></div>
                <div className="stat-item"><span>Defensa</span> <span className="fw-bold">{stats.defensa}</span></div>
                <div className="stat-item"><span>Mediocampo</span> <span className="fw-bold">{stats.mediocampo}</span></div>
                <div className="stat-item"><span>Ataque</span> <span className="fw-bold">{stats.ataque}</span></div>
                <hr />
                <div className="stat-item general"><span>General</span> <span className="fw-bold fs-5">{stats.general}</span></div>
                <StarRating rating={stats.general} />
            </div>
        </div>
    );
};

const PlayerDot = ({ player, position }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'player',
    item: { id: player.id, position },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      className={`player-dot ${getPositionColorClass(player.posicion)}`}
      style={{ top: position.top, left: position.left, opacity: isDragging ? 0.5 : 1 }}
      title={player.nombreCompleto}
    />
  );
};

const Tactics = () => {
  const { gameSession, updateCurrentGameSession } = useContext(GameContext);
  const [starters, setStarters] = useState([]);
  const [playerPositions, setPlayerPositions] = useState({});
  const [currentFormation, setCurrentFormation] = useState('4-4-2');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (gameSession && gameSession.squad) {
      const fetchAndSetTactics = async () => {
        setLoading(true);
        try {
          const playersRef = collection(db, "jugadores");
          const q = query(playersRef, where("equipoId", "==", gameSession.teamId));
          const querySnapshot = await getDocs(q);
          const squadPlayers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const starterIds = gameSession.squad.starters;
          const initialStarters = starterIds.map(id => squadPlayers.find(p => p.id === id)).filter(Boolean);

          // --- LÓGICA DE REORDENAMIENTO ---
          const positionOrder = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
          const sortedStarters = [...initialStarters].sort((a, b) => positionOrder[a.posicion] - positionOrder[b.posicion]);
          setStarters(sortedStarters);
          // --- FIN DE LA LÓGICA ---

          const savedTactics = gameSession.tactics || {};
          const savedFormation = savedTactics.formationName || '4-4-2';
          setCurrentFormation(savedFormation);

          if (savedTactics.playerPositions && Object.keys(savedTactics.playerPositions).length === sortedStarters.length) {
              setPlayerPositions(savedTactics.playerPositions);
          } else {
              const initialPositions = {};
              sortedStarters.forEach((player, index) => {
                  initialPositions[player.id] = formations[savedFormation][index];
              });
              setPlayerPositions(initialPositions);
          }
        } catch (error) { 
            console.error("Error fetching tactics:", error);
        }
        setLoading(false);
      };
      fetchAndSetTactics();
    }
  }, [gameSession]);

  const handleFormationChange = (e) => {
    const newFormation = e.target.value;
    setCurrentFormation(newFormation);
    const newPositions = {};
    starters.forEach((player, index) => {
      newPositions[player.id] = formations[newFormation][index];
    });
    setPlayerPositions(newPositions);
  };

  const handleSaveChanges = async () => {
    if (!gameSession) return;
    setIsSaving(true);
    try {
        const gameDocRef = doc(db, "partidas", gameSession.userId);
        const newTacticsData = {
            formationName: currentFormation,
            playerPositions: playerPositions,
        };

        await updateDoc(gameDocRef, { tactics: newTacticsData });
        updateCurrentGameSession({ tactics: newTacticsData });

        Swal.fire({
            title: '¡Guardado!',
            text: 'Tu táctica ha sido guardada con éxito.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (error) {
        console.error("Error al guardar la táctica:", error);
        Swal.fire('Error', 'Hubo un problema al guardar los cambios.', 'error');
    }
    setIsSaving(false);
  };

  const movePlayer = (id, left, top) => {
    setPlayerPositions(prev => ({ ...prev, [id]: { left: `${left}%`, top: `${top}%` } }));
  };

  const [, drop] = useDrop(() => ({
    accept: 'player',
    drop(item, monitor) {
      const pitch = document.querySelector('.pitch');
      if (!pitch) return;
      const pitchRect = pitch.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      const left = Math.min(100, Math.max(0, ((clientOffset.x - pitchRect.left) / pitchRect.width) * 100));
      const top = Math.min(100, Math.max(0, ((clientOffset.y - pitchRect.top) / pitchRect.height) * 100));
      movePlayer(item.id, left, top);
      return undefined;
    },
  }), [playerPositions]);

  if (loading) {
    return <div className="text-center text-white">Cargando Tácticas...</div>;
  }

  return (
    <div className="tactics-container">
      <h2 className="text-white text-center mb-4">Tácticas y Alineación</h2>
      <div className="player-table-container card bg-dark text-white mb-4">
        <table className="table table-dark table-sm table-hover tactics-player-table">
          <thead>
            <tr>
              <th>Jugador</th><th>Posición</th><th>POR</th><th>DEF</th><th>MED</th><th>ATA</th><th>VEL</th>
            </tr>
          </thead>
          <tbody>
            {starters.map(player => (
              <tr key={player.id} className={getPositionColorClass(player.posicion)}>
                <td className="text-start">{player.nombreCompleto}</td>
                <td>{player.posicion}</td>
                <td>{player.atributos.porteria}</td>
                <td>{player.atributos.defensa}</td>
                <td>{player.atributos.mediocampo}</td>
                <td>{player.atributos.ataque}</td>
                <td>{player.atributos.velocidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <div className="col-md-3">
            <div className="card bg-dark text-white">
                <div className="card-body">
                    <h5 className="card-title">Tácticas Pred.</h5>
                    <select className="form-select bg-secondary text-white mb-3" value={currentFormation} onChange={handleFormationChange}>
                        {Object.keys(formations).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button className="btn btn-success w-100" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? 'Guardando...' : 'Guardar Táctica'}
                    </button>
                </div>
            </div>
            <TeamStats players={starters} />
        </div>
        <div className="col-md-9">
          <div ref={drop} className="pitch">
            <div className="pitch-zone zone-del"><span>DEL</span></div>
            <div className="pitch-zone zone-med"><span>MED</span></div>
            <div className="pitch-zone zone-def"><span>DEF</span></div>
            {starters.map(player => (
              playerPositions[player.id] && <PlayerDot 
                key={player.id}
                player={player}
                position={playerPositions[player.id]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tactics;