import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const API_URL = 'http://localhost:4000/api';

const CATEGORIES = [
  { value: 'all', label: 'Все товары' },
  { value: 'accessories', label: 'Аксессуары' },
  { value: 'sale', label: 'Акционные товары' },
  { value: 'pants-shorts', label: 'Брюки и Шорты' },
  { value: 'headwear', label: 'Головные уборы' },
  { value: 'sweatshirts', label: 'Джемпера, свитшоты, толстовки' },
  { value: 'vests', label: 'Жилеты' },
  { value: 'suits', label: 'Костюмы, комплекты' },
  { value: 'jackets', label: 'Пуховики, куртки, ветровки' },
  { value: 'shirts', label: 'Рубашки' },
  { value: 'tshirts-longsleeves', label: 'Футболки и Лонгсливы' },
  { value: 'bags', label: 'Сумки' },
  { value: 'backpacks', label: 'Рюкзаки' },
  { value: 'caps', label: 'Кепки' },
  { value: 'hats', label: 'Шапки' },
  { value: 'socks', label: 'Носки' },
  { value: 'belts', label: 'Ремни' },
];

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function getCategoryLabel(value) {
  const category = CATEGORIES.find((item) => item.value === value);
  return category ? category.label : value || 'Каталог';
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
    is_published: Number(product.is_published || 0),
  };
}

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category') || 'all';

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

  function changeCategory(category) {
    if (category === 'all') {
      setSearchParams({});
      return;
    }

    setSearchParams({ category });
  }

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== 'all') {
      result = result.filter((product) => {
        return String(product.category || '') === String(selectedCategory);
      });
    }

    if (searchText.trim()) {
      const text = searchText.trim().toLowerCase();

      result = result.filter((product) => {
        return (
          String(product.name || '').toLowerCase().includes(text) ||
          String(product.category || '').toLowerCase().includes(text) ||
          String(product.article || '').toLowerCase().includes(text) ||
          String(product.description || '').toLowerCase().includes(text)
        );
      });
    }

    return result;
  }, [products, selectedCategory, searchText]);

  return (
    <>
      <Header cartCount={cartCount} />

      <main className="container catalog-page">
        <div className="section-title-row">
          <div>
            <h1>Каталог</h1>
            <p>Все опубликованные товары TETIM</p>
          </div>
        </div>

        <div className="catalog-search-row">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Поиск по товарам"
          />
        </div>

        <div className="catalog-filters">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              className={`catalog-filter-btn ${
                selectedCategory === category.value ? 'active' : ''
              }`}
              onClick={() => changeCategory(category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <section className="card-lite">
            <h3>Товаров пока нет</h3>
            <p>
              В этой категории нет опубликованных товаров. Проверьте публикацию
              в админке или выберите “Все товары”.
            </p>
          </section>
        ) : (
          <section className="products-grid">
            {filteredProducts.map((product) => {
              const cartItem = getCartItem(product.id);
              const quantity = Number(cartItem?.quantity || 0);
              const stockLimit = Number(product.stock || 0);
              const isMaxQuantity = quantity >= stockLimit;

              return (
                <article className="product-card" key={product.id}>
                  <Link to={`/product/${product.id}`} className="product-image">
                    <img src={product.image} alt={product.name} />
                  </Link>

                  <div className="product-card-body">
                    <div className="product-card-category">
                      {getCategoryLabel(product.category)}
                    </div>

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

                    <div className="product-card-meta">
                      Остаток: {stockLimit}
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
          </section>
        )}

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