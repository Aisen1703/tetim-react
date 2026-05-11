import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import HeroSlider from '../components/HeroSlider.jsx';
import useSiteSettings from '../hooks/useSiteSettings.js';

const API_URL = 'http://localhost:4000/api';

const POPULAR_CATEGORIES = [
  { title: 'Спортивные костюмы', category: 'suits' },
  { title: 'Футболки', category: 'tshirts-longsleeves' },
  { title: 'Худи', category: 'sweatshirts' },
  { title: 'Пуховики, куртки, ветровки', category: 'jackets' },
  { title: 'Рубашки', category: 'shirts' },
  { title: 'Лонгсливы', category: 'tshirts-longsleeves' },
  { title: 'Сумки', category: 'bags' },
  { title: 'Рюкзаки', category: 'backpacks' },
  { title: 'Кепки', category: 'caps' },
  { title: 'Шапки', category: 'hats' },
  { title: 'Носки', category: 'socks' },
  { title: 'Аксессуары', category: 'accessories' },
];

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function normalizeProduct(product) {
  return {
    id: Number(product.id),
    external_id: product.external_id || '',
    article: product.article || '',
    name: product.name || 'Товар',
    category: product.category || 'catalog',
    price: Number(product.price || 0),
    sizes: product.sizes || '',
    stock: Number(product.stock || 0),
    image:
      product.image_url ||
      product.image ||
      'https://placehold.co/600x720?text=TETIM',
    description: product.description || '',
  };
}

export default function Home() {
  const settings = useSiteSettings();

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);

  const cartCount = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  useEffect(() => {
    loadProducts();
    loadCart();
  }, []);

  async function loadProducts() {
    try {
      const response = await fetch(`${API_URL}/public/products`);
      const data = await response.json();

      if (response.ok) {
        setProducts((data.products || []).map(normalizeProduct));
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    }
  }

  function loadCart() {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }

  function saveCart(nextCart) {
    localStorage.setItem('cart', JSON.stringify(nextCart));
    setCart(nextCart);
  }

  function showToast(message, type = 'info') {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  }

  function getCartItem(productId) {
    return cart.find((item) => Number(item.id) === Number(productId));
  }

  function addToCart(product) {
    const stockLimit = Number(product.stock || 0);

    if (stockLimit <= 0) {
      showToast('Товара нет в наличии', 'warning');
      return;
    }

    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

    const existing = currentCart.find(
      (item) => Number(item.id) === Number(product.id)
    );

    if (existing) {
      const currentQuantity = Number(existing.quantity || 0);

      if (currentQuantity >= stockLimit) {
        showToast(`Нельзя добавить больше ${stockLimit} шт.`, 'warning');
        return;
      }

      existing.quantity = currentQuantity + 1;
      existing.stock = stockLimit;

      showToast('Количество обновлено', 'success');
    } else {
      currentCart.push({
        id: Number(product.id),
        external_id: product.external_id,
        article: product.article,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        image: product.image,
        size: product.sizes || '',
        stock: stockLimit,
      });

      showToast('Товар добавлен в корзину', 'success');
    }

    saveCart(currentCart);
  }

  function decreaseQuantity(productId) {
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

    const nextCart = currentCart
      .map((item) => {
        if (Number(item.id) !== Number(productId)) {
          return item;
        }

        return {
          ...item,
          quantity: Number(item.quantity || 0) - 1,
        };
      })
      .filter((item) => Number(item.quantity || 0) > 0);

    saveCart(nextCart);
  }

  return (
    <>
      <Header cartCount={cartCount} />

      <main>
        <section className="container hero-section">
          <HeroSlider />

          <div className="hero-content-card">
            {settings.hero_badge && (
              <span className="pill">{settings.hero_badge}</span>
            )}

            <h1>{settings.hero_title}</h1>

            <p>{settings.hero_text}</p>

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

          {products.length === 0 ? (
            <div className="card-lite">
              <h3>Товаров пока нет</h3>
              <p>Опубликуйте товары в админ-панели.</p>
            </div>
          ) : (
            <div className="products-grid">
              {products.slice(0, 8).map((product) => {
                const cartItem = getCartItem(product.id);
                const quantity = Number(cartItem?.quantity || 0);
                const stockLimit = Number(product.stock || 0);
                const isMaxQuantity = quantity >= stockLimit;

                return (
                  <article className="product-card" key={product.id}>
                    <Link
                      to={`/product/${product.id}`}
                      className="product-image"
                    >
                      <img src={product.image} alt={product.name} />
                    </Link>

                    <div className="product-card-body">
                      <Link
                        to={`/product/${product.id}`}
                        className="product-title"
                      >
                        {product.name}
                      </Link>

                      <div className="product-card-meta">
                        {product.sizes
                          ? `Размеры: ${product.sizes}`
                          : 'Размеры уточняйте'}
                      </div>

                      <div className="product-card-bottom">
                        <strong>{formatPrice(product.price)}</strong>

                        {stockLimit <= 0 ? (
                          <button
                            className="btn btn-dark"
                            type="button"
                            disabled
                          >
                            Нет в наличии
                          </button>
                        ) : quantity > 0 ? (
                          <div className="quantity-control">
                            <button
                              type="button"
                              aria-label="Уменьшить количество"
                              onClick={() => decreaseQuantity(product.id)}
                            >
                              −
                            </button>

                            <span>{quantity}</span>

                            <button
                              type="button"
                              aria-label="Увеличить количество"
                              disabled={isMaxQuantity}
                              onClick={() => addToCart(product)}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-dark"
                            type="button"
                            onClick={() => addToCart(product)}
                          >
                            В корзину
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {toast && (
          <div className={`toast-message toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}