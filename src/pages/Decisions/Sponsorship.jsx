// src/pages/Decisions/Sponsorship.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Sponsorship.css';

import { useGameSession } from '../../hooks/useGameSession';
import { useBoardActions } from '../../hooks/useBoardActions';

const Sponsorship = () => {
    const { gameSession, isLoading } = useGameSession();
    const { signSponsorship, isSigningSponsorship } = useBoardActions();

    if (isLoading || !gameSession) {
        return <div className="text-center text-white">Cargando ofertas...</div>;
    }

    const { sponsorship } = gameSession;
    const { activeContract, availableOffers } = sponsorship;

    const handleAcceptOffer = async (offer) => {
        if (activeContract) {
            const result = await Swal.fire({
                title: 'Ya tienes un contrato activo',
                text: 'Aceptar esta oferta reemplazará tu contrato actual. ¿Estás seguro?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, reemplazar',
                cancelButtonText: 'Cancelar'
            });
            if (!result.isConfirmed) return;
        }
        signSponsorship({ offer });
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

    return (
        <div>
            <Link to="/board" className="btn btn-secondary mb-4">← Volver al Centro de Gestión</Link>

            <div className="card bg-dark text-white mb-5">
                <div className="card-header"><h4 className="mb-0">Contrato Principal Activo</h4></div>
                <div className="card-body">
                    {activeContract ? (
                        <div>
                            <h5 className="sponsor-name">{activeContract.sponsorName}</h5>
                            <p>Duración: <strong>{activeContract.duration} temporada(s)</strong></p>
                            <p>Valor Base: <strong>{formatCurrency(activeContract.baseAmount)} / temporada</strong></p>
                            <p>Firmado el: <strong>{new Date(activeContract.startDate).toLocaleDateString()}</strong></p>
                        </div>
                    ) : (
                        <p className="text-white-50 text-center p-3">Actualmente no tienes un patrocinador principal.</p>
                    )}
                </div>
            </div>
            
            <h3 className="text-white mb-3">Ofertas sobre la mesa</h3>
            <div className="row">
                {availableOffers.length > 0 ? availableOffers.map(offer => (
                    <div key={offer.id} className="col-lg-4 mb-4">
                        <div className="card bg-secondary text-white h-100 offer-card">
                            <div className="card-body d-flex flex-column">
                                <h5 className="sponsor-name">{offer.sponsorName}</h5>
                                <hr/>
                                <p><strong>Duración:</strong> {offer.duration} temporada(s)</p>
                                <p><strong>Valor Base:</strong> {formatCurrency(offer.baseAmount)} / temporada</p>
                                <p><strong>Pago Inicial:</strong> <span className="text-success fw-bold">{formatCurrency(offer.upfrontPayment)}</span></p>
                                {offer.bonuses.length > 0 && (
                                    <><h6>Bonus:</h6><ul>{offer.bonuses.map(bonus => <li key={bonus.type}>{bonus.description}: <strong>{formatCurrency(bonus.amount)}</strong></li>)}</ul></>
                                )}
                                <div className="mt-auto">
                                    <button className="btn btn-success w-100" onClick={() => handleAcceptOffer(offer)} disabled={isSigningSponsorship}>
                                        {isSigningSponsorship ? 'Procesando...' : 'Aceptar Oferta'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-12"><p className="text-white-50">No hay nuevas ofertas de patrocinio en este momento.</p></div>
                )}
            </div>
        </div>
    );
};

export default Sponsorship;