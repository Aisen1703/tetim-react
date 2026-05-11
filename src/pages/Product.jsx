import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const API_URL = 'http://localhost:4000/api';

const CATEGORY_LABELS = {
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

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function normalizeProduct(product) {
  return {
    id: Number(product.id),
    external_id: product.external_id || '',
    article: product.article || '',
    name: product.name || 'Товар',
    category: product.category || '',
    price: Number(product.price || 0),
    sizes: product.sizes || 'One size',
    stock: Number(product.stock || 0),
    image:
      product.image_url ||
      product.image ||
      'https://placehold.co/800x1000?text=TETIM',
    description: product.description || 'Описание товара пока не добавлено.',
  };
}

export default function Product() {
  const { id } = useParams();

  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [stockMessage, setStockMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const cartCount = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  useEffect(() => {
    loadCart();
    loadProducts();
  }, [id]);

  function loadCart() {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }

  function saveCart(nextCart) {
    localStorage.setItem('cart', JSON.stringify(nextCart));
    setCart(nextCart);
  }

  async function loadProducts() {
    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  }

  const product = useMemo(() => {
    return products.find((item) => Number(item.id) === Number(id));
  }, [products, id]);

  const sizeList = useMemo(() => {
    if (!product?.sizes) return ['One size'];

    return String(product.sizes)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [product]);

  const cartItem = useMemo(() => {
    if (!product) return null;

    return cart.find(
      (item) =>
        Number(item.id) === Number(product.id) &&
        String(item.size || '') === String(selectedSize || '')
    );
  }, [cart, product, selectedSize]);

  const cartItemQuantity = Number(cartItem?.quantity || 0);

  useEffect(() => {
    if (sizeList.length > 0) {
      setSelectedSize(sizeList[0]);
    }
  }, [product?.id]);

  function getCategoryLabel(category) {
    return CATEGORY_LABELS[category] || category || 'Каталог';
  }

  function showStockMessage(text) {
    setStockMessage(text);

    setTimeout(() => {
      setStockMessage('');
    }, 2500);
  }

  function addToCart() {
    if (!product) return;

    if (product.stock <= 0) {
      showStockMessage('Товара нет в наличии');
      return;
    }

    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

    const existing = currentCart.find(
      (item) =>
        Number(item.id) === Number(product.id) &&
        String(item.size || '') === String(selectedSize || '')
    );

    const currentQuantity = Number(existing?.quantity || 0);
    const nextQuantity = currentQuantity + quantity;

    if (nextQuantity > product.stock) {
      showStockMessage(
        `Больше нельзя. Остаток на складе: ${product.stock} шт.`
      );
      return;
    }

    if (existing) {
      existing.quantity = nextQuantity;
      existing.stock = product.stock;
    } else {
      currentCart.push({
        id: Number(product.id),
        external_id: product.external_id,
        article: product.article,
        name: product.name,
        price: Number(product.price),
        quantity,
        image: product.image,
        size: selectedSize || '',
        stock: product.stock,
      });
    }

    saveCart(currentCart);
  }

  function increaseCartItem() {
    if (!product) return;

    if (cartItemQuantity >= product.stock) {
      showStockMessage(
        `Больше нельзя. Остаток на складе: ${product.stock} шт.`
      );
      return;
    }

    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

    const nextCart = currentCart.map((item) => {
      const isSameProduct =
        Number(item.id) === Number(product.id) &&
        String(item.size || '') === String(selectedSize || '');

      if (!isSameProduct) return item;

      return {
        ...item,
        quantity: Number(item.quantity || 0) + 1,
        stock: product.stock,
      };
    });

    saveCart(nextCart);
  }

  function decreaseCartItem() {
    if (!product) return;

    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

    const nextCart = currentCart
      .map((item) => {
        const isSameProduct =
          Number(item.id) === Number(product.id) &&
          String(item.size || '') === String(selectedSize || '');

        if (!isSameProduct) return item;

        return {
          ...item,
          quantity: Number(item.quantity || 0) - 1,
        };
      })
      .filter((item) => Number(item.quantity || 0) > 0);

    saveCart(nextCart);
  }

  function decreaseQuantity() {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  function increaseQuantity() {
    if (!product) return;

    setQuantity((prev) => {
      if (prev >= product.stock) {
        showStockMessage(
          `Больше нельзя. Остаток на складе: ${product.stock} шт.`
        );
        return prev;
      }

      return prev + 1;
    });
  }

  return (
    <>
      <Header cartCount={cartCount} />

      <main className="container product-page">
        {loading ? (
          <div className="product-not-found">
            <h2>Загрузка товара...</h2>
          </div>
        ) : !product ? (
          <div className="product-not-found">
            <h2>Товар не найден</h2>
            <p>Возможно, он ещё не опубликован или был удалён.</p>

            <div style={{ marginTop: 20 }}>
              <Link to="/catalog" className="btn btn-dark">
                Вернуться в каталог
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="product-breadcrumbs">
              <Link to="/">Главная</Link>
              <span>/</span>
              <Link to="/catalog">Каталог</Link>
              <span>/</span>
              <Link to={`/catalog?category=${product.category}`}>
                {getCategoryLabel(product.category)}
              </Link>
              <span>/</span>
              <span>{product.name}</span>
            </div>

            <section className="product-detail-layout">
              <div className="product-detail-gallery">
                <div className="product-main-image-wrap">
                  <img
                    className="product-main-image"
                    src={product.image}
                    alt={product.name}
                  />
                </div>
              </div>

              <div className="product-detail-info">
                <div className="product-detail-brand">TETIM</div>

                <h1>{product.name}</h1>

                <div className="product-detail-rating">
                  ★★★★★ <small>в наличии</small>
                </div>

                <div className="product-detail-price">
                  {formatPrice(product.price)}
                </div>

                <div className="product-detail-section">
                  <div className="product-detail-label">Размер</div>

                  <div className="product-size-list">
                    {sizeList.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`product-size-btn ${
                          selectedSize === size ? 'active' : ''
                        }`}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {cartItemQuantity === 0 && (
                  <div className="product-detail-section">
                    <div className="product-detail-label">Количество</div>

                    <div className="cart-stepper product-detail-stepper">
                      <button type="button" onClick={decreaseQuantity}>
                        −
                      </button>

                      <span>{quantity}</span>

                      <button type="button" onClick={increaseQuantity}>
                        +
                      </button>
                    </div>
                  </div>
                )}

                {cartItemQuantity > 0 ? (
                  <div className="product-cart-added-row">
                    <Link to="/cart" className="product-go-cart-btn">
                      Перейти в корзину
                    </Link>

                    <div className="product-added-stepper">
                      <button type="button" onClick={decreaseCartItem}>
                        −
                      </button>

                      <span>{cartItemQuantity}</span>

                      <button type="button" onClick={increaseCartItem}>
                        +
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="product-detail-cart-btn"
                    onClick={addToCart}
                  >
                    Добавить в корзину
                  </button>
                )}

                {stockMessage && (
                  <div className="product-stock-message">{stockMessage}</div>
                )}

                <div
                  className="product-detail-delivery"
                  style={{ marginTop: 18 }}
                >
                  <strong>Доставка и самовывоз</strong>
                  <p>
                    Доставка по Якутску и самовывоз по адресу: ул. Дежнева, д.
                    30
                  </p>
                </div>

                <div className="product-stock-box" style={{ marginTop: 14 }}>
                  <strong>Остаток:</strong> {product.stock} шт.
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
                    <strong>{getCategoryLabel(product.category)}</strong>
                  </div>

                  <div>
                    <span>Размеры</span>
                    <strong>{product.sizes || 'One size'}</strong>
                  </div>

                  <div>
                    <span>Бренд</span>
                    <strong>TETIM</strong>
                  </div>

                  <div>
                    <span>Артикул</span>
                    <strong>{product.article || '—'}</strong>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}