import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import AuthModal from './AuthModal.jsx';
import useSiteSettings from '../hooks/useSiteSettings.js';

const API_URL = 'http://localhost:4000/api';

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function normalizeProduct(product) {
  return {
    id: Number(product.id),
    name: product.name || 'Товар',
    article: product.article || '',
    category: product.category || '',
    price: Number(product.price || 0),
    image:
      product.image_url ||
      product.image ||
      'https://placehold.co/120x140?text=TETIM',
    description: product.description || '',
  };
}

export default function Header({ cartCount = 0, search = '', onSearchChange }) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(search || '');
  const [products, setProducts] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const settings = useSiteSettings();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';

    if (urlSearch) {
      setLocalSearch(urlSearch);
    } else if (search) {
      setLocalSearch(search);
    }
  }, [searchParams, search]);

  async function loadProducts() {
    try {
      const response = await fetch(`${API_URL}/public/products`);
      const data = await response.json();

      if (response.ok) {
        setProducts((data.products || []).map(normalizeProduct));
      }
    } catch {
      setProducts([]);
    }
  }

  const searchPreviewProducts = useMemo(() => {
    const text = localSearch.trim().toLowerCase();

    if (text.length < 2) {
      return [];
    }

    return products
      .filter((product) => {
        return (
          String(product.name).toLowerCase().includes(text) ||
          String(product.article).toLowerCase().includes(text) ||
          String(product.category).toLowerCase().includes(text) ||
          String(product.description).toLowerCase().includes(text)
        );
      })
      .slice(0, 5);
  }, [products, localSearch]);

  const shouldShowSearchPreview =
    isSearchFocused && localSearch.trim().length >= 2;

  function handleSearchChange(value) {
    setLocalSearch(value);

    if (onSearchChange) {
      onSearchChange(value);
    }
  }

  function submitSearch(event) {
    event.preventDefault();

    const text = localSearch.trim();

    if (!text) {
      navigate('/catalog');
      return;
    }

    setIsSearchFocused(false);
    navigate(`/catalog?search=${encodeURIComponent(text)}`);
  }

  function openProduct(productId) {
    setIsSearchFocused(false);
    navigate(`/product/${productId}`);
  }

  function openAllResults() {
    const text = localSearch.trim();

    if (!text) {
      return;
    }

    setIsSearchFocused(false);
    navigate(`/catalog?search=${encodeURIComponent(text)}`);
  }

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

            <form className="search-box search-box-with-preview" onSubmit={submitSearch}>
              <input
                type="text"
                value={localSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Поиск по товарам"
              />

              {shouldShowSearchPreview && (
                <div className="search-preview">
                  {searchPreviewProducts.length > 0 ? (
                    <>
                      <div className="search-preview-title">
                        Предварительный просмотр
                      </div>

                      {searchPreviewProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="search-preview-item"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            openProduct(product.id);
                          }}
                        >
                          <span className="search-preview-image">
                            <img src={product.image} alt={product.name} />
                          </span>

                          <span className="search-preview-info">
                            <strong>{product.name}</strong>
                            <small>
                              {product.article ? `Артикул: ${product.article}` : 'TETIM'}
                            </small>
                          </span>

                          <b>{formatPrice(product.price)}</b>
                        </button>
                      ))}

                      <button
                        type="button"
                        className="search-preview-all"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          openAllResults();
                        }}
                      >
                        Показать все результаты
                      </button>
                    </>
                  ) : (
                    <div className="search-preview-empty">
                      Ничего не найдено
                    </div>
                  )}
                </div>
              )}
            </form>

            <div className="header-icons">
              {user ? (
                <Link to="/account" className="account-mini">
                  <span className="account-mini-icon">👤</span>

                  <span className="account-mini-text">
                    <span className="account-mini-label">Аккаунт</span>
                    <strong>{user.name || 'Пользователь'}</strong>
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

        <div className="header-ornament-css" aria-hidden="true" />
      </header>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={() => window.location.reload()}
      />
    </>
  );
}