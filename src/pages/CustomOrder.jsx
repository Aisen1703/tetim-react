import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CATEGORIES = [
  { key: 'all',       label: 'Все' },
  { key: 'tshirts',   label: 'Футболки' },
  { key: 'bottoms',   label: 'Шорты / Брюки' },
  { key: 'sets',      label: 'Комплекты' },
  { key: 'outerwear', label: 'Верхняя одежда' },
  { key: 'vests',     label: 'Жилеты' },
  { key: 'cotton',    label: 'Хлопок' },
  { key: 'acc',       label: 'Аксессуары' },
];

const TIERS = ['1–9 шт', '10–29 шт', '30–49 шт', 'от 50 шт'];
const GROUPS = [
  { key: 'adult', label: 'Взрослые',   sizes: '2XS – 3XL' },
  { key: 'teen',  label: 'Подростки',  sizes: '140 – 176' },
  { key: 'kids',  label: 'Детские',    sizes: '98 – 134' },
];

function fmt(n) { return Number(n).toLocaleString('ru-RU') + ' ₽'; }
function getPriceIndex(qty) {
  if (qty >= 50) return 3;
  if (qty >= 30) return 2;
  if (qty >= 10) return 1;
  return 0;
}

function normalizeProduct(p) {
  return {
    key: p.key_name,
    name: p.name,
    category: p.category,
    adult: [Number(p.price_adult_1), Number(p.price_adult_2), Number(p.price_adult_3), Number(p.price_adult_4)],
    teen:  [Number(p.price_teen_1),  Number(p.price_teen_2),  Number(p.price_teen_3),  Number(p.price_teen_4)],
    kids:  [Number(p.price_kids_1),  Number(p.price_kids_2),  Number(p.price_kids_3),  Number(p.price_kids_4)],
  };
}

export default function CustomOrder() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [selectedKey, setSelectedKey] = useState('');
  const [group, setGroup] = useState('adult');
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [showPriceTable, setShowPriceTable] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/public/custom-order-products`)
      .then(r => r.json())
      .then(d => {
        const normalized = (d.products || []).map(normalizeProduct);
        setProducts(normalized);
        if (normalized.length > 0) setSelectedKey(normalized[0].key);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() =>
    products.filter(p => category === 'all' || p.category === category),
  [products, category]);

  const product = products.find(p => p.key === selectedKey);
  const safeQty = Math.max(1, Number(qty) || 1);
  const priceIndex = getPriceIndex(safeQty);
  const unitPrice = product?.[group]?.[priceIndex] || 0;
  const total = unitPrice * safeQty;
  const orderTotal = items.reduce((s, i) => s + i.total, 0);

  function addItem() {
    if (!product) return;
    setItems(prev => [...prev, {
      id: Date.now(),
      key: selectedKey,
      name: product.name,
      group,
      groupLabel: GROUPS.find(g => g.key === group).label,
      qty: safeQty,
      unitPrice,
      total,
    }]);
  }

  function removeItem(id) { setItems(prev => prev.filter(i => i.id !== id)); }

  function submit(e) {
    e.preventDefault();
    if (!items.length) { setMessage('Добавьте хотя бы одну позицию.'); return; }
    setMessage('Заявка отправлена! Мы свяжемся с вами для уточнения деталей.');
    setItems([]);
  }

  return (
    <>
      <Header />
      <main className="co-page">

        {/* Hero */}
        <section className="co-hero">
          <div className="container">
            <div className="co-hero-inner">
              <div className="co-hero-text">
                <span className="co-hero-badge">Индивидуальный пошив</span>
                <h1>Заказ формы<br />для команды</h1>
                <p>Сублимационная печать, индивидуальный дизайн, любые тиражи. Цены из официального прайса 2026.</p>
                <div className="co-hero-pills">
                  <span>Сублимация</span><span>Ваш дизайн</span><span>от 1 шт</span>
                </div>
              </div>
              <div className="co-hero-contacts">
                <div className="co-contact-item"><strong>Телефон</strong><a href="tel:+79990600075">+7 (999) 060-00-75</a></div>
                <div className="co-contact-item"><strong>Адрес</strong><span>г. Якутск, ул. Дежнева, 30</span></div>
                <div className="co-contact-item"><strong>Опыт</strong><span>более 10 лет на рынке</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Условия */}
        <section className="co-rules">
          <div className="container">
            <h2>Условия работы</h2>
            <div className="co-rules-grid">
              {[
                ['01', '100% предоплата', 'Работаем только после полной оплаты заказа'],
                ['02', 'Логотип TETIM', 'На каждом изделии оставляем фирменный логотип'],
                ['03', 'Разработка дизайна', 'Макет создаём в порядке очереди после оформления'],
                ['04', 'Наши размеры', 'Все изделия шьём по собственной размерной таблице'],
                ['05', 'Время выдачи', 'Заказ готов в оговоренную дату с 10:00 до 20:00'],
              ].map(([num, title, text]) => (
                <div key={num} className="co-rule">
                  <span className="co-rule-num">{num}</span>
                  <div><strong>{title}</strong><p>{text}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Калькулятор */}
        <section className="co-calc-section">
          <div className="container">
            {loading ? (
              <div className="co-loading">Загрузка прайса...</div>
            ) : (
            <div className="co-calc-layout">
              <div className="co-calc-left">
                <h2>Рассчитать стоимость</h2>
                <div className="co-cats">
                  {CATEGORIES.map(c => (
                    <button key={c.key} type="button"
                      className={`co-cat-btn${category === c.key ? ' active' : ''}`}
                      onClick={() => {
                        setCategory(c.key);
                        const first = products.find(p => c.key === 'all' || p.category === c.key);
                        if (first) setSelectedKey(first.key);
                      }}
                    >{c.label}</button>
                  ))}
                </div>
                <div className="co-products">
                  {filteredProducts.map(p => (
                    <button key={p.key} type="button"
                      className={`co-product-btn${selectedKey === p.key ? ' active' : ''}`}
                      onClick={() => setSelectedKey(p.key)}
                    >
                      <span className="co-product-name">{p.name}</span>
                      <span className="co-product-price">от {fmt(p.adult[3])}</span>
                    </button>
                  ))}
                </div>
              </div>

              {product && (
              <div className="co-calc-right">
                <div className="co-calc-card">
                  <h3>{product.name}</h3>
                  <div className="co-field">
                    <label>Категория</label>
                    <div className="co-group-tabs">
                      {GROUPS.map(g => (
                        <button key={g.key} type="button"
                          className={`co-group-tab${group === g.key ? ' active' : ''}`}
                          onClick={() => setGroup(g.key)}
                        >
                          <strong>{g.label}</strong><small>{g.sizes}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="co-field">
                    <label>Количество</label>
                    <div className="co-qty-row">
                      <button type="button" className="co-qty-btn" onClick={() => setQty(q => Math.max(1, Number(q)-1))}>−</button>
                      <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="co-qty-input" />
                      <button type="button" className="co-qty-btn" onClick={() => setQty(q => Number(q)+1)}>+</button>
                    </div>
                    <div className="co-tier-hints">
                      {TIERS.map((t, i) => (
                        <span key={i} className={`co-tier${priceIndex === i ? ' active' : ''}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="co-result">
                    <div className="co-result-row"><span>Цена за 1 шт.</span><strong>{fmt(unitPrice)}</strong></div>
                    <div className="co-result-row total"><span>Сумма позиции</span><strong>{fmt(total)}</strong></div>
                  </div>
                  <button type="button" className="co-toggle-table" onClick={() => setShowPriceTable(p => !p)}>
                    {showPriceTable ? '▲ Скрыть таблицу цен' : '▼ Показать таблицу цен'}
                  </button>
                  {showPriceTable && (
                    <div className="co-price-table">
                      <table>
                        <thead><tr><th>Тираж</th>{GROUPS.map(g => <th key={g.key}>{g.label}</th>)}</tr></thead>
                        <tbody>
                          {TIERS.map((tier, i) => (
                            <tr key={i} className={priceIndex === i ? 'active-row' : ''}>
                              <td>{tier}</td>
                              {GROUPS.map(g => <td key={g.key}>{fmt(product[g.key][i])}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button type="button" className="co-add-btn" onClick={addItem}>+ Добавить в расчёт</button>
                </div>
              </div>
              )}
            </div>
            )}

            {items.length > 0 && (
              <div className="co-order-list">
                <h3>Выбранные позиции</h3>
                {items.map((item, i) => (
                  <div key={item.id} className="co-order-item">
                    <span className="co-order-num">{i + 1}</span>
                    <div className="co-order-info">
                      <strong>{item.name}</strong>
                      <span>{item.groupLabel} · {item.qty} шт. · {fmt(item.unitPrice)} за шт.</span>
                    </div>
                    <strong className="co-order-total">{fmt(item.total)}</strong>
                    <button type="button" className="co-order-remove" onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                ))}
                <div className="co-order-sum">
                  <span>Общая сумма</span><strong>{fmt(orderTotal)}</strong>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Форма заявки */}
        <section className="co-form-section">
          <div className="container">
            <div className="co-form-layout">
              <div className="co-form-card">
                <h2>Оставить заявку</h2>
                <form className="co-form" onSubmit={submit}>
                  <input type="text" placeholder="Ваше имя" required />
                  <input type="tel" placeholder="Телефон" required />
                  <input type="email" placeholder="Email" />
                  <textarea
                    value={items.map((it, i) => `${i+1}. ${it.name} / ${it.groupLabel} / ${it.qty} шт. / ${fmt(it.unitPrice)} за шт. / итого ${fmt(it.total)}`).join('\n')}
                    placeholder="Позиции заказа" readOnly
                    rows={Math.max(3, items.length + 1)}
                  />
                  {orderTotal > 0 && <input type="text" value={`Итого: ${fmt(orderTotal)}`} readOnly />}
                  <textarea placeholder="Комментарий: размеры, цвета, сроки, пожелания" rows={3} />
                  <button type="submit" className="co-submit-btn">Отправить заявку</button>
                </form>
                {message && <div className="co-message">{message}</div>}
              </div>
              <div className="co-form-info">
                <div className="co-info-card">
                  <h3>Размерная сетка</h3>
                  <div className="co-sizes">
                    <div><strong>Взрослые</strong><span>2XS – 3XL</span></div>
                    <div><strong>Подростки</strong><span>140 – 176</span></div>
                    <div><strong>Детские</strong><span>98 – 134</span></div>
                  </div>
                </div>
                <div className="co-info-card co-info-warn">
                  <strong>⚠ Важно</strong>
                  <p>Итоговая стоимость может меняться в зависимости от сложности дизайна, количества цветов и дополнительных услуг.</p>
                </div>
                <div className="co-info-card">
                  <h3>Контакты</h3>
                  <a href="tel:+79990600075" className="co-phone">+7 (999) 060-00-75</a>
                  <span>г. Якутск, ул. Дежнева, 30</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}