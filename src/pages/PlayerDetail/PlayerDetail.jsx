import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './PlayerDetail.css';

// --- Sub-componente para las Estrellas ---
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

const PlayerDetail = () => {
    const { playerId } = useParams();
    const navigate = useNavigate();
    const { gameSession, updateCurrentGameSession } = useContext(GameContext);
    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchPlayer = async () => {
            if (!gameSession?.playerStates || !playerId) {
                setLoading(false);
                return;
            };
            setLoading(true);
            try {
                const playerState = gameSession.playerStates[playerId];
                if (!playerState && gameSession.teamId) {
                    // This logic handles viewing a player not on your team (from the transfer market)
                    const playerRef = doc(db, 'jugadores', playerId);
                    const playerSnap = await getDoc(playerRef);
                    if (playerSnap.exists()) {
                         setPlayer({ 
                            id: playerSnap.id, 
                            ...playerSnap.data(),
                            state: { // Create a temporary state for viewing
                                equipoId: playerSnap.data().equipoId,
                                salary: playerSnap.data().salary,
                                contractYears: playerSnap.data().contractYears,
                                isTransferListed: playerSnap.data().isTransferListed,
                            }
                        });
                    }
                } else {
                    const playerRef = doc(db, 'jugadores', playerId);
                    const playerSnap = await getDoc(playerRef);

                    if (playerSnap.exists()) {
                        setPlayer({ 
                            id: playerSnap.id, 
                            ...playerSnap.data(),
                            state: playerState
                        });
                    }
                }
            } catch (error) {
                console.error("Error al cargar datos del jugador:", error);
            }
            setLoading(false);
        };

        fetchPlayer();
    }, [playerId, gameSession]);

    const handleToggleTransferList = async () => {
        setIsProcessing(true);
        const currentStatus = player.state.isTransferListed || false;
        const newStatus = !currentStatus;

        try {
            // 1. Actualizamos el documento MAESTRO del jugador (para que sea público)
            const playerRef = doc(db, 'jugadores', playerId);
            await updateDoc(playerRef, { isTransferListed: newStatus });

            // 2. Actualizamos el ESTADO dentro de nuestra partida
            const newPlayerStates = { ...gameSession.playerStates };
            newPlayerStates[playerId].isTransferListed = newStatus;
            const gameDocRef = doc(db, 'partidas', gameSession.userId);
            await updateDoc(gameDocRef, { playerStates: newPlayerStates });

            // 3. Actualizamos el estado local del juego y del componente
            updateCurrentGameSession({ playerStates: newPlayerStates });
            setPlayer(p => ({...p, state: {...p.state, isTransferListed: newStatus}}));

            Swal.fire('¡Éxito!', `${player.nombreCompleto} ha sido ${newStatus ? 'puesto en' : 'quitado de'} la lista de transferibles.`, 'success');
        } catch (error) {
            console.error("Error al actualizar estado de transferencia:", error);
            Swal.fire('Error', 'Hubo un problema al actualizar al jugador.', 'error');
        }
        setIsProcessing(false);
    };

    const handleRenewContract = async () => {
        setIsProcessing(true);
        const { value: formValues } = await Swal.fire({
            title: `Renovar a ${player.nombreCompleto}`,
            html: `
                <div class="swal-renewal-form">
                    <p>Salario Actual: <b>$${player.state.salary.toLocaleString()}</b> | Años Restantes: <b>${player.state.contractYears}</b></p>
                    <hr/>
                    <div class="form-group">
                        <label for="swal-salary">Nuevo Salario Semanal</label>
                        <input id="swal-salary" class="swal2-input" type="number" value="${player.state.salary}" step="1000">
                    </div>
                    <div class="form-group">
                        <label for="swal-years">Nuevos Años de Contrato</label>
                        <input id="swal-years" class="swal2-input" type="number" min="1" max="5" value="${player.state.contractYears < 2 ? 3 : player.state.contractYears}">
                    </div>
                </div>`,
            confirmButtonText: 'Ofrecer Contrato',
            focusConfirm: false,
            preConfirm: () => ({
                salary: parseInt(document.getElementById('swal-salary').value),
                years: parseInt(document.getElementById('swal-years').value)
            })
        });

        if (formValues) {
            const { salary: newSalary, years: newYears } = formValues;
            const overall = calculateOverall(player);
            const expectedSalary = Math.round(player.state.salary * (1 + (overall - 70) / 100));

            if (newSalary < expectedSalary) {
                Swal.fire('Oferta Rechazada', 'El jugador y su agente consideran que la oferta salarial es demasiado baja.', 'error');
                setIsProcessing(false);
                return;
            }

            const renewalBonus = newSalary * 4;
            if (gameSession.finances.budget < renewalBonus) {
                Swal.fire('Fondos Insuficientes', `No tienes los $${renewalBonus.toLocaleString()} necesarios para la prima de renovación.`, 'error');
                setIsProcessing(false);
                return;
            }

            try {
                const newBudgetData = gameSession.finances.budget - renewalBonus;
                const newTransactions = [...gameSession.finances.transactions, { date: new Date().toISOString(), description: `Prima de renovación: ${player.nombreCompleto}`, amount: -renewalBonus, type: 'contract' }];
                
                const newPlayerStates = { ...gameSession.playerStates };
                newPlayerStates[playerId].salary = newSalary;
                newPlayerStates[playerId].contractYears = newYears;

                const gameDocRef = doc(db, 'partidas', gameSession.userId);
                await updateDoc(gameDocRef, {
                    'finances.budget': newBudgetData,
                    'finances.transactions': newTransactions,
                    'playerStates': newPlayerStates
                });

                updateCurrentGameSession({
                    finances: { ...gameSession.finances, budget: newBudgetData, transactions: newTransactions },
                    playerStates: newPlayerStates
                });
                Swal.fire('¡Contrato Renovado!', `${player.nombreCompleto} ha firmado un nuevo contrato por ${newYears} año(s).`, 'success');

            } catch (error) {
                console.error("Error al renovar contrato:", error);
                Swal.fire('Error', 'Hubo un problema al procesar la renovación.', 'error');
            }
        }
        setIsProcessing(false);
    };

    const handleFirePlayer = async () => {
        setIsProcessing(true);
        const severanceFee = player.state.salary * 52 * player.state.contractYears * 0.5;

        const result = await Swal.fire({
            title: '¿CONFIRMAR DESPIDO?',
            html: `<div class="text-danger"><p>Esta acción es irreversible.</p><p>Despedir a <strong>${player.nombreCompleto}</strong> tendrá un costo de indemnización de <strong>$${severanceFee.toLocaleString()}</strong>.</p></div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, despedir jugador',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            if (gameSession.finances.budget < severanceFee) {
                Swal.fire('Fondos Insuficientes', `No tienes el dinero para pagar la indemnización.`, 'error');
                setIsProcessing(false);
                return;
            }

            try {
                const newBudgetData = gameSession.finances.budget - severanceFee;
                const newTransactions = [...gameSession.finances.transactions, { date: new Date().toISOString(), description: `Indemnización por despido: ${player.nombreCompleto}`, amount: -severanceFee, type: 'contract' }];

                const newPlayerStates = { ...gameSession.playerStates };
                newPlayerStates[playerId].equipoId = "free_agent";
                newPlayerStates[playerId].salary = 0;
                newPlayerStates[playerId].contractYears = 0;
                newPlayerStates[playerId].isTransferListed = false;

                const gameDocRef = doc(db, 'partidas', gameSession.userId);
                await updateDoc(gameDocRef, {
                    'finances.budget': newBudgetData,
                    'finances.transactions': newTransactions,
                    'playerStates': newPlayerStates
                });

                updateCurrentGameSession({
                    finances: { ...gameSession.finances, budget: newBudgetData, transactions: newTransactions },
                    playerStates: newPlayerStates
                });
                await Swal.fire('Jugador Despedido', `${player.nombreCompleto} ya no forma parte del club.`, 'success');
                navigate('/squad');
            } catch (error) {
                console.error("Error al despedir jugador:", error);
                Swal.fire('Error', 'Hubo un problema al procesar el despido.', 'error');
            }
        }
        setIsProcessing(false);
    };

    const calculateOverall = (p) => {
        if (!p || !p.atributos) return 0;
        const { atributos, posicion } = p;
        if (posicion === 'Arquero') {
            return Math.round((atributos.porteria + atributos.velocidad) / 2);
        } else {
            const { defensa, mediocampo, ataque, velocidad } = atributos;
            return Math.round((defensa + mediocampo + ataque + velocidad) / 4);
        }
    };
    
    if (loading) {
        return <div className="text-center text-white">Cargando ficha del jugador...</div>;
    }

    if (!player) {
        return <div className="text-center text-white">No se pudo encontrar al jugador.</div>;
    }
    
    const isMyPlayer = player.state.equipoId === gameSession.teamId;
    const isListed = player.state.isTransferListed || false;

    return (
        <div className="player-detail-container">
            <Link to="/squad" className="btn btn-secondary mb-4">← Volver al Plantel</Link>
            <div className="row">
                <div className="col-lg-8">
                    <div className="card bg-dark text-white mb-4">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h3 className="mb-0">{player.nombreCompleto}</h3>
                            <span className="badge bg-primary fs-5">{player.posicion}</span>
                        </div>
                        <div className="card-body">
                            <p><strong>Edad:</strong> {player.edad} años</p>
                            <p><strong>Nacionalidad:</strong> {player.nacionalidad}</p>
                            <p><strong>Valor de Mercado:</strong> ${player.valor?.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="card bg-dark text-white">
                        <div className="card-header"><h5 className="mb-0">Estadísticas de Temporada</h5></div>
                        <div className="card-body">
                            <p>Partidos Jugados: 0</p>
                            <p>Goles: 0</p>
                            <p>Asistencias: 0</p>
                            <p>Tarjetas Amarillas: 0</p>
                            <p>Tarjetas Rojas: 0</p>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="card bg-dark text-white mb-4">
                        <div className="card-header"><h5 className="mb-0">Atributos</h5></div>
                        <div className="card-body">
                            <div className="attribute-item"><span>Portería</span> <StarRating rating={player.atributos.porteria} /></div>
                            <div className="attribute-item"><span>Defensa</span> <StarRating rating={player.atributos.defensa} /></div>
                            <div className="attribute-item"><span>Mediocampo</span> <StarRating rating={player.atributos.mediocampo} /></div>
                            <div className="attribute-item"><span>Ataque</span> <StarRating rating={player.atributos.ataque} /></div>
                            <div className="attribute-item"><span>Velocidad</span> <StarRating rating={player.atributos.velocidad} /></div>
                            <hr />
                            <div className="attribute-item overall">
                                <span>VALORACIÓN MEDIA</span>
                                <span className="fw-bold fs-4">{calculateOverall(player)}</span>
                            </div>
                        </div>
                    </div>
                     <div className="card bg-dark text-white mb-4">
                        <div className="card-header"><h5 className="mb-0">Contrato</h5></div>
                        <div className="card-body">
                           <p><strong>Salario:</strong> ${player.state.salary?.toLocaleString()} / semana</p>
                           <p className={player.state.contractYears === 1 ? 'contract-warning' : ''}>
                               <strong>Años Restantes:</strong> {player.state.contractYears}
                           </p>
                        </div>
                    </div>
                     <div className="card bg-dark text-white">
                        <div className="card-header"><h5 className="mb-0">Acciones</h5></div>
                        <div className="card-body d-grid gap-2">
                            {isMyPlayer ? (
                                <>
                                    <button className="btn btn-primary" disabled={isProcessing} onClick={handleRenewContract}>Renovar Contrato</button>
                                    <button 
                                        className={`btn ${isListed ? 'btn-outline-info' : 'btn-info'}`} 
                                        disabled={isProcessing}
                                        onClick={handleToggleTransferList}>
                                        {isProcessing ? 'Procesando...' : (isListed ? 'Quitar de Transferibles' : 'Poner en Transferibles')}
                                    </button>
                                    <button className="btn btn-warning" disabled>Ver Ofertas</button>
                                    <button className="btn btn-danger" disabled={isProcessing} onClick={handleFirePlayer}>
                                        {isProcessing ? 'Procesando...' : 'Despedir Jugador'}
                                    </button>
                                </>
                            ) : (
                                <button className="btn btn-success" disabled={isProcessing}>Hacer Oferta</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetail;