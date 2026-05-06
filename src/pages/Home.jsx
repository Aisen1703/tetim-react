import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import HeroSlider from '../components/HeroSlider.jsx';

const demoProducts = [
  {
    id: 1,
    name: 'Худи TETIM',
    category: 'Худи',
    description: 'Удобное худи для города и спорта.',
    price: 3493,
    sizes: 'S / M / L / XL',
    image_url: '/assets/',
  },
  {
    id: 2,
    name: 'Футболка TETIM',
    category: 'Футболки',
    description: 'Базовая футболка на каждый день.',
    price: 1990,
    sizes: 'S / M / L',
    image_url: '/assets/',
  },
  {
    id: 3,
    name: 'Куртка Outdoor',
    category: 'Куртки',
    description: 'Куртка для города и активного отдыха.',
    price: 5990,
    sizes: 'M / L / XL',
    image_url: '/assets/',
  },
  {
    id: 4,
    name: 'Спортивный костюм',
    category: 'Спортивные костюмы',
    description: 'Комплект для тренировок и прогулок.',
    price: 4490,
    sizes: 'S / M / L / XL',
    image_url: '/assets/',
  },
];

const categories = [
  'Спортивные костюмы',
  'Футболки',
  'Outdoor',
  'Командная форма',
  'Худи',
  'Пуховики, куртки, ветровки',
  'Рубашки',
  'Футболки и Лонгсливы',
];

export default function Home() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product) {
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

    const existing = currentCart.find(
      (item) => Number(item.id) === Number(product.id)
    );

    if (existing) {
      existing.quantity += 1;
    } else {
currentCart.push({
  id: product.id,
  name: product.name,
  price: product.price,
  quantity: 1,
  image: product.image_url || product.image,
  size: product.sizes || '',
});
    }

    localStorage.setItem('cart', JSON.stringify(currentCart));
    setCart(currentCart);
    alert(`Добавлено: ${product.name}`);
  }

  const filteredProducts = demoProducts.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header
        cartCount={cartCount}
        search={search}
        onSearchChange={setSearch}
      />

      <main>
        <section className="hero-large">
          <div className="container hero-large-grid">
            <HeroSlider />

            <div className="hero-large-content">
              <div className="hero-label">Новая коллекция</div>

              <h1>Функциональная одежда для города, спорта и outdoor</h1>

              <p>
                Структура сайта как у большого интернет-магазина: удобный
                каталог, отдельная корзина, подборки и категории.
              </p>

              <div className="hero-buttons">
                <Link to="/catalog" className="btn btn-dark">
                  Каталог
                </Link>

               <Link to="/custom-order" className="btn btn-custom-order">
  Индивидуальный заказ
</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-title-row">
              <h2>Популярные категории</h2>
            </div>

            <div className="promo-categories-grid">
              {categories.map((category) => (
                <Link
                  key={category}
                  to="/catalog"
                  className="promo-category-card"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-alt">
          <div className="container">
            <div className="section-title-row">
              <h2>Хиты продаж</h2>
              <Link to="/catalog" className="section-link">
                Смотреть все
              </Link>
            </div>

            <div className="products-grid">
              {filteredProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <Link to={`/product/${product.id}`} className="product-card-link">
                    <div className="product-image-wrap">
                      <img
                        className="product-image"
                        src={product.image_url}
                        alt={product.name}
                      />
                    </div>
                  </Link>

                  <div className="product-body">
                    <Link to={`/product/${product.id}`} className="product-card-link">
                      <div className="product-category">{product.category}</div>
                      <div className="product-title">{product.name}</div>
                      <div className="product-desc">{product.description}</div>
                    </Link>

                    <div className="product-meta">
                      <div className="product-price">
                        {product.price.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="product-size">{product.sizes}</div>
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
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container promo-banner-grid">
            <div className="wide-banner dark-banner">
              <div>
                <div className="hero-label">Для команд</div>
                <h3>Пошив формы, мерча и комплектов под заказ</h3>
                <p>
                  Для клубов, организаций, спортивных мероприятий и
                  корпоративных команд.
                </p>
              </div>
            </div>

            <div className="wide-banner gold-banner">
              <div>
                <div className="hero-label hero-label-light">
                  Спецпредложение
                </div>
                <h3>Подборки и акции для сезонных коллекций</h3>
                <p>
                  На этой зоне можно выводить распродажи, новинки и специальные
                  предложения.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-alt">
          <div className="container">
            <div className="section-title-row">
              <h2>Преимущества</h2>
            </div>

            <div className="advantages-grid-shop">
              <div className="advantage-box">
                <h3>Доставка</h3>
                <p>Доставка по городу и удобное оформление заказа.</p>
              </div>

              <div className="advantage-box">
                <h3>Кэшбек</h3>
                <p>
                  5% кэшбэка баллами с каждого оплаченного заказа.
                </p>
              </div>

              <div className="advantage-box">
                <h3>Личный кабинет</h3>
                <p>История заказов и профиль покупателя.</p>
              </div>

              <div className="advantage-box">
                <h3>Интеграция с CRM</h3>
                <p>Заказы можно передавать в amoCRM и дальше в 1С.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}