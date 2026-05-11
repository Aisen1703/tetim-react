import { useState } from 'react';
import { Link } from 'react-router-dom';

import AuthModal from './AuthModal.jsx';
import useSiteSettings from '../hooks/useSiteSettings.js';

export default function Header({ cartCount = 0, search = '', onSearchChange }) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const settings = useSiteSettings();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <>
      <header className="site-header">
        <div className="main-header">
          <div className="container main-header-inner">
            <Link to="/" className="logo-link">
              <img
                src={settings.logo_url || '/assets/logo-full.png'}
                alt={settings.site_title || 'TETIM'}
                className="brand-logo"
              />
            </Link>

            <Link to="/catalog" className="catalog-button">
              Каталог
            </Link>

            <div className="search-box">
              <input
                type="text"
                value={search}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder="Поиск по товарам"
              />
            </div>

            <div className="header-icons">
              {user ? (
                <Link to="/account" className="account-mini">
                  <span className="account-mini-icon">👤</span>

                  <span className="account-mini-text">
                    <span className="account-mini-label">Аккаунт</span>
                    <span>{user.name || 'Пользователь'}</span>
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="header-login-link"
                  onClick={() => setIsAuthOpen(true)}
                >
                  Войти
                </button>
              )}

              <Link to="/cart" className="header-icon-link cart-link">
                Корзина {cartCount}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={() => window.location.reload()}
      />
    </>
  );
}