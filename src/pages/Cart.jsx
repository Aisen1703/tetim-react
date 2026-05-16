import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

import {
  clearCart,
  getCartItems,
  removeCartItem,
  updateCartItemQuantity,
} from '../utils/cartStorage.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export default function Cart() {
  const [items, setItems] = useState(() => getCartItems());
  const [user] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [orderForm, setOrderForm] = useState({
    customer_name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: '',
    comment: '',
  });

  useEffect(() => {
    function syncCart() {
      setItems(getCartItems());
    }

    syncCart();

    window.addEventListener('storage', syncCart);
    window.addEventListener('tetim-cart-updated', syncCart);
    window.addEventListener('focus', syncCart);

    return () => {
      window.removeEventListener('storage', syncCart);
      window.removeEventListener('tetim-cart-updated', syncCart);
      window.removeEventListener('focus', syncCart);
    };
  }, []);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.quantity || 1);
    }, 0);
  }, [items]);

  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);
  }, [items]);

  function showMessage(text) {
    setMessage(text);

    setTimeout(() => {
      setMessage('');
    }, 3500);
  }

  function changeQuantity(index, quantity) {
    const nextItems = updateCartItemQuantity(index, quantity);
    setItems(nextItems);
  }

  function deleteItem(index) {
    const nextItems = removeCartItem(index);
    setItems(nextItems);
    showMessage('Товар удалён из корзины');
  }

  function emptyCart() {
    clearCart();
    setItems([]);
    showMessage('Корзина очищена');
  }

  async function createOrder(event) {
    event.preventDefault();

    if (!items.length) {
      showMessage('Корзина пустая');
      return;
    }

    if (!orderForm.customer_name || !orderForm.phone) {
      showMessage('Заполните имя и телефон');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id || null,
          customer_name: orderForm.customer_name,
          phone: orderForm.phone,
          email: orderForm.email,
          address: orderForm.address,
          comment: orderForm.comment,
          items: items.map((item) => ({
            product_id: item.product_id || item.id,
            id: item.id,
            name: item.name,
            product_name: item.name,
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 1),
            size: item.size || '',
          })),
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось оформить заказ');
        return;
      }

      clearCart();
      setItems([]);

      showMessage(`Заказ №${data.order_id || ''} оформлен`);
    } catch {
      showMessage('Backend не отвечает. Проверьте server.js');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />

      <main className="cart-page">
        <section className="container cart-layout">
          <div className="cart-main">
            <div className="cart-head">
              <div>
                <h1>Корзина</h1>
                <p>Товаров: {totalQuantity}</p>
              </div>

              {items.length > 0 && (
                <button
                  type="button"
                  className="cart-clear-btn"
                  onClick={emptyCart}
                >
                  Очистить корзину
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="cart-empty">
                <h2>Корзина пустая</h2>
                <p>Добавьте товары из каталога, чтобы оформить заказ.</p>

                <Link to="/catalog">Перейти в каталог</Link>
              </div>
            ) : (
              <div className="cart-items">
                {items.map((item, index) => (
                  <article
                    key={`${item.id}-${item.size}-${index}`}
                    className="cart-item"
                  >
                    <div className="cart-item-image">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} />
                      ) : (
                        <span>Нет фото</span>
                      )}
                    </div>

                    <div className="cart-item-info">
                      <h3>{item.name}</h3>

                      {item.size && <p>Размер: {item.size}</p>}

                      <strong>{formatPrice(item.price)}</strong>
                    </div>

                    <div className="cart-quantity">
                      <button
                        type="button"
                        disabled={Number(item.quantity || 1) <= 1}
                        onClick={() =>
                          changeQuantity(index, Number(item.quantity || 1) - 1)
                        }
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="1"
                        value={Number(item.quantity || 1)}
                        onChange={(event) =>
                          changeQuantity(index, event.target.value)
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          changeQuantity(index, Number(item.quantity || 1) + 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <div className="cart-item-total">
                      <strong>
                        {formatPrice(
                          Number(item.price || 0) *
                            Number(item.quantity || 1)
                        )}
                      </strong>

                      <button type="button" onClick={() => deleteItem(index)}>
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="cart-summary">
            <h2>Оформление заказа</h2>

            <div className="cart-summary-line">
              <span>Товары</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>

            <div className="cart-summary-line">
              <span>Итого</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>

            <form className="cart-order-form" onSubmit={createOrder}>
              <input
                value={orderForm.customer_name}
                onChange={(event) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    customer_name: event.target.value,
                  }))
                }
                placeholder="Ваше имя"
                required
              />

              <input
                value={orderForm.phone}
                onChange={(event) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                placeholder="Телефон"
                required
              />

              <input
                type="email"
                value={orderForm.email}
                onChange={(event) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="Email"
              />

              <input
                value={orderForm.address}
                onChange={(event) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
                placeholder="Адрес доставки"
              />

              <textarea
                value={orderForm.comment}
                onChange={(event) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    comment: event.target.value,
                  }))
                }
                placeholder="Комментарий к заказу"
              />

              <button type="submit" disabled={loading || items.length === 0}>
                {loading ? 'Оформляем...' : 'Оформить заказ'}
              </button>
            </form>

            {message && <div className="cart-message">{message}</div>}
          </aside>
        </section>
      </main>

      <Footer />
    </>
  );
}