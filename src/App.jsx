import { Routes, Route } from 'react-router-dom';


import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Cart from './pages/Cart.jsx';
import Account from './pages/Account.jsx';
import Product from './pages/Product.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import CustomOrder from './pages/CustomOrder.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/catalog" element={<Catalog />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/account" element={<Account />} />
      <Route path="/product/:id" element={<Product />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/custom-order" element={<CustomOrder />} />
    </Routes>
  );
}