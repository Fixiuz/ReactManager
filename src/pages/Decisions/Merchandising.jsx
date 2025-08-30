// src/pages/Decisions/Merchandising.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Merchandising.css';

import { useGameSession } from '../../hooks/useGameSession';
import { useBoardActions } from '../../hooks/useBoardActions';

const Merchandising = () => {
    const { gameSession, isLoading } = useGameSession();
    const { buyStock, isBuyingStock, savePrice, isSavingPrice } = useBoardActions();
    
    const [purchaseQuantities, setPurchaseQuantities] = useState({});
    const [sellingPrices, setSellingPrices] = useState({});

    useEffect(() => {
        if (gameSession?.merchandising?.products) {
            const initialQuantities = {};
            const initialPrices = {};
            gameSession.merchandising.products.forEach(p => {
                initialQuantities[p.id] = 100;
                initialPrices[p.id] = p.sellingPrice;
            });
            setPurchaseQuantities(initialQuantities);
            setSellingPrices(initialPrices);
        }
    }, [gameSession?.merchandising?.products]);

    const isProcessing = isBuyingStock || isSavingPrice;

    if (isLoading || !gameSession) {
        return <div className="text-center text-white">Cargando datos...</div>;
    }

    const { merchandising, finances } = gameSession;

    const handleQuantityChange = (productId, value) => {
        const quantity = parseInt(value, 10);
        setPurchaseQuantities(prev => ({ ...prev, [productId]: isNaN(quantity) ? 0 : quantity }));
    };

    const handleBuyStock = (product) => {
        const quantity = purchaseQuantities[product.id] || 0;
        if (quantity <= 0) {
            Swal.fire('Cantidad Inválida', 'Debes comprar al menos 1 unidad.', 'error');
            return;
        }
        buyStock({ product, quantity });
    };

    const handlePriceChange = (productId, value) => {
        const price = parseInt(value, 10);
        setSellingPrices(prev => ({ ...prev, [productId]: isNaN(price) ? 0 : price }));
    };

    const handleSavePrice = async (product) => {
        const newPrice = sellingPrices[product.id] || 0;
        if (newPrice <= product.manufacturingCost) {
            const result = await Swal.fire({
                title: 'Precio Bajo',
                text: 'El precio de venta es menor o igual al costo. ¿Estás seguro?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Cancelar'
            });
            if (!result.isConfirmed) return;
        }
        savePrice({ productId: product.id, newPrice });
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

    return (
        <div>
            <Link to="/board" className="btn btn-secondary mb-4">← Volver al Centro de Gestión</Link>
            
            <div className="card bg-dark text-white mb-5">
                <div className="card-header"><h4 className="mb-0">Fábrica y Almacén</h4></div>
                <div className="card-body p-0">
                    <table className="table table-dark table-hover mb-0 merchandising-table">
                        <thead><tr><th>Producto</th><th>Costo Unit.</th><th>Cantidad a Comprar</th><th>Costo Total</th><th>Acción</th></tr></thead>
                        <tbody>
                            {merchandising.products.map(p => (
                                <tr key={p.id}>
                                    <td className="align-middle">{p.name}</td>
                                    <td className="align-middle text-danger">{formatCurrency(p.manufacturingCost)}</td>
                                    <td><input type="number" className="form-control quantity-input" value={purchaseQuantities[p.id] || 0} onChange={(e) => handleQuantityChange(p.id, e.target.value)} min="0" step="10" disabled={isProcessing}/></td>
                                    <td className="align-middle fw-bold">{formatCurrency(p.manufacturingCost * (purchaseQuantities[p.id] || 0))}</td>
                                    <td><button className="btn btn-primary" onClick={() => handleBuyStock(p)} disabled={isProcessing}>Comprar</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card bg-dark text-white">
                <div className="card-header"><h4 className="mb-0">Estrategia de Ventas</h4></div>
                 <div className="card-body p-0">
                    <table className="table table-dark table-hover mb-0 merchandising-table">
                        <thead><tr><th>Producto</th><th>Stock Actual</th><th>Precio de Venta</th><th>Acción</th></tr></thead>
                        <tbody>
                             {merchandising.products.map(p => (
                                <tr key={p.id}>
                                    <td className="align-middle">{p.name}</td>
                                    <td className="align-middle fw-bold">{p.stock.toLocaleString()}</td>
                                    <td><input type="number" className="form-control price-input" value={sellingPrices[p.id] || 0} onChange={(e) => handlePriceChange(p.id, e.target.value)} min="0" disabled={isProcessing}/></td>
                                    <td><button className="btn btn-success" onClick={() => handleSavePrice(p)} disabled={isProcessing}>Guardar</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Merchandising;