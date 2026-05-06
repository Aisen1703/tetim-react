import { useState } from 'react';
import { Link } from 'react-router-dom';

import AuthModal from './AuthModal.jsx';

export default function Header({ cartCount = 0, search = '', onSearchChange }) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <>
      <header className="site-header">

        <div className="main-header">
          <div className="container main-header-inner">
            <Link to="/" className="logo-link">
              <img
                src="/assets/logo-full.png"
                alt="TETIM"
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

        <nav className="category-nav">
          <div className="container category-nav-inner">
            <Link to="/catalog?category=accessories">Аксессуары</Link>
            <Link to="/catalog?category=pants">Брюки</Link>
            <Link to="/catalog?category=hoodies">Худи</Link>
            <Link to="/catalog?category=jackets">Куртки</Link>
            <Link to="/catalog?category=tshirts">Футболки</Link>
            <Link to="/custom-order">Индивидуальный заказ</Link>
          </div>
        </nav>
      </header>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={() => window.location.reload()}
      />
    </>
  );
}