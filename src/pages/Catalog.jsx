import { useMemo, useState } from 'react';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { categories } from '../data/categories.js';
import { getProducts } from '../api/productsStorage.js';

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

export default function Catalog() {
  const [currentCategory, setCurrentCategory] = useState('accessories');
  const [search, setSearch] = useState('');
  const [productsVersion, setProductsVersion] = useState(0);

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const currentCategoryData =
    categories.find(category => category.key === currentCategory) || categories[0];

  const allProducts = useMemo(() => {
    return getProducts();
  }, [productsVersion]);

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (query) {
      return allProducts.filter(product => {
        const name = String(product.name || '').toLowerCase();
        const description = String(product.description || '').toLowerCase();
        const category = String(product.categoryTitle || '').toLowerCase();
        const subcategory = String(product.subcategory || '').toLowerCase();

        return (
          name.includes(query) ||
          description.includes(query) ||
          category.includes(query) ||
          subcategory.includes(query)
        );
      });
    }

    return allProducts.filter(product => product.category === currentCategory);
  }, [search, currentCategory, allProducts]);

  function addToCart(product) {
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
  image: product.image || product.image_url,
  size: product.sizes || '',
});
    }

    localStorage.setItem('cart', JSON.stringify(currentCart));
    setProductsVersion(prev => prev + 1);
  }

  return (
    <>
      <Header
        cartCount={cartCount}
        search={search}
        onSearchChange={setSearch}
      />

      <main className="container catalog-page">
        <div className="catalog-tree-layout">
          <aside className="catalog-tree-sidebar">
            {categories.map(category => (
              <button
                key={category.key}
                className={`tree-category ${
                  currentCategory === category.key && !search ? 'active' : ''
                }`}
                type="button"
                onClick={() => {
                  setCurrentCategory(category.key);
                  setSearch('');
                }}
              >
                <span className="tree-plus">⊕</span>
                <span className="tree-folder">📁</span>
                <span>{category.title}</span>
              </button>
            ))}
          </aside>

          <section className="catalog-tree-content">
            <div className="catalog-tree-head">
              <div>
                <h1>{search ? 'Поиск' : currentCategoryData.title}</h1>
                <p>
                  {search
                    ? `Результаты по запросу: ${search}`
                    : 'Подкатегории и товары'}
                </p>
              </div>
            </div>

            {!search && (
              <div className="subcategory-list-grid">
                {currentCategoryData.subcategories.map(item => (
                  <div className="subcategory-mini-card" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            )}

            <div className="products-grid">
              {products.length === 0 ? (
                <div className="empty-box">
                  В этой категории пока нет товаров. Добавь товар в аккаунте администратора.
                </div>
              ) : (
                products.map(product => (
                  <article className="product-card" key={product.id}>
                    <a href={`/product/${product.id}`} className="product-card-link">
                      <div className="product-image-wrap">
                        <img
                          className="product-image"
                          src={product.image}
                          alt={product.name}
                        />
                      </div>
                    </a>

                    <div className="product-body">
                      <a href={`/product/${product.id}`} className="product-card-link">
                        <div className="product-category">
                          {product.categoryTitle}
                          {product.subcategory ? ` / ${product.subcategory}` : ''}
                        </div>

                        <div className="product-title">
                          {product.name}
                        </div>

                        <div className="product-desc">
                          {product.description}
                        </div>
                      </a>

                      <div className="product-meta">
                        <div className="product-price">
                          {formatPrice(product.price)}
                        </div>

                        <div className="product-size">
                          {product.sizes}
                        </div>
                      </div>

                      <div className="product-actions">
                        <button
                          className="add-cart-btn"
                          type="button"
                          onClick={() => addToCart(product)}
                        >
                          В корзину
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}