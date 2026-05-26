import { useMemo, useState } from 'react';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const priceData = {
  tshirt_mesh: {
    name: 'Футболка — ложная сетка',
    adult: [1990, 1890, 1790, 1690],
    kids: [1790, 1690, 1590, 1490],
    teen: [1890, 1790, 1690, 1590],
  },
  tshirt_honey: {
    name: 'Футболка — соты',
    adult: [2190, 2090, 1990, 1890],
    kids: [1990, 1890, 1790, 1690],
    teen: [2090, 1990, 1890, 1790],
  },
  shorts_mesh: {
    name: 'Шорты — ложная сетка',
    adult: [1890, 1790, 1690, 1590],
    kids: [1690, 1590, 1490, 1390],
    teen: [1790, 1690, 1590, 1490],
  },
  shorts_honey: {
    name: 'Шорты — соты',
    adult: [2090, 1990, 1890, 1790],
    kids: [1890, 1790, 1690, 1590],
    teen: [1990, 1890, 1790, 1690],
  },
  kit_mesh: {
    name: 'Комплект футболка + шорты — ложная сетка',
    adult: [3790, 3590, 3390, 3190],
    kids: [3390, 3190, 2990, 2790],
    teen: [3590, 3390, 3190, 2990],
  },
  kit_honey: {
    name: 'Комплект футболка + шорты — соты',
    adult: [4190, 3990, 3790, 3590],
    kids: [3790, 3590, 3390, 3190],
    teen: [3990, 3790, 3590, 3390],
  },
  hockey: {
    name: 'Хоккейка',
    adult: [2990, 2890, 2790, 2690],
    kids: [2790, 2690, 2590, 2490],
    teen: [2890, 2790, 2690, 2590],
  },
  polo_mesh: {
    name: 'Футболка Поло — ложная сетка',
    adult: [2190, 2090, 1990, 1890],
    kids: [1990, 1890, 1790, 1690],
    teen: [2090, 1990, 1890, 1790],
  },
  polo_honey: {
    name: 'Футболка Поло — соты',
    adult: [2390, 2290, 2190, 2090],
    kids: [2190, 2090, 1990, 1890],
    teen: [2290, 2190, 2090, 1990],
  },
  longsleeve_mesh: {
    name: 'Лонгслив — ложная сетка',
    adult: [2390, 2290, 2190, 2090],
    kids: [2190, 2090, 1990, 1890],
    teen: [2290, 2190, 2090, 1990],
  },
  longsleeve_honey: {
    name: 'Лонгслив — соты',
    adult: [2590, 2490, 2390, 2290],
    kids: [2390, 2290, 2190, 2090],
    teen: [2490, 2390, 2290, 2190],
  },
  tracksuit: {
    name: 'Спортивный костюм — дюспо',
    adult: [7990, 7790, 7690, 7490],
    kids: [6990, 6890, 6790, 6690],
    teen: [7390, 7290, 7190, 7090],
  },
  windbreaker: {
    name: 'Ветровка — дюспо',
    adult: [4890, 4790, 4690, 4590],
    kids: [4390, 4290, 4190, 4090],
    teen: [4590, 4490, 4390, 4290],
  },
  vest: {
    name: 'Жилет — дюспо с синтепоном',
    adult: [4990, 4890, 4790, 4690],
    kids: [4490, 4390, 4290, 4190],
    teen: [4690, 4590, 4490, 4390],
  },
  panama: {
    name: 'Панама',
    adult: [1190, 1090, 990, 890],
    kids: [1190, 1090, 990, 890],
    teen: [1190, 1090, 990, 890],
  },
  backpack: {
    name: 'Рюкзак-мешок',
    adult: [1190, 1090, 990, 890],
    kids: [1190, 1090, 990, 890],
    teen: [1190, 1090, 990, 890],
  },
  flag: {
    name: 'Флаг',
    adult: [1490, 1390, 1290, 1190],
    kids: [1490, 1390, 1290, 1190],
    teen: [1490, 1390, 1290, 1190],
  },
};

function formatPrice(value) {
  return `${Number(value).toLocaleString('ru-RU')} ₽`;
}

function getPriceIndex(qty) {
  if (qty >= 50) return 3;
  if (qty >= 30) return 2;
  if (qty >= 10) return 1;
  return 0;
}

function getGroupName(group) {
  if (group === 'adult') return 'Взрослые';
  if (group === 'teen') return 'Подростки';
  if (group === 'kids') return 'Детские';
  return '';
}

export default function CustomOrder() {
  const [productKey, setProductKey] = useState('tshirt_mesh');
  const [group, setGroup] = useState('adult');
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');

  const currentPosition = useMemo(() => {
    const product = priceData[productKey];
    const safeQty = Math.max(1, Number(qty || 1));
    const price = product[group][getPriceIndex(safeQty)];

    return {
      id: Date.now(),
      productKey,
      productName: product.name,
      group,
      groupName: getGroupName(group),
      qty: safeQty,
      price,
      total: price * safeQty,
    };
  }, [productKey, group, qty]);

  const total = items.reduce((sum, item) => sum + item.total, 0);

  function addPosition() {
    setItems((prev) => [
      ...prev,
      {
        ...currentPosition,
        id: Date.now(),
      },
    ]);
  }

  function removePosition(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function submitOrder(event) {
    event.preventDefault();

    if (!items.length) {
      setMessage('Добавьте хотя бы одну позицию в заказ.');
      return;
    }

    setMessage('Заявка отправлена. Мы свяжемся с вами для уточнения деталей.');
    setItems([]);
    setQty(1);
  }

  const selectedText = items
    .map((item, index) => {
      return `${index + 1}. ${item.productName} / ${item.groupName} / ${item.qty} шт. / ${formatPrice(item.price)} за 1 шт. / сумма ${formatPrice(item.total)}`;
    })
    .join('\n');

  return (
    <>
      <Header />

      <main className="container custom-order-page">
        <section className="custom-hero">
          <div className="custom-hero-content">
            <div className="hero-label">Индивидуальный пошив</div>
            <h1>Индивидуальный заказ</h1>
            <p>
              Добавьте несколько изделий в расчёт: футболки, шорты, костюмы,
              поло, ветровки и аксессуары. Сайт сразу покажет стоимость каждой
              позиции и общую сумму.
            </p>

            <div className="custom-hero-pills">
              <span className="feature-pill">Сублимационная печать</span>
              <span className="feature-pill">Индивидуальный дизайн</span>
              <span className="feature-pill">Командная форма</span>
            </div>
          </div>

          <div className="custom-hero-card">
            <h3>Контакты</h3>
            <p><strong>Телефон:</strong> +7 (999) 060-00-75</p>
            <p><strong>Адрес:</strong> ул. Дежнева, д. 30</p>
            <p><strong>Опыт:</strong> более 8 лет на рынке</p>
          </div>
        </section>

        <section className="custom-order-rules-section">
          <div className="custom-order-rules-card">
            <div className="custom-order-rules-image">
              <img src="/assets/custom-team-banner.jpg" alt="Пошив спортивной одежды TETIM" />
            </div>

            <div className="custom-order-rules-content">
              <div className="hero-label">Правила работы с заказами</div>
              <h2>Перед оформлением заказа</h2>

              <div className="custom-order-rules-list">
                <div className="custom-order-rule">
                  <span>01</span>
                  <p>Мы работаем только по <strong>100% предоплате</strong>.</p>
                </div>

                <div className="custom-order-rule">
                  <span>02</span>
                  <p>На каждом своём изделии оставляем фирменный логотип <strong>«Тэтим»</strong>.</p>
                </div>

                <div className="custom-order-rule">
                  <span>03</span>
                  <p>Макет дизайна разрабатывается в порядке очереди после оформления заказа.</p>
                </div>

                <div className="custom-order-rule">
                  <span>04</span>
                  <p>Все изделия мы шьём по своей размерной таблице.</p>
                </div>

                <div className="custom-order-rule">
                  <span>05</span>
                  <p>Заказ будет готов в обговоренную дату с <strong>10:00 до 20:00</strong>.</p>
                </div>
              </div>

              <div className="custom-order-rules-final">
                Если вас всё устраивает, можем перейти к оформлению заказа :)
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="card-lite custom-calculator">
            <h2>Рассчитать стоимость</h2>

            <div className="custom-calc-grid">
              <label>
                <span>Товар</span>
                <select value={productKey} onChange={(e) => setProductKey(e.target.value)}>
                  {Object.entries(priceData).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Категория</span>
                <select value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option value="adult">Взрослые</option>
                  <option value="teen">Подростки</option>
                  <option value="kids">Детские</option>
                </select>
              </label>

              <label>
                <span>Количество</span>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </label>

              <button type="button" className="btn btn-dark" onClick={addPosition}>
                Добавить позицию
              </button>
            </div>

            <div className="calc-result">
              <div>
                <span>Цена за 1 шт.</span>
                <strong>{formatPrice(currentPosition.price)}</strong>
              </div>

              <div>
                <span>Сумма позиции</span>
                <strong>{formatPrice(currentPosition.total)}</strong>
              </div>
            </div>

            <p className="calc-note">
              Цена считается по тиражам: 1–9 шт., 10–29 шт., 30–49 шт., от 50 шт.
            </p>

            <div className="order-list-box">
              <h3>Выбранные позиции</h3>

              {!items.length ? (
                <div className="empty-box">Позиции пока не добавлены</div>
              ) : (
                items.map((item, index) => (
                  <div className="selected-order-item" key={item.id}>
                    <div>
                      <strong>{index + 1}. {item.productName}</strong>
                      <p>
                        {item.groupName} · {item.qty} шт. · {formatPrice(item.price)} за 1 шт.
                      </p>
                    </div>

                    <div className="selected-order-item-right">
                      <strong>{formatPrice(item.total)}</strong>
                      <button type="button" onClick={() => removePosition(item.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className="order-total-row">
                <span>Общая сумма</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="custom-order-layout">
            <div className="card-lite">
              <h2>Оставить заявку</h2>

              <form className="form custom-order-form" onSubmit={submitOrder}>
                <input type="text" placeholder="Ваше имя" required />
                <input type="tel" placeholder="Телефон" required />
                <input type="email" placeholder="Email" />

                <textarea value={selectedText} placeholder="Выбранные позиции" readOnly />
                <input type="text" value={formatPrice(total)} placeholder="Итоговая сумма" readOnly />

                <textarea placeholder="Комментарий: размеры, цвета, сроки, пожелания" />

                <button type="submit" className="btn btn-dark full-width">
                  Отправить заявку
                </button>
              </form>

              {message && <div className="message">{message}</div>}
            </div>

            <div className="card-lite custom-order-side">
              <h3>Размеры</h3>
              <p>Взрослые: 2XS – 3XL</p>
              <p>Детские: 98 – 134</p>
              <p>Подростки: 140 – 176</p>

              <div className="custom-order-side-box">
                <strong>Важно</strong>
                <p>
                  Итоговая стоимость может меняться в зависимости от дизайна,
                  материалов и дополнительных услуг.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}