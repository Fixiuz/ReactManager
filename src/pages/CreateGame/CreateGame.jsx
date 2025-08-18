import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { AuthContext } from '../../context/AuthContext';
import { GameContext } from '../../context/GameContext';
import './CreateGame.css';

const CreateGame = () => {
    const [teams, setTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [managerName, setManagerName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const { user } = useContext(AuthContext);
    const { updateGameSession } = useContext(GameContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const teamsCollection = collection(db, 'equipos');
                const teamSnapshot = await getDocs(teamsCollection);
                const teamsList = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                teamsList.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setTeams(teamsList);
                if (teamsList.length > 0) {
                    setSelectedTeamId(teamsList[0].id);
                }
            } catch (err) {
                setError('Error al cargar los equipos.');
                console.error(err);
            }
            setLoading(false);
        };
        fetchTeams();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTeamId || !managerName) {
            setError('Por favor, completa todos los campos.');
            return;
        }
        setError('');

        try {
            const seasonRef = doc(db, "temporadas", "2025-Clausura");
            const seasonSnap = await getDoc(seasonRef);

            if (!seasonSnap.exists()) {
                setError("Error crítico: No se encontró la configuración de la temporada. Por favor, carga los datos de la temporada.");
                return;
            }
            const seasonData = seasonSnap.data();
            const initialLeagueState = {
                zonaA: seasonData.zones.zonaA.map(teamId => ({ teamId, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0 })),
                zonaB: seasonData.zones.zonaB.map(teamId => ({ teamId, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0 })),
            };
            const selectedTeamData = teams.find(team => team.id === selectedTeamId);

            // --- LÓGICA AÑADIDA ---
            // 1. Buscamos el plantel completo del equipo elegido
            const playersRef = collection(db, "jugadores");
            const q = query(playersRef, where("equipoId", "==", selectedTeamId));
            const querySnapshot = await getDocs(q);
            const squadPlayers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Creamos la estructura de la alineación inicial con los IDs de los jugadores
            const initialSquad = {
                starters: squadPlayers.slice(0, 11).map(p => p.id),
                substitutes: squadPlayers.slice(11, 18).map(p => p.id),
                reserves: squadPlayers.slice(18).map(p => p.id)
            };
            // --- FIN LÓGICA AÑADIDA ---

            const gameDocRef = doc(db, 'partidas', user.uid);
            const newGameData = {
                userId: user.uid,
                managerName: managerName,
                teamId: selectedTeamId,
                season: "2025-Clausura",
                currentJornada: 1,
                finances: { budget: selectedTeamData.presupuesto },
                leagueState: initialLeagueState,
                fixture: seasonData.fixture,
                squad: initialSquad, // 3. Guardamos la alineación inicial
                tactics: { // Y una táctica por defecto para el futuro
                    formationName: '4-4-2',
                    playerPositions: {}
                }
            };

            await setDoc(gameDocRef, newGameData);

            const newSession = { ...newGameData, team: selectedTeamData };
            updateGameSession(newSession);
            
            navigate('/');

        } catch (err) {
            setError('Error al crear la partida.');
            console.error(err);
        }
    };

    if (loading) {
        return <div className="loading-container"><p>Cargando equipos...</p></div>;
    }

    return (
        <div className="create-game-container">
            <div className="card p-4 shadow">
                <h2 className="text-center mb-4">Crear Nueva Partida</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="managerName" className="form-label">Nombre del Mánager</label>
                        <input
                            type="text"
                            className="form-control"
                            id="managerName"
                            value={managerName}
                            onChange={(e) => setManagerName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="teamSelect" className="form-label">Elige tu equipo</label>
                        <select
                            className="form-select"
                            id="teamSelect"
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                        >
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    {error && <p className="text-danger text-center">{error}</p>}
                    <button type="submit" className="btn btn-success w-100">Comenzar Carrera</button>
                </form>
            </div>
        </div>
    );
};

export default CreateGame;