import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import ProductCard from '../components/ProductCard.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const categories = [
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

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getCategoryLabel(categoryValue) {
  return (
    categories.find((category) => category.value === categoryValue)?.label ||
    categoryValue ||
    'Категория'
  );
}

function normalizeProduct(product) {
  return {
    ...product,
    category_label: getCategoryLabel(product.category),
  };
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryFromUrl = searchParams.get('category') || 'all';
  const searchFromUrl = searchParams.get('q') || '';

  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(categoryFromUrl);
  const [searchText, setSearchText] = useState(searchFromUrl);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setActiveCategory(categoryFromUrl);
    setSearchText(searchFromUrl);
  }, [categoryFromUrl, searchFromUrl]);

  async function loadProducts() {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/public/products`);
      const data = await safeJson(response);

      if (!response.ok) {
        setMessage(data.message || 'Не удалось загрузить товары');
        setProducts([]);
        return;
      }

      const normalizedProducts = (data.products || []).map(normalizeProduct);

      setProducts(normalizedProducts);
    } catch {
      setMessage('Backend не отвечает. Проверьте server.js');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  function changeCategory(categoryValue) {
    setActiveCategory(categoryValue);

    const nextParams = {};

    if (categoryValue !== 'all') {
      nextParams.category = categoryValue;
    }

    if (searchText.trim()) {
      nextParams.q = searchText.trim();
    }

    setSearchParams(nextParams);
  }

  function changeSearch(value) {
    setSearchText(value);

    const nextParams = {};

    if (activeCategory !== 'all') {
      nextParams.category = activeCategory;
    }

    if (value.trim()) {
      nextParams.q = value.trim();
    }

    setSearchParams(nextParams);
  }

  const filteredProducts = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'all' || product.category === activeCategory;

      const matchesSearch =
        !search ||
        String(product.name || '').toLowerCase().includes(search) ||
        String(product.article || '').toLowerCase().includes(search) ||
        String(product.external_id || '').toLowerCase().includes(search) ||
        String(product.category_label || '').toLowerCase().includes(search) ||
        String(product.description || '').toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchText]);

  return (
    <>
      <Header />

      <main className="catalog-page">
        <section className="container catalog-head">
          <h1>Каталог</h1>
          <p>Все опубликованные товары TETIM</p>

          <div className="catalog-search">
            <input
              value={searchText}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Поиск по товарам"
            />
          </div>
        </section>

        <section className="container catalog-layout">
          <aside className="catalog-sidebar">
            <h2>Категории</h2>

            <div className="catalog-category-list">
              {categories.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className={
                    activeCategory === category.value
                      ? 'catalog-category active'
                      : 'catalog-category'
                  }
                  onClick={() => changeCategory(category.value)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="catalog-products-area">
            <div className="catalog-products-top">
              <div>
                <strong>
                  {activeCategory === 'all'
                    ? 'Все товары'
                    : getCategoryLabel(activeCategory)}
                </strong>

                <span>
                  Найдено: {filteredProducts.length}
                </span>
              </div>

              <button type="button" onClick={loadProducts}>
                Обновить
              </button>
            </div>

            {loading ? (
              <div className="catalog-state">
                Загрузка товаров...
              </div>
            ) : message ? (
              <div className="catalog-state error">
                {message}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="catalog-state">
                <h2>Товары не найдены</h2>
                <p>
                  Проверьте категорию, поиск или публикацию товара в админке.
                </p>
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map((product) => (
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