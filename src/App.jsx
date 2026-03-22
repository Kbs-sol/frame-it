import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Configurator from './pages/Configurator.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderConfirmed from './pages/OrderConfirmed.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminPrintQueue from './pages/admin/AdminPrintQueue.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Configurator />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmed" element={<OrderConfirmed />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/print-queue" element={<AdminPrintQueue />} />
      </Routes>
    </BrowserRouter>
  );
}
