import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import HeroSlider from '../components/HeroSlider.jsx';
import ProductCard from '../components/ProductCard.jsx';
import useSiteSettings from '../hooks/useSiteSettings.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const POPULAR_CATEGORIES = [
  { title: 'Спортивные костюмы', category: 'suits' },
  { title: 'Футболки', category: 'tshirts-longsleeves' },
  { title: 'Худи', category: 'sweatshirts' },
  { title: 'Пуховики, куртки, ветровки', category: 'jackets' },
  { title: 'Рубашки', category: 'shirts' },
  { title: 'Лонгсливы', category: 'tshirts-longsleeves' },
  { title: 'Аксессуары', category: 'accessories' },
];

const categoryLabels = {
  accessories: 'Аксессуары',
  sale: 'Акционные товары',
  'pants-shorts': 'Брюки и Шорты',
  headwear: 'Головные уборы',
  sweatshirts: 'Джемпера, свитшоты, толстовки',
  vests: 'Жилеты',
  suits: 'Костюмы, комплекты',
  jackets: 'Пуховики, куртки, ветровки',
  shirts: 'Рубашки',
  'tshirts-longsleeves': 'Футболки и Лонгсливы',
  bags: 'Сумки',
  backpacks: 'Рюкзаки',
  caps: 'Кепки',
  hats: 'Шапки',
  socks: 'Носки',
  belts: 'Ремни',
};

function getCategoryLabel(category) {
  return categoryLabels[category] || category || 'Категория';
}

function normalizeProduct(product) {
  return {
    ...product,
    id: Number(product.id),
    product_id: Number(product.id),
    external_id: product.external_id || '',
    article: product.article || '',
    name: product.name || 'Товар',
    category: product.category || 'accessories',
    category_label: getCategoryLabel(product.category),
    price: Number(product.price || 0),
    sizes: product.sizes || '',
    stock: Number(product.stock || 0),
    image_url:
      product.image_url ||
      product.image ||
      'https://placehold.co/600x720?text=TETIM',
    description: product.description || '',
  };
}

export default function Home() {
  const settings = useSiteSettings();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsMessage, setProductsMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoadingProducts(true);
    setProductsMessage('');

    try {
      const response = await fetch(`${API_URL}/public/products`);
      const data = await response.json();

      if (!response.ok) {
        setProducts([]);
        setProductsMessage(data.message || 'Не удалось загрузить товары');
        return;
      }

      setProducts((data.products || []).map(normalizeProduct));
    } catch {
      setProducts([]);
      setProductsMessage('Backend не отвечает. Проверьте server.js');
    } finally {
      setLoadingProducts(false);
    }
  }

  const hitProducts = products.slice(0, 8);

  return (
    <>
      <Header />

      <main>
        <section className="container hero-section">
          <HeroSlider />

          <div className="hero-content-card">
            {settings.hero_badge && (
              <span className="pill">{settings.hero_badge}</span>
            )}

            <h1>{settings.hero_title || 'Одежда с характером Севера'}</h1>

            <p>
              {settings.hero_text ||
                'Создаём одежду для города, спорта и активной жизни — с вниманием к деталям, комфорту и северному характеру.'}
            </p>

            <div className="hero-actions">
              <Link to="/catalog" className="btn btn-dark">
                {settings.hero_button_primary || 'Каталог'}
              </Link>

              <Link to="/custom-order" className="btn btn-light">
                {settings.hero_button_secondary || 'Индивидуальный заказ'}
              </Link>
            </div>
          </div>
        </section>

        <section className="container">
          <h2 className="section-title">Популярные категории</h2>

          <div className="popular-categories-grid">
            {POPULAR_CATEGORIES.map((item) => (
              <Link
                key={`${item.category}-${item.title}`}
                to={`/catalog?category=${item.category}`}
                className="popular-category-card"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>

        <section className="container home-products-section">
          <div className="section-title-row">
            <h2>Хиты продаж</h2>

            <Link to="/catalog" className="link-accent">
              Смотреть все
            </Link>
          </div>

          {loadingProducts ? (
            <div className="card-lite">
              <h3>Загрузка товаров...</h3>
              <p>Подождите немного.</p>
            </div>
          ) : productsMessage ? (
            <div className="card-lite">
              <h3>Ошибка загрузки</h3>
              <p>{productsMessage}</p>
            </div>
          ) : hitProducts.length === 0 ? (
            <div className="card-lite">
              <h3>Товаров пока нет</h3>
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