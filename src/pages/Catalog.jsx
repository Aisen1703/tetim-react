import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import ProductCard from '../components/ProductCard.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEFAULT_CATS = [
  { value: 'all', label: 'Все товары' },
];

function getCatsFromStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem('tetim_cats') || 'null');
    if (stored && stored.length > 0) {
      return [{ value: 'all', label: 'Все товары' }, ...stored];
    }
  } catch {}
  return DEFAULT_CATS;
}

const SIZES = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

async function safeJson(r) { try { return await r.json(); } catch { return {}; } }

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || 'all';
  const searchFromUrl = searchParams.get('q') || '';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(getCatsFromStorage);
  const [activeCategory, setActiveCategory] = useState(categoryFromUrl);
  const [activeSize, setActiveSize] = useState('all');
  const [searchText, setSearchText] = useState(searchFromUrl);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Обновляем категории если администратор их изменил
  useEffect(() => {
    function syncCats() { setCategories(getCatsFromStorage()); }
    window.addEventListener('storage', syncCats);
    return () => window.removeEventListener('storage', syncCats);
  }, []);

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { setActiveCategory(categoryFromUrl); setSearchText(searchFromUrl); }, [categoryFromUrl, searchFromUrl]);

  async function loadProducts() {
    setLoading(true); setMessage('');
    try {
      const response = await fetch(`${API_URL}/public/products`);
      const data = await safeJson(response);
      if (!response.ok) { setMessage(data.message || 'Не удалось загрузить товары'); setProducts([]); return; }
      setProducts(data.products || []);
    } catch {
      setMessage('Backend не отвечает'); setProducts([]);
    } finally { setLoading(false); }
  }

  function getCategoryLabel(value) {
    return categories.find(c => c.value === value)?.label || value || 'Категория';
  }

  function changeCategory(value) {
    setActiveCategory(value);
    const p = {};
    if (value !== 'all') p.category = value;
    if (searchText.trim()) p.q = searchText.trim();
    setSearchParams(p);
  }

  function changeSearch(value) {
    setSearchText(value);
    const p = {};
    if (activeCategory !== 'all') p.category = activeCategory;
    if (value.trim()) p.q = value.trim();
    setSearchParams(p);
  }

  const filteredProducts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return products.filter(product => {
      const matchCat = activeCategory === 'all' || product.category === activeCategory;
      const matchSearch = !q ||
        String(product.name || '').toLowerCase().includes(q) ||
        String(product.article || '').toLowerCase().includes(q) ||
        String(product.external_id || '').toLowerCase().includes(q) ||
        String(product.description || '').toLowerCase().includes(q);
      const matchSize = activeSize === 'all' || (() => {
        const sizes = String(product.sizes || '');
        if (!sizes) return true;
        return sizes.split(',').some(part => {
          const s = part.trim().split(':')[0].trim().toUpperCase();
          const stock = Number((part.trim().split(':')[1] || '1'));
          return s === activeSize && stock > 0;
        });
      })();
      return matchCat && matchSearch && matchSize;
    });
  }, [products, activeCategory, searchText, activeSize]);

  return (
    <>
      <Header />
      <main className="catalog-page">
        <section className="container catalog-head">
          <h1>Каталог</h1>
          <p>Все опубликованные товары TETIM</p>
          <div className="catalog-search">
            <input value={searchText} onChange={e => changeSearch(e.target.value)} placeholder="Поиск по товарам" />
          </div>
        </section>

        <section className="container catalog-layout">
          <aside className="catalog-sidebar">
            <h2>Категории</h2>
            <div className="catalog-category-list">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={activeCategory === cat.value ? 'catalog-category active' : 'catalog-category'}
                  onClick={() => changeCategory(cat.value)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <h2 style={{ marginTop: '24px' }}>Размер</h2>
            <div className="catalog-size-list">
              <button
                type="button"
                className={activeSize === 'all' ? 'catalog-size active' : 'catalog-size'}
                onClick={() => setActiveSize('all')}
              >
                Все
              </button>
              {SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  className={activeSize === size ? 'catalog-size active' : 'catalog-size'}
                  onClick={() => setActiveSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </aside>

          <section className="catalog-products-area">
            <div className="catalog-products-top">
              <div>
                <strong>{activeCategory === 'all' ? 'Все товары' : getCategoryLabel(activeCategory)}</strong>
                <span>Найдено: {filteredProducts.length}</span>
              </div>
              <button type="button" onClick={loadProducts}>Обновить</button>
            </div>

            {loading ? (
              <div className="catalog-state">Загрузка товаров...</div>
            ) : message ? (
              <div className="catalog-state error">{message}</div>
            ) : filteredProducts.length === 0 ? (
              <div className="catalog-state">
                <h2>Товары не найдены</h2>
                <p>Проверьте категорию, поиск или публикацию товара в админке.</p>
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
      <Footer />
    </>
  );
}