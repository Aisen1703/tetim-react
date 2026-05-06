import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const API_URL = 'http://localhost:4000/api';

const tabs = [
  ['profile', 'Мои данные'],
  ['orders', 'Мои заказы'],
  ['returns', 'Мои возвраты'],
  ['bonuses', 'Мои бонусы'],
  ['discounts', 'Мои скидки'],
  ['promos', 'Мои промокоды'],
  ['addresses', 'Адреса доставки'],
  ['notifications', 'Уведомления'],
  ['history', 'История просмотров'],
  ['subscriptions', 'Управление подписками'],
];

export default function Account() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState('');
  const [orders, setOrders] = useState([]);

  const [profile, setProfile] = useState({
    name: '',
    lastname: '',
    email: '',
    phone: '',
    birthday: '',
    gender: 'male',
    city: '',
    street: '',
    house: '',
    flat: '',
  });

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    if (!token || !user) {
      navigate('/');
      return;
    }

    setProfile((prev) => ({
      ...prev,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    }));

    loadProfile();
    loadOrders();
  }, []);

  async function loadProfile() {
    try {
      const response = await fetch(`${API_URL}/account/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) return;

      setProfile({
        name: data.user?.name || '',
        lastname: data.user?.lastname || '',
        email: data.user?.email || '',
        phone: data.user?.phone || '',
        birthday: data.user?.birthday || '',
        gender: data.user?.gender || 'male',
        city: data.user?.city || '',
        street: data.user?.street || '',
        house: data.user?.house || '',
        flat: data.user?.flat || '',
      });
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    }
  }

  async function loadOrders() {
    try {
      const response = await fetch(`${API_URL}/account/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setOrders([]);
        return;
      }

      setOrders(data.orders || []);
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
      setOrders([]);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function saveProfile() {
    setMessage('Изменения сохранены локально');
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  }

  return (
    <>
      <Header />

      <main className="container account-page">
        <div className="account-title-row">
          <h1>ЛИЧНЫЙ КАБИНЕТ</h1>

          <div className="account-top-actions">
            {user?.role === 'admin' && (
              <button
                className="btn btn-dark"
                type="button"
                onClick={() => navigate('/admin')}
              >
                Админ-панель
              </button>
            )}

            <button className="btn btn-light" type="button" onClick={logout}>
              Выйти
            </button>
          </div>
        </div>

        <div className="account-layout">
          <aside className="account-sidebar">
            {tabs.map(([key, title]) => (
              <button
                key={key}
                className={`account-menu-link ${activeTab === key ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab(key)}
              >
                {title}
              </button>
            ))}
          </aside>

          <section className="account-content">
            {activeTab === 'profile' && (
              <div className="account-panel active">
                <h2>Мои данные</h2>

                <div className="account-section">
                  <h3>Личная информация</h3>

                  <div className="account-form-grid">
                    <label className="account-field">
                      <span>Имя</span>
                      <input name="name" value={profile.name} onChange={handleChange} />
                    </label>

                    <label className="account-field">
                      <span>Фамилия</span>
                      <input name="lastname" value={profile.lastname} onChange={handleChange} />
                    </label>

                    <label className="account-field">
                      <span>Email</span>
                      <input name="email" type="email" value={profile.email} onChange={handleChange} />
                    </label>

                    <label className="account-field">
                      <span>Телефон</span>
                      <input name="phone" value={profile.phone} onChange={handleChange} />
                    </label>

                    <label className="account-field">
                      <span>Дата рождения</span>
                      <input
                        name="birthday"
                        value={profile.birthday}
                        onChange={handleChange}
                        placeholder="17.03.1998"
                      />
                    </label>

                    <div className="account-field">
                      <span>Пол</span>
                      <div className="radio-group">
                        <label>
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={profile.gender === 'male'}
                            onChange={handleChange}
                          />
                          Мужской
                        </label>

                        <label>
                          <input
                            type="radio"
                            name="gender"
                            value="female"
                            checked={profile.gender === 'female'}
                            onChange={handleChange}
                          />
                          Женский
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="account-section">
                  <h3>Адрес</h3>

                  <div className="account-form-grid">
                    <label className="account-field">
                      <span>Город</span>
                      <input name="city" value={profile.city} onChange={handleChange} placeholder="Якутск" />
                    </label>

                    <label className="account-field">
                      <span>Улица</span>
                      <input name="street" value={profile.street} onChange={handleChange} placeholder="ул. Чкалова" />
                    </label>

                    <label className="account-field">
                      <span>Дом</span>
                      <input name="house" value={profile.house} onChange={handleChange} />
                    </label>

                    <label className="account-field">
                      <span>Квартира</span>
                      <input name="flat" value={profile.flat} onChange={handleChange} />
                    </label>
                  </div>
                </div>

                <div className="account-actions">
                  <button className="btn btn-dark" type="button" onClick={saveProfile}>
                    Сохранить изменения
                  </button>
                </div>

                {message && <div className="message">{message}</div>}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="account-panel active">
                <h2>Мои заказы</h2>

                <div className="account-list">
                  {orders.length === 0 ? (
                    <div className="empty-box">Заказов пока нет</div>
                  ) : (
                    orders.map((order) => (
                      <div className="order-row" key={order.id}>
                        <div>
                          <div className="order-row-title">Заказ #{order.id}</div>
                          <div className="order-row-meta">Статус: {order.status}</div>
                          <div className="order-row-meta">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleString('ru-RU')
                              : ''}
                          </div>
                        </div>

                        <div className="order-row-price">
                          {Number(order.total_amount).toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'returns' && (
              <Panel title="Мои возвраты" text="Возвратов пока нет" />
            )}

            {activeTab === 'bonuses' && (
              <Panel title="Мои бонусы" text="Бонусы пока не начислены" />
            )}

            {activeTab === 'discounts' && (
              <Panel title="Мои скидки" text="Персональные скидки пока не активированы" />
            )}

            {activeTab === 'promos' && (
              <Panel title="Мои промокоды" text="Активных промокодов нет" />
            )}

            {activeTab === 'addresses' && (
              <Panel title="Адреса доставки" text="Сохранённые адреса пока не добавлены" />
            )}

            {activeTab === 'notifications' && (
              <Panel title="Уведомления" text="Новых уведомлений нет" />
            )}

            {activeTab === 'history' && (
              <Panel title="История просмотров" text="История просмотров пока пуста" />
            )}

            {activeTab === 'subscriptions' && (
              <Panel title="Управление подписками" text="Настройки подписок будут здесь" />
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

function Panel({ title, text }) {
  return (
    <div className="account-panel active">
      <h2>{title}</h2>
      <div className="empty-box">{text}</div>
    </div>
  );
}