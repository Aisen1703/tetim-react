import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';

import './styles/base.css';
import './styles/header.css';
import './styles/hero.css';
import './styles/footer.css';
import './styles/catalog.css';
import './styles/product.css';
import './styles/cart.css';
import './styles/auth.css';
import './styles/account.css';
import './styles/custom-order.css';
import './styles/admin.css';
import './styles/themes.css';
import './styles/search.css';
import './styles/toast.css';
import './styles/mobile.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);