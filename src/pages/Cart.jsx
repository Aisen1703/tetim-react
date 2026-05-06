import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

export default function Cart() {
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const [orderForm, setOrderForm] = useState({
    name: '',
    phone: '',
    email: '',
    deliveryType: 'delivery',
    address: '',
    comment: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    loadCart();

    if (user) {
      setOrderForm((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
      }));
    }
  }, []);

  function loadCart() {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }

  function saveCart(nextCart) {
    localStorage.setItem('cart', JSON.stringify(nextCart));
    setCart(nextCart);
  }

  function increaseItem(productId) {
    const nextCart = cart.map((item) => {
      if (Number(item.id) === Number(productId)) {
        return {
          ...item,
          quantity: Number(item.quantity || 0) + 1,
        };
      }

      return item;
    });

    saveCart(nextCart);
  }

  function decreaseItem(productId) {
    const nextCart = cart
      .map((item) => {
        if (Number(item.id) === Number(productId)) {
          return {
            ...item,
            quantity: Number(item.quantity || 0) - 1,
          };
        }

        return item;
      })
      .filter((item) => Number(item.quantity) > 0);

    saveCart(nextCart);
  }

  function removeItem(productId) {
    const nextCart = cart.filter(
      (item) => Number(item.id) !== Number(productId)
    );

    saveCart(nextCart);
  }

  function clearCart() {
    saveCart([]);
    setMessage('');
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setOrderForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function submitOrder(event) {
    event.preventDefault();

    if (!cart.length) {
      setMessage('Корзина пуста. Добавьте товары перед оформлением.');
      return;
    }

    if (!orderForm.name.trim() || !orderForm.phone.trim()) {
      setMessage('Введите имя и телефон.');
      return;
    }

    if (orderForm.deliveryType === 'delivery' && !orderForm.address.trim()) {
      setMessage('Введите адрес доставки или выберите самовывоз.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:4000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customer: {
            name: orderForm.name,
            phone: orderForm.phone,
            email: orderForm.email,
          },
          items: cart,
          total,
          deliveryType: orderForm.deliveryType,
          address:
            orderForm.deliveryType === 'delivery'
              ? orderForm.address
              : 'Самовывоз: Якутск, ул. Дежнева, д. 30',
          comment: orderForm.comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || 'Ошибка оформления заказа');
        return;
      }

      saveCart([]);

      setOrderForm({
        name: '',
        phone: '',
        email: '',
        deliveryType: 'delivery',
        address: '',
        comment: '',
      });

      setMessage('');
      setIsSuccessOpen(true);
    } catch (error) {
      setMessage('Не удалось отправить заказ. Проверьте backend.');
    }
  }

  const cartCount = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  return (
    <>
      <Header cartCount={cartCount} />

      <main className="container cart-page">
        <div className="cart-title-row">
          <div>
            <h1>Корзина</h1>
            <p>Проверьте товары и оформите заказ</p>
          </div>

          {cart.length > 0 && (
            <button className="clear-cart-btn" type="button" onClick={clearCart}>
              Очистить корзину
            </button>
          )}
        </div>

        <div className="cart-layout">
          <section className="cart-items-card">
            <h2>Товары</h2>

            {cart.length === 0 ? (
              <div className="empty-cart-box">
                <h3>Корзина пуста</h3>
                <p>Добавьте товары из каталога, чтобы оформить заказ.</p>

                <Link to="/catalog" className="btn btn-dark">
                  Перейти в каталог
                </Link>
              </div>
            ) : (
              <div className="cart-items-list">
                {cart.map((item) => (
                  <div className="cart-product-row" key={item.id}>
                    <div className="cart-product-image">
                      {item.image || item.image_url ? (
                        <img
                          src={item.image || item.image_url}
                          alt={item.name}
                        />
                      ) : (
                        <span>TETIM</span>
                      )}
                    </div>

                    <div className="cart-product-info">
                      <Link to={`/product/${item.id}`} className="cart-product-name">
                        {item.name}
                      </Link>

                      <div className="cart-product-meta">
                        {item.size ? `Размер: ${item.size}` : 'Размер не выбран'}
                      </div>

                      <div className="cart-product-price">
                        {formatPrice(item.price)}
                      </div>
                    </div>

                    <div className="cart-product-controls">
                      <div className="cart-stepper cart-stepper-small">
                        <button
                          type="button"
                          onClick={() => decreaseItem(item.id)}
                        >
                          −
                        </button>

                        <span>{item.quantity} шт.</span>

                        <button
                          type="button"
                          onClick={() => increaseItem(item.id)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="cart-remove-btn"
                        type="button"
                        onClick={() => removeItem(item.id)}
                      >
                        Удалить
                      </button>
                    </div>

                    <div className="cart-product-total">
                      {formatPrice(Number(item.price) * Number(item.quantity))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="cart-summary-card">
            <h2>Итого</h2>

            <div className="cart-summary-row">
              <span>Товаров</span>
              <strong>{cartCount}</strong>
            </div>

            <div className="cart-summary-row">
              <span>Сумма</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <div className="cart-summary-total">
              <span>К оплате</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <form className="cart-order-form" onSubmit={submitOrder}>
              <h3>Оформление заказа</h3>

              {user ? (
                <div className="cart-account-box">
                  <strong>Заказ будет оформлен на аккаунт</strong>
                  <span>{orderForm.name}</span>
                  <span>{orderForm.phone}</span>
                  <span>{orderForm.email}</span>
                </div>
              ) : (
                <>
                  <input
                    name="name"
                    value={orderForm.name}
                    onChange={handleChange}
                    placeholder="Ваше имя"
                    required
                  />

                  <input
                    name="phone"
                    value={orderForm.phone}
                    onChange={handleChange}
                    placeholder="Телефон"
                    required
                  />

                  <input
                    name="email"
                    type="email"
                    value={orderForm.email}
                    onChange={handleChange}
                    placeholder="Email"
                  />
                </>
              )}

              <div className="delivery-choice">
                <label className={orderForm.deliveryType === 'delivery' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="deliveryType"
                    value="delivery"
                    checked={orderForm.deliveryType === 'delivery'}
                    onChange={handleChange}
                  />

                  <span>
                    <strong>Доставка</strong>
                    <small>Курьером по адресу</small>
                  </span>
                </label>

                <label className={orderForm.deliveryType === 'pickup' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="deliveryType"
                    value="pickup"
                    checked={orderForm.deliveryType === 'pickup'}
                    onChange={handleChange}
                  />

                  <span>
                    <strong>Самовывоз</strong>
                    <small>ул. Дежнева, д. 30</small>
                  </span>
                </label>
              </div>

              {orderForm.deliveryType === 'delivery' ? (
                <input
                  name="address"
                  value={orderForm.address}
                  onChange={handleChange}
                  placeholder="Адрес доставки"
                  required
                />
              ) : (
                <div className="pickup-box">
                  <strong>Пункт самовывоза</strong>
                  <span>Якутск, ул. Дежнева, д. 30</span>
                  <small>
                    После оформления заказа мы свяжемся с вами для подтверждения.
                  </small>
                </div>
              )}

              <textarea
                name="comment"
                value={orderForm.comment}
                onChange={handleChange}
                placeholder="Комментарий к заказу"
              />

              <button className="btn btn-dark full-width" type="submit">
                Оформить заказ
              </button>
            </form>

            {message && <div className="message error-message">{message}</div>}
          </aside>
        </div>
      </main>

      {isSuccessOpen && (
        <div className="order-success-overlay">
          <div className="order-success-modal">
            <button
              className="order-success-close"
              type="button"
              onClick={() => setIsSuccessOpen(false)}
            >
              ✕
            </button>

            <div className="order-success-icon">✓</div>

            <h2>Заказ оформлен</h2>

            <p>
              Мы свяжемся с вами для подтверждения заказа с 10:00 до 19:30.
            </p>

            <Link
              to="/catalog"
              className="btn btn-dark"
              onClick={() => setIsSuccessOpen(false)}
            >
              Вернуться в каталог
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}