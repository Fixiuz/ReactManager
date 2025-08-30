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
            if (!gameSession || !playerId) {
                setLoading(false);
                return;
            };
            setLoading(true);
            try {
                // Obtenemos los datos fijos del jugador de la colección maestra
                const playerRef = doc(db, 'jugadores', playerId);
                const playerSnap = await getDoc(playerRef);

                if (playerSnap.exists()) {
                    const staticData = { id: playerSnap.id, ...playerSnap.data() };
                    // Buscamos el estado del jugador en nuestra partida actual
                    const playerState = gameSession.playerStates?.[playerId];
                    
                    setPlayer({ 
                        ...staticData,
                        // Si el jugador está en nuestra partida, usamos su estado. 
                        // Si no (lo estamos viendo desde el mercado), creamos un estado temporal para visualizarlo.
                        state: playerState || {
                            equipoId: staticData.equipoId,
                            salary: staticData.salary,
                            contractYears: staticData.contractYears,
                            isTransferListed: staticData.isTransferListed,
                        }
                    });
                } else {
                    console.error("No se encontró al jugador en la colección maestra 'jugadores'");
                    setPlayer(null);
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
        const actionText = newStatus ? 'poner en la lista de transferibles' : 'quitar de la lista de transferibles';

        const result = await Swal.fire({
            title: `¿Estás seguro?`,
            text: `Vas a ${actionText} a ${player.nombreCompleto}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
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
    
    const handleMakeOffer = async () => {
        setIsProcessing(true);
        const isFreeAgent = player.state.equipoId === 'free_agent';

        const { value: formValues } = await Swal.fire({
            title: `Oferta por ${player.nombreCompleto}`,
            html: `
                <div class="swal-offer-form">
                    <p>Valor de Mercado: <b>$${player.valor.toLocaleString()}</b></p>
                    <hr/>
                    <div class="form-group">
                        <label for="swal-fee">Oferta al Club (Traspaso)</label>
                        <input id="swal-fee" class="swal2-input" type="number" value="${isFreeAgent ? 0 : player.valor}" ${isFreeAgent ? 'disabled' : ''}>
                    </div>
                    <div class="form-group">
                        <label for="swal-salary">Salario Semanal para el Jugador</label>
                        <input id="swal-salary" class="swal2-input" type="number" value="${player.state.salary || 30000}" step="1000">
                    </div>
                    <div class="form-group">
                        <label for="swal-years">Años de Contrato</label>
                        <input id="swal-years" class="swal2-input" type="number" min="1" max="5" value="3">
                    </div>
                </div>`,
            confirmButtonText: 'Enviar Oferta',
            focusConfirm: false,
            preConfirm: () => ({
                fee: parseInt(document.getElementById('swal-fee').value),
                salary: parseInt(document.getElementById('swal-salary').value),
                years: parseInt(document.getElementById('swal-years').value)
            })
        });

        if (formValues) {
            const { fee, salary, years } = formValues;
            const totalCost = fee + (salary * 4); 

            if (gameSession.finances.budget < totalCost) {
                Swal.fire('Fondos Insuficientes', `No tienes los $${totalCost.toLocaleString()} necesarios para esta operación.`, 'error');
                setIsProcessing(false);
                return;
            }

            const clubAccepts = isFreeAgent || fee >= player.valor * 0.9;
            const playerAccepts = salary >= (player.state.salary || 20000) * 1.1;

            if (clubAccepts && playerAccepts) {
                try {
                    const newBudgetData = gameSession.finances.budget - totalCost;
                    const newTransactions = [
                        ...gameSession.finances.transactions,
                        { date: new Date().toISOString(), description: `Fichaje (traspaso): ${player.nombreCompleto}`, amount: -fee, type: 'transfer' },
                        { date: new Date().toISOString(), description: `Fichaje (prima): ${player.nombreCompleto}`, amount: -(salary * 4), type: 'contract' }
                    ];
                    
                    const newPlayerStates = { ...gameSession.playerStates };
                    newPlayerStates[playerId] = {
                        equipoId: gameSession.teamId,
                        salary: salary,
                        contractYears: years,
                        isTransferListed: false
                    };

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
                    
                    await Swal.fire('¡Fichaje Realizado!', `${player.nombreCompleto} es nuevo jugador de tu club.`, 'success');
                    navigate('/squad');

                } catch (error) {
                    Swal.fire('Error', 'Hubo un problema al procesar el fichaje.', 'error');
                }
            } else {
                const reason = !clubAccepts ? 'El club ha rechazado la oferta de traspaso por considerarla insuficiente.' : 'El jugador no está satisfecho con la oferta salarial y ha rechazado el contrato.';
                Swal.fire('Oferta Rechazada', reason, 'error');
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

    // Obtén las estadísticas de temporada desde el estado del jugador
    const stats = player?.state?.seasonStats || {};

    return (
        <div className="player-detail-container">
            <Link to={isMyPlayer ? "/squad" : "/transfers"} className="btn btn-secondary mb-4">
                {isMyPlayer ? "← Volver al Plantel" : "← Volver al Mercado"}
            </Link>
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
                            <p>Minutos Jugados: {stats.minutesPlayed ?? 0}</p>
                            <p>Partidos Jugados: {stats.matchesPlayed ?? 0}</p>
                            <p>Goles: {stats.goals ?? 0}</p>
                            <p>Asistencias: {stats.assists ?? 0}</p>
                            <p>Tarjetas Amarillas: {stats.yellowCards ?? 0}</p>
                            <p>Tarjetas Rojas: {stats.redCards ?? 0}</p>
                            <p>Lesiones: {stats.injuries ?? 0}</p>
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
                                <button className="btn btn-success" disabled={isProcessing} onClick={handleMakeOffer}>
                                    {isProcessing ? 'Negociando...' : 'Hacer Oferta'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetail;