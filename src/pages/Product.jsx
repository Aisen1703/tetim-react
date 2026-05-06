import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { getProducts } from '../api/productsStorage.js';

const API_URL = 'http://localhost:4000/api';

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function normalizeProduct(product) {
  return {
    id: Number(product.id),
    name: product.name || 'Товар',
    category: product.categoryTitle || product.category || 'Каталог',
    price: Number(product.price || 0),
    sizes: product.sizes || product.size || 'One size',
    image:
      product.image_url ||
      product.image ||
      'https://placehold.co/600x720?text=No+Image',
    description: product.description || 'Описание товара скоро появится.',
  };
}

export default function Product() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [activeSize, setActiveSize] = useState('');
  const [cartVersion, setCartVersion] = useState(0);

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartCount = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const quantity = cart.find(
    item => Number(item.id) === Number(id)
  )?.quantity || 0;

  const sizes = useMemo(() => {
    return String(product?.sizes || 'One size')
      .split(',')
      .map(size => size.trim())
      .filter(Boolean);
  }, [product]);

  useEffect(() => {
    loadProduct();
  }, [id]);

  useEffect(() => {
    if (product?.name) {
      document.title = `${product.name} — TETIM`;
    }
  }, [product]);

  async function loadProduct() {
    try {
      const response = await fetch(`${API_URL}/public/products`);
      const data = await response.json();

      if (response.ok && data.products) {
        const apiProducts = data.products.map(normalizeProduct);
        const found = apiProducts.find(item => Number(item.id) === Number(id));

        if (found) {
          setProduct(found);
          setActiveSize(String(found.sizes || 'One size').split(',')[0].trim());
          setIsNotFound(false);
          return;
        }
      }
    } catch {
      // Если backend не запущен, берём товары из localStorage
    }

    const localProducts = getProducts().map(normalizeProduct);
    const foundLocal = localProducts.find(
      item => Number(item.id) === Number(id)
    );

    if (!foundLocal) {
      setIsNotFound(true);
      return;
    }

    setProduct(foundLocal);
    setActiveSize(String(foundLocal.sizes || 'One size').split(',')[0].trim());
    setIsNotFound(false);
  }

  function saveCart(nextCart) {
    localStorage.setItem('cart', JSON.stringify(nextCart));
    setCartVersion(prev => prev + 1);
  }

  function addToCart() {
    if (!product) return;

    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

    const existing = currentCart.find(
      item => Number(item.id) === Number(product.id)
    );

    if (existing) {
      existing.quantity = Number(existing.quantity) + 1;
    } else {
currentCart.push({
  id: Number(product.id),
  name: product.name,
  price: Number(product.price),
  quantity: 1,
  image: product.image,
  size: activeSize,
});
    }

    saveCart(currentCart);
  }

  function decreaseCartItem() {
    if (!product) return;

    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

    const existing = currentCart.find(
      item => Number(item.id) === Number(product.id)
    );

    if (!existing) return;

    existing.quantity = Number(existing.quantity) - 1;

    const nextCart = currentCart.filter(
      item => Number(item.quantity) > 0
    );

    saveCart(nextCart);
  }

  if (isNotFound) {
    return (
      <>
        <Header cartCount={cartCount} />

        <main className="container product-page">
          <div className="product-not-found">
            <h1>Товар не найден</h1>
            <p>Возможно, товар был удалён или ссылка указана неверно.</p>
            <Link to="/catalog" className="btn btn-dark">
              Вернуться в каталог
            </Link>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header cartCount={cartCount} />

        <main className="container product-page">
          <div className="card-lite">
            <p>Загрузка товара...</p>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Header cartCount={cartCount} />

      <main className="container product-page">
        <div className="product-breadcrumbs">
          <Link to="/">Главная</Link>
          <span>›</span>
          <Link to="/catalog">Каталог</Link>
          <span>›</span>
          <span>{product.name}</span>
        </div>

        <section className="product-detail-layout">
          <div className="product-detail-gallery">
            <div className="product-main-image-wrap">
              <img
                src={product.image}
                alt={product.name}
                className="product-main-image"
              />
            </div>
          </div>

          <div className="product-detail-info">
            <div className="product-detail-brand">TETIM</div>

            <h1>{product.name}</h1>

            <div className="product-detail-rating">
              <span>★★★★★</span>
              <small>4.8 · 24 отзыва</small>
            </div>

            <div className="product-detail-price">
              {formatPrice(product.price)}
            </div>

            <div className="product-detail-section">
              <div className="product-detail-label">Размеры</div>

              <div className="product-size-list">
                {sizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    className={`product-size-btn ${
                      activeSize === size ? 'active' : ''
                    }`}
                    onClick={() => setActiveSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="product-detail-section">
              <div className="product-detail-label">Количество</div>

              {quantity > 0 ? (
                <div className="cart-stepper product-detail-stepper">
                  <button type="button" onClick={decreaseCartItem}>
                    −
                  </button>
                  <span>{quantity} шт.</span>
                  <button type="button" onClick={addToCart}>
                    +
                  </button>
                </div>
              ) : (
                <button
                  className="product-detail-cart-btn"
                  type="button"
                  onClick={addToCart}
                >
                  В корзину
                </button>
              )}
            </div>

            <div className="product-detail-delivery">
              <strong>Доставка по Якутску</strong>
              <p>
                Можно оформить заказ онлайн или связаться с магазином для
                уточнения наличия.
              </p>
            </div>
          </div>
        </section>

        <section className="product-detail-bottom">
          <div className="product-accordion-row">
            <h2>Описание</h2>
            <p>{product.description}</p>
          </div>

          <div className="product-accordion-row">
            <h2>Характеристики</h2>

            <div className="product-characteristics">
              <div>
                <span>Категория</span>
                <strong>{product.category}</strong>
              </div>

              <div>
                <span>Размеры</span>
                <strong>{product.sizes}</strong>
              </div>

              <div>
                <span>Бренд</span>
                <strong>TETIM</strong>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}