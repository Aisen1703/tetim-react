import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import HeroSlider from '../components/HeroSlider.jsx';
import ProductCard from '../components/ProductCard.jsx';
import useSiteSettings from '../hooks/useSiteSettings.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const POPULAR_CATEGORIES = [
  { title: 'Спортивные костюмы', category: 'suits' },
  { title: 'Футболки', category: 'tshirts-longsleeves' },
  { title: 'Худи', category: 'sweatshirts' },
  { title: 'Пуховики, куртки, ветровки', category: 'jackets' },
  { title: 'Рубашки', category: 'shirts' },
  { title: 'Лонгсливы', category: 'tshirts-longsleeves' },
  { title: 'Аксессуары', category: 'accessories' },
];

function normalizeProduct(product) {
  return {
    ...product,
    id: Number(product.id),
    product_id: Number(product.id),
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    image_url: product.image_url || product.image || '',
  };
}

export default function Home() {
  const settings = useSiteSettings();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/public/products`);
      const data = await response.json();
      if (response.ok) {
        setProducts((data.products || []).map(normalizeProduct));
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const hitProducts = products
    .filter(p => Number(p.is_published) === 1 && Number(p.stock || 0) > 0)
    .slice(0, 4);

  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <div className="home-hero">
          <div className="home-hero-visual">
            <HeroSlider />
          </div>
          <div className="home-hero-copy">
            {settings.hero_badge && (
              <span className="home-badge">{settings.hero_badge}</span>
            )}
            <h1 className="home-hero-title">
              {settings.hero_title || 'Одежда с характером Севера'}
            </h1>
            <p className="home-hero-text">
              {settings.hero_text || 'Создаём одежду для города, спорта и активной жизни — с вниманием к деталям, комфорту и северному характеру.'}
            </p>
            <div className="home-hero-actions">
              <Link to="/catalog" className="btn-pill">
                {settings.hero_button_primary || 'Смотреть каталог'}
              </Link>
              <Link to="/custom-order" className="btn-pill btn-pill-ghost">
                {settings.hero_button_secondary || 'Индивидуальный заказ'}
              </Link>
            </div>
          </div>
        </div>

        {/* Популярные категории */}
        <section className="container home-section">
          <h2 className="section-title">Популярные категории</h2>
          <div className="cat-grid">
            {POPULAR_CATEGORIES.map((item) => (
              <Link
                key={`${item.category}-${item.title}`}
                to={`/catalog?category=${item.category}`}
                className="cat-chip"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>

        {/* Хиты продаж */}
        <section className="container home-section">
          <div className="section-title-row">
            <h2 className="section-title">Хиты продаж</h2>
            <Link to="/catalog" className="link-accent">Смотреть все →</Link>
          </div>

          {loading ? (
            <div className="home-products-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="home-skeleton-card">
                  <div className="home-skeleton-img" />
                  <div className="home-skeleton-line" />
                  <div className="home-skeleton-line home-skeleton-line--short" />
                </div>
              ))}
            </div>
          ) : hitProducts.length === 0 ? (
            <div className="home-empty-state">
              <div className="home-empty-icon">!</div>
              <h3>Товары скоро появятся</h3>
              <p>Опубликуйте товары в админ-панели.</p>
            </div>
          ) : (
            <div className="products-grid home-products-grid">
              {hitProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}