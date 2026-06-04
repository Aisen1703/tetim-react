import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ALLOWED_SIZES = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'];

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

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category || 'Каталог';
}

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
}

const PLACEHOLDER = 'https://placehold.co/800x1000?text=TETIM';

function normalizeProduct(product) {
  // Собираем все фото: image_url + images (доп. фото через запятую), макс 5
  const mainUrl = getImageUrl(product.image_url || product.image || '');
  const extraUrls = String(product.images || '')
    .split(',')
    .map((u) => getImageUrl(u.trim()))
    .filter(Boolean);

  const allImages = mainUrl
    ? [mainUrl, ...extraUrls].slice(0, 5)
    : extraUrls.slice(0, 5);

  return {
    id: Number(product.id),
    external_id: product.external_id || '',
    article: product.article || '',
    name: product.name || 'Товар',
    category: product.category || '',
    price: Number(product.price || 0),
    sizes: product.sizes || '',
    stock: Number(product.stock || 0),
    image: allImages[0] || PLACEHOLDER,
    images: allImages.length > 0 ? allImages : [PLACEHOLDER],
    description: product.description || 'Описание товара пока не добавлено.',
  };
}

// ─── Парсим строку размеров "XS:2, S:3, M:4" → массив { size, stock }
// Только доступные (stock > 0)
function parseSizes(sizesStr, totalStock) {
  if (!sizesStr) return [];

  const parts = String(sizesStr).split(',').map((s) => s.trim()).filter(Boolean);
  const result = [];

  for (const part of parts) {
    if (part.includes(':')) {
      const [rawSize, rawStock] = part.split(':').map((s) => s.trim());
      const size = rawSize.toUpperCase();
      const stock = Math.max(0, Number(rawStock || 0));
      if (ALLOWED_SIZES.includes(size)) {
        result.push({ size, stock });
      }
    } else {
      const size = part.toUpperCase();
      if (ALLOWED_SIZES.includes(size)) {
        result.push({ size, stock: totalStock });
      }
    }
  }

  // Сортируем по ALLOWED_SIZES порядку
  return ALLOWED_SIZES
    .map((size) => result.find((item) => item.size === size))
    .filter(Boolean);
}

export default function Product() {
  const { id } = useParams();

  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tetim_cart') || '[]'); } catch { return []; }
  });
  const [products, setProducts] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [stockMessage, setStockMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, [id]);

  // Синхронизируем корзину при изменениях
  useEffect(() => {
    function syncCart() {
      try {
        setCart(JSON.parse(localStorage.getItem('tetim_cart') || '[]'));
      } catch { setCart([]); }
    }
    window.addEventListener('tetim-cart-updated', syncCart);
    window.addEventListener('storage', syncCart);
    return () => {
      window.removeEventListener('tetim-cart-updated', syncCart);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  function saveCart(nextCart) {
    localStorage.setItem('tetim_cart', JSON.stringify(nextCart));
    setCart(nextCart);
    window.dispatchEvent(new CustomEvent('tetim-cart-updated', { detail: { items: nextCart } }));
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/public/products`);
      const data = await response.json();
      if (response.ok) setProducts((data.products || []).map(normalizeProduct));
      else setProducts([]);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const product = useMemo(() => {
    return products.find((item) => Number(item.id) === Number(id));
  }, [products, id]);

  // ─── Парсим размеры с остатками
  const sizeItems = useMemo(() => {
    if (!product) return [];
    return parseSizes(product.sizes, product.stock);
  }, [product]);

  // ─── Выбранный размер — первый доступный
  useEffect(() => {
    if (sizeItems.length > 0) {
      const firstAvailable = sizeItems.find((s) => s.stock > 0);
      setSelectedSize(firstAvailable?.size || sizeItems[0]?.size || '');
      setQuantity(1);
    }
    setSelectedImage(0);
  }, [product?.id]);

  // ─── Остаток для выбранного размера
  const selectedSizeStock = useMemo(() => {
    if (!selectedSize) return product?.stock || 0;
    const found = sizeItems.find((s) => s.size === selectedSize);
    return found ? found.stock : 0;
  }, [sizeItems, selectedSize, product]);

  // ─── Товар в корзине для выбранного размера
  const cartItem = useMemo(() => {
    if (!product) return null;
    return cart.find(
      (item) =>
        String(item.id || item.product_id) === String(product.id) &&
        String(item.size || '') === String(selectedSize || '')
    );
  }, [cart, product, selectedSize]);

  const cartItemQuantity = Number(cartItem?.quantity || 0);

  function showStockMessage(text) {
    setStockMessage(text);
    setTimeout(() => setStockMessage(''), 2500);
  }

  function handleSizeSelect(size) {
    setSelectedSize(size);
    setQuantity(1);
  }

  function decreaseQuantity() {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  function increaseQuantity() {
    if (!product) return;
    // ─── Ограничение по остатку выбранного размера
    if (quantity >= selectedSizeStock) {
      showStockMessage(`Максимум ${selectedSizeStock} шт. для размера ${selectedSize}`);
      return;
    }
    setQuantity((prev) => prev + 1);
  }

  function addToCart() {
    if (!product) return;

    if (selectedSizeStock <= 0) {
      showStockMessage('Этого размера нет в наличии');
      return;
    }

    const currentCart = JSON.parse(localStorage.getItem('tetim_cart') || '[]');
    const existing = currentCart.find(
      (item) =>
        String(item.id || item.product_id) === String(product.id) &&
        String(item.size || '') === String(selectedSize || '')
    );

    const currentQuantity = Number(existing?.quantity || 0);
    const nextQuantity = currentQuantity + quantity;

    // ─── Жёсткое ограничение по остатку размера
    if (nextQuantity > selectedSizeStock) {
      showStockMessage(`Максимум ${selectedSizeStock} шт. для размера ${selectedSize}`);
      return;
    }

    if (existing) {
      existing.quantity = nextQuantity;
      existing.size_stock = selectedSizeStock;
    } else {
      currentCart.push({
        id: Number(product.id),
        product_id: Number(product.id),
        external_id: product.external_id,
        article: product.article,
        name: product.name,
        price: Number(product.price),
        quantity,
        image_url: product.image,
        size: selectedSize || '',
        size_stock: selectedSizeStock,
        max_stock: selectedSizeStock,
      });
    }

    saveCart(currentCart);
  }

  function increaseCartItem() {
    if (!product) return;

    // ─── Ограничение по остатку размера
    if (cartItemQuantity >= selectedSizeStock) {
      showStockMessage(`Максимум ${selectedSizeStock} шт. для размера ${selectedSize}`);
      return;
    }

    const currentCart = JSON.parse(localStorage.getItem('tetim_cart') || '[]');
    const nextCart = currentCart.map((item) => {
      const isSame =
        String(item.id || item.product_id) === String(product.id) &&
        String(item.size || '') === String(selectedSize || '');
      if (!isSame) return item;
      return { ...item, quantity: Number(item.quantity || 0) + 1 };
    });
    saveCart(nextCart);
  }

  function decreaseCartItem() {
    if (!product) return;

    const currentCart = JSON.parse(localStorage.getItem('tetim_cart') || '[]');
    const nextCart = currentCart
      .map((item) => {
        const isSame =
          String(item.id || item.product_id) === String(product.id) &&
          String(item.size || '') === String(selectedSize || '');
        if (!isSame) return item;
        return { ...item, quantity: Number(item.quantity || 0) - 1 };
      })
      .filter((item) => Number(item.quantity || 0) > 0);
    saveCart(nextCart);
  }

  return (
    <>
      <Header />

      <main className="container product-page">
        {loading ? (
          <div className="product-not-found"><h2>Загрузка товара...</h2></div>
        ) : !product ? (
          <div className="product-not-found">
            <h2>Товар не найден</h2>
            <p>Возможно, он ещё не опубликован или был удалён.</p>
            <div style={{ marginTop: 20 }}>
              <Link to="/catalog" className="btn btn-dark">Вернуться в каталог</Link>
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
                    src={product.images[selectedImage] || product.image}
                    alt={product.name}
                  />
                </div>

                {product.images.length > 1 && (
                  <div className="product-gallery-thumbs">
                    {product.images.map((img, i) => (
                      <div
                        key={i}
                        className={`product-gallery-thumb${selectedImage === i ? ' active' : ''}`}
                        onClick={() => setSelectedImage(i)}
                      >
                        <img src={img} alt={`${product.name} ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="product-detail-info">
                <div className="product-detail-brand">TETIM</div>
                <h1>{product.name}</h1>

                <div className="product-detail-rating">
                  ★★★★★ <small>в наличии</small>
                </div>

                <div className="product-detail-price">{formatPrice(product.price)}</div>

                {/* ─── Размеры — только доступные, без цифр */}
                {sizeItems.length > 0 && (
                  <div className="product-detail-section">
                    <div className="product-detail-label">Размер</div>
                    <div className="product-size-list">
                      {sizeItems.map(({ size, stock }) => (
                        <button
                          key={size}
                          type="button"
                          className={`product-size-btn${selectedSize === size ? ' active' : ''}${stock <= 0 ? ' disabled' : ''}`}
                          disabled={stock <= 0}
                          title={stock > 0 ? `Остаток: ${stock} шт.` : 'Нет в наличии'}
                          onClick={() => stock > 0 && handleSizeSelect(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {selectedSize && (
                      <small className="product-size-stock-hint">
                        Остаток размера {selectedSize}: {selectedSizeStock} шт.
                      </small>
                    )}
                  </div>
                )}

                {/* ─── Количество (только если ещё не в корзине) */}
                {cartItemQuantity === 0 && selectedSizeStock > 0 && (
                  <div className="product-detail-section">
                    <div className="product-detail-label">Количество</div>
                    <div className="cart-stepper product-detail-stepper">
                      <button type="button" onClick={decreaseQuantity}>−</button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        onClick={increaseQuantity}
                        disabled={quantity >= selectedSizeStock}
                        title={quantity >= selectedSizeStock ? `Максимум ${selectedSizeStock} шт.` : ''}
                      >
                        +
                      </button>
                    </div>
                    {quantity >= selectedSizeStock && (
                      <small className="product-stock-limit-hint">
                        Максимум {selectedSizeStock} шт. для размера {selectedSize}
                      </small>
                    )}
                  </div>
                )}

                {/* ─── Кнопка добавления — всегда видна */}
                {selectedSizeStock <= 0 ? (
                  <button type="button" className="product-detail-cart-btn" disabled>
                    Нет в наличии
                  </button>
                ) : (
                  <button
                    type="button"
                    className="product-detail-cart-btn"
                    onClick={addToCart}
                    disabled={quantity > selectedSizeStock}
                  >
                    Добавить в корзину
                  </button>
                )}

                {/* ─── Ссылка на корзину если товар уже добавлен */}
                {cartItemQuantity > 0 && (
                  <Link to="/cart" className="product-go-cart-link">
                    В корзине {cartItemQuantity} шт. — Перейти в корзину →
                  </Link>
                )}

                {stockMessage && (
                  <div className="product-stock-message">{stockMessage}</div>
                )}

                <div className="product-detail-delivery" style={{ marginTop: 18 }}>
                  <strong>Доставка и самовывоз</strong>
                  <p>Доставка по Якутску и самовывоз по адресу: ул. Дежнева, д. 30</p>
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
                  <div><span>Категория</span><strong>{getCategoryLabel(product.category)}</strong></div>
                  <div><span>Размеры</span><strong>{product.sizes || 'One size'}</strong></div>
                  <div><span>Бренд</span><strong>TETIM</strong></div>
                  <div><span>Артикул</span><strong>{product.article || '—'}</strong></div>
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