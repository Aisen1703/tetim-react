import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import AuthModal from './AuthModal.jsx';
import useSiteSettings from '../hooks/useSiteSettings.js';
import { getCartCount } from '../utils/cartStorage.js';

export default function Header() {
  const settings = useSiteSettings();

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

  return (
    <>
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
            Корзина {cartCount}
          </Link>
        </div>
      </header>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={handleLogin}
      />
    </>
  );
}