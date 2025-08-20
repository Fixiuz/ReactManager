import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GameContext } from '../../context/GameContext';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './Merchandising.css';

const Merchandising = () => {
    const { gameSession, updateCurrentGameSession } = useContext(GameContext);
    
    // Estados para manejar las cantidades de compra y los precios de venta en los inputs
    const [purchaseQuantities, setPurchaseQuantities] = useState({});
    const [sellingPrices, setSellingPrices] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Inicializamos los estados locales cuando el componente carga los datos del juego
        if (gameSession?.merchandising?.products) {
            const initialQuantities = {};
            const initialPrices = {};
            gameSession.merchandising.products.forEach(p => {
                initialQuantities[p.id] = 100; // Cantidad por defecto
                initialPrices[p.id] = p.sellingPrice;
            });
            setPurchaseQuantities(initialQuantities);
            setSellingPrices(initialPrices);
        }
    }, [gameSession?.merchandising?.products]);

    if (!gameSession || !gameSession.merchandising) {
        return <div className="text-center text-white">Cargando datos...</div>;
    }

    const { merchandising, finances, userId } = gameSession;

    // --- Lógica para COMPRAR STOCK ---
    const handleQuantityChange = (productId, value) => {
        const quantity = parseInt(value, 10);
        setPurchaseQuantities(prev => ({
            ...prev,
            [productId]: isNaN(quantity) ? 0 : quantity,
        }));
    };

    const handleBuyStock = async (productId) => {
        setIsProcessing(true);
        const quantity = purchaseQuantities[productId] || 0;
        if (quantity <= 0) {
            Swal.fire('Cantidad Inválida', 'Debes comprar al menos 1 unidad.', 'error');
            setIsProcessing(false);
            return;
        }

        const product = merchandising.products.find(p => p.id === productId);
        const totalCost = product.manufacturingCost * quantity;

        if (finances.budget < totalCost) {
            Swal.fire('Fondos Insuficientes', 'No tienes presupuesto para esta compra.', 'error');
            setIsProcessing(false);
            return;
        }

        try {
            const newBudgetData = finances.budget - totalCost;
            const newTransaction = {
                date: new Date().toISOString(),
                description: `Compra de stock: ${quantity.toLocaleString()} x ${product.name}`,
                amount: -totalCost,
                type: 'merchandising'
            };
            const newProducts = merchandising.products.map(p => 
                p.id === productId ? { ...p, stock: p.stock + quantity } : p
            );

            const gameDocRef = doc(db, 'partidas', userId);
            await updateDoc(gameDocRef, {
                'finances.budget': newBudgetData,
                'finances.transactions': [...finances.transactions, newTransaction],
                'merchandising.products': newProducts
            });

            updateCurrentGameSession({
                finances: { ...finances, budget: newBudgetData, transactions: [...finances.transactions, newTransaction] },
                merchandising: { ...merchandising, products: newProducts }
            });

            Swal.fire('¡Compra Exitosa!', `Se han añadido ${quantity.toLocaleString()} unidades al stock.`, 'success');
        } catch (error) {
            console.error("Error al comprar stock:", error);
            Swal.fire('Error', 'Hubo un problema al procesar la compra.', 'error');
        }
        setIsProcessing(false);
    };


    // --- Lógica para GUARDAR PRECIOS DE VENTA ---
    const handlePriceChange = (productId, value) => {
        const price = parseInt(value, 10);
        setSellingPrices(prev => ({
            ...prev,
            [productId]: isNaN(price) ? 0 : price,
        }));
    };

    const handleSavePrice = async (productId) => {
        setIsProcessing(true);
        const newPrice = sellingPrices[productId] || 0;
        const product = merchandising.products.find(p => p.id === productId);

        if (newPrice <= product.manufacturingCost) {
            const result = await Swal.fire({
                title: 'Precio Bajo',
                text: 'El precio de venta es menor o igual al costo. ¿Estás seguro? No obtendrás beneficios.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Cancelar'
            });
            if (!result.isConfirmed) {
                setIsProcessing(false);
                return;
            }
        }

        try {
            const newProducts = merchandising.products.map(p => 
                p.id === productId ? { ...p, sellingPrice: newPrice } : p
            );
            
            const gameDocRef = doc(db, 'partidas', userId);
            await updateDoc(gameDocRef, { 'merchandising.products': newProducts });

            updateCurrentGameSession({ merchandising: { ...merchandising, products: newProducts } });

            Swal.fire('Precio Actualizado', `El nuevo precio de venta para ${product.name} ha sido guardado.`, 'success');

        } catch (error) {
             console.error("Error al guardar precio:", error);
            Swal.fire('Error', 'Hubo un problema al guardar el precio.', 'error');
        }
        setIsProcessing(false);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

    return (
        <div>
            <Link to="/board" className="btn btn-secondary mb-4">← Volver al Centro de Gestión</Link>
            
            {/* --- SECCIÓN DE FABRICACIÓN --- */}
            <div className="card bg-dark text-white mb-5">
                <div className="card-header"><h4 className="mb-0">Fábrica y Almacén</h4></div>
                <div className="card-body p-0">
                    <table className="table table-dark table-hover mb-0 merchandising-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Costo Unit.</th>
                                <th>Cantidad a Comprar</th>
                                <th>Costo Total</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {merchandising.products.map(p => (
                                <tr key={p.id}>
                                    <td className="align-middle">{p.name}</td>
                                    <td className="align-middle text-danger">{formatCurrency(p.manufacturingCost)}</td>
                                    <td>
                                        <input 
                                            type="number" 
                                            className="form-control quantity-input" 
                                            value={purchaseQuantities[p.id] || 0}
                                            onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                                            min="0"
                                            step="10"
                                            disabled={isProcessing}
                                        />
                                    </td>
                                    <td className="align-middle fw-bold">{formatCurrency(p.manufacturingCost * (purchaseQuantities[p.id] || 0))}</td>
                                    <td>
                                        <button className="btn btn-primary" onClick={() => handleBuyStock(p.id)} disabled={isProcessing}>Comprar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- SECCIÓN DE VENTAS --- */}
            <div className="card bg-dark text-white">
                <div className="card-header"><h4 className="mb-0">Estrategia de Ventas</h4></div>
                 <div className="card-body p-0">
                    <table className="table table-dark table-hover mb-0 merchandising-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Stock Actual</th>
                                <th>Precio de Venta</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                             {merchandising.products.map(p => (
                                <tr key={p.id}>
                                    <td className="align-middle">{p.name}</td>
                                    <td className="align-middle fw-bold">{p.stock.toLocaleString()}</td>
                                    <td>
                                        <input 
                                            type="number" 
                                            className="form-control price-input" 
                                            value={sellingPrices[p.id] || 0}
                                            onChange={(e) => handlePriceChange(p.id, e.target.value)}
                                            min="0"
                                            disabled={isProcessing}
                                        />
                                    </td>
                                    <td>
                                        <button className="btn btn-success" onClick={() => handleSavePrice(p.id)} disabled={isProcessing}>Guardar</button>
                                    </td>
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