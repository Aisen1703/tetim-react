import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import AuthModal from './AuthModal.jsx';
import useSiteSettings from '../hooks/useSiteSettings.js';
import { getCartCount } from '../utils/cartStorage.js';

export default function Header() {
  const settings = useSiteSettings();
  const location = useLocation();

  const [cartCount, setCartCount] = useState(() => getCartCount());
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    function updateCartCount() {
      setCartCount(getCartCount());
    }
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('tetim-cart-updated', updateCartCount);
    window.addEventListener('focus', updateCartCount);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('tetim-cart-updated', updateCartCount);
      window.removeEventListener('focus', updateCartCount);
    };
  }, []);

  function handleLogin(nextUser) {
    setUser(nextUser);
  }

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* ── Десктоп хедер ── */}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="header-logo">
            <img
              src={settings.logo_url || '/assets/logo-full.png'}
              alt={settings.site_title || 'TETIM'}
            />
          </Link>

          <Link to="/catalog" className="header-catalog-btn">
            Каталог
          </Link>

          <div className="header-search">
            <input placeholder="Поиск по товарам" />
          </div>

          {user ? (
            <Link to={user.role === 'admin' ? '/admin' : '/account'} className="header-account">
              <span className="header-account-icon">👤</span>
              <span>
                <small>Аккаунт</small>
                <strong>{user.role === 'admin' ? 'Админ' : user.name || 'Кабинет'}</strong>
              </span>
            </Link>
          ) : (
            <button type="button" className="header-login-btn" onClick={() => setAuthOpen(true)}>
              Войти
            </button>
          )}

          <Link to="/cart" className="header-cart-btn">
            Корзина {cartCount > 0 && <span className="header-cart-badge">{cartCount}</span>}
          </Link>
        </div>
      </header>

      {/* ── Мобильный хедер (только лого + поиск) ── */}
      <header className="mobile-header">
        <Link to="/" className="mobile-header-logo">
          <img
            src={settings.logo_url || '/assets/logo-full.png'}
            alt={settings.site_title || 'TETIM'}
          />
        </Link>
        <div className="mobile-header-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Поиск по товарам" />
        </div>
      </header>

      {/* ── Нижняя мобильная навигация ── */}
      <nav className="mobile-nav">
        <Link to="/" className={`mobile-nav-item${isActive('/') ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Главная</span>
        </Link>

        <Link to="/catalog" className={`mobile-nav-item${isActive('/catalog') ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>Каталог</span>
        </Link>

        <Link to="/cart" className={`mobile-nav-item mobile-nav-cart${isActive('/cart') ? ' active' : ''}`}>
          <div className="mobile-nav-cart-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {cartCount > 0 && <span className="mobile-cart-badge">{cartCount}</span>}
          </div>
          <span>Корзина</span>
        </Link>

        <Link
          to="/custom-order"
          className={`mobile-nav-item${isActive('/custom-order') ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span>Заказ</span>
        </Link>

        {user ? (
          <Link
            to={user.role === 'admin' ? '/admin' : '/account'}
            className={`mobile-nav-item${(isActive('/account') || isActive('/admin')) ? ' active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{user.role === 'admin' ? 'Админ' : 'Кабинет'}</span>
          </Link>
        ) : (
          <button
            type="button"
            className="mobile-nav-item"
            onClick={() => setAuthOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Войти</span>
          </button>
        )}
      </nav>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={handleLogin}
      />
    </>
  );
}