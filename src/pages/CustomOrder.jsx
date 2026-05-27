import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

// ─── Данные из прайса TETIM 2026
const priceData = {
  futbolka_lozhnaya_setka:       { name: 'Футболка (ложная сетка)',              adult: [1990,1890,1790,1690], teen: [1890,1790,1690,1590], kids: [1790,1690,1590,1490] },
  futbolka_soty:                 { name: 'Футболка (соты)',                       adult: [2190,2090,1990,1890], teen: [2090,1990,1890,1790], kids: [1990,1890,1790,1690] },
  futbolka_polo_lozhnaya_setka:  { name: 'Футболка поло (ложная сетка)',          adult: [2190,2090,1990,1890], teen: [2090,1990,1890,1790], kids: [1990,1890,1790,1690] },
  futbolka_polo_soty:            { name: 'Футболка поло (соты)',                  adult: [2390,2290,2190,2090], teen: [2290,2190,2090,1990], kids: [2190,2090,1990,1890] },
  longsleeve_lozhnaya_setka:     { name: 'Лонгслив (ложная сетка)',               adult: [2390,2290,2190,2090], teen: [2290,2190,2090,1990], kids: [2190,2090,1990,1890] },
  longsleeve_soty:               { name: 'Лонгслив (соты)',                       adult: [2590,2490,2390,2290], teen: [2490,2390,2290,2190], kids: [2390,2290,2190,2090] },
  shorty_lozhnaya_setka:         { name: 'Шорты (ложная сетка)',                  adult: [1890,1790,1690,1590], teen: [1790,1690,1590,1490], kids: [1690,1590,1490,1390] },
  shorty_soty:                   { name: 'Шорты (соты)',                          adult: [2090,1990,1890,1790], teen: [1990,1890,1790,1690], kids: [1890,1790,1690,1590] },
  shorty_niagara:                { name: 'Шорты (ниагара)',                       adult: [2390,2290,2190,2090], teen: [2290,2190,2090,1990], kids: [2190,2090,1990,1890] },
  komplekt_setka:                { name: 'Комплект футболка + шорты (сетка)',     adult: [3790,3590,3390,3190], teen: [3590,3390,3190,2990], kids: [3390,3190,2990,2790] },
  komplekt_soty:                 { name: 'Комплект футболка + шорты (соты)',      adult: [4190,3990,3790,3590], teen: [3990,3790,3590,3390], kids: [3790,3590,3390,3190] },
  kostyum_niagara:               { name: 'Спортивный костюм (ниагара)',           adult: [7990,7790,7690,7490], teen: [7390,7290,7190,7090], kids: [6990,6890,6790,6690] },
  kostyum_brush:                 { name: 'Спортивный костюм (браш)',              adult: [8590,8390,8290,8190], teen: [8190,8090,7990,7890], kids: [7790,7690,7590,7490] },
  olimpijka_niagara:             { name: 'Олимпийка (ниагара)',                   adult: [4690,4590,4490,4390], teen: [4390,4290,4190,4090], kids: [4190,4090,3990,3890] },
  bryuki_niagara:                { name: 'Брюки (ниагара)',                       adult: [3490,3390,3290,3190], teen: [3190,3090,2990,2890], kids: [2890,2790,2690,2590] },
  bomber_brush:                  { name: 'Бомбер (браш)',                         adult: [4990,4890,4790,4690], teen: [4690,4590,4490,4390], kids: [4490,4390,4290,4190] },
  svitsot_brush:                 { name: 'Свитшот (браш)',                        adult: [3790,3690,3590,3490], teen: [3490,3390,3290,3190], kids: [3290,3190,3090,2990] },
  vetrovka_niagara:              { name: 'Ветровка (ниагара)',                    adult: [4890,4790,4690,4590], teen: [4590,4490,4390,4290], kids: [4390,4290,4190,4090] },
  vetrovka_milki:                { name: 'Ветровка (милки)',                      adult: [4790,4690,4590,4490], teen: [4490,4390,4290,4190], kids: [4290,4190,4090,3990] },
  zhilet_niagara_s:              { name: 'Жилет (ниагара с синтепоном)',          adult: [4990,4890,4790,4690], teen: [4690,4590,4490,4390], kids: [4490,4390,4290,4190] },
  zhilet_milki_s:                { name: 'Жилет (милки с синтепоном)',            adult: [4890,4790,4690,4590], teen: [4590,4490,4390,4290], kids: [4390,4290,4190,4090] },
  zhilet_niagara_bez:            { name: 'Жилет (ниагара без синтепона)',         adult: [4490,4390,4290,4190], teen: [4190,4090,3990,3890], kids: [3990,3890,3790,3690] },
  zhilet_milki_bez:              { name: 'Жилет (милки без синтепона)',           adult: [4390,4290,4190,4090], teen: [4090,3990,3890,3790], kids: [3890,3790,3690,3590] },
  hokkejka:                      { name: 'Хоккейка (айс хоккей)',                 adult: [2990,2890,2790,2690], teen: [2890,2790,2690,2590], kids: [2790,2690,2590,2490] },
  futbolka_hlopok:               { name: 'Футболка (хлопок)',                     adult: [2490,2390,2290,2190], teen: [2390,2290,2190,2090], kids: [2290,2190,2090,1990] },
  shorty_hlopok:                 { name: 'Шорты (хлопок)',                        adult: [2490,2390,2290,2190], teen: [2390,2290,2190,2090], kids: [2290,2190,2090,1990] },
  kostyum_hlopok:                { name: 'Костюм (хлопок)',                       adult: [6590,6490,6390,6290], teen: [6490,6390,6290,6190], kids: [6390,6290,6190,6090] },
  svitsot_hlopok:                { name: 'Свитшот (хлопок)',                      adult: [3790,3690,3590,3490], teen: [3690,3590,3490,3390], kids: [3590,3490,3390,3290] },
  manishki:                      { name: 'Манишки нагрудные (ложная сетка)',      adult: [1790,1690,1590,1490], teen: [1690,1590,1490,1390], kids: [1590,1490,1390,1290] },
  beysbolka:                     { name: 'Бейсболка',                             adult: [990,890,790,690],     teen: [990,890,790,690],     kids: [990,890,790,690] },
  panama:                        { name: 'Панама',                                adult: [1190,1090,990,890],   teen: [1190,1090,990,890],   kids: [1190,1090,990,890] },
  flag:                          { name: 'Флаг (таффета)',                        adult: [1490,1390,1290,1190], teen: [1490,1390,1290,1190], kids: [1490,1390,1290,1190] },
  ryukzak:                       { name: 'Рюкзак-мешок (полиоксфорд)',            adult: [1190,1090,990,890],   teen: [1190,1090,990,890],   kids: [1190,1090,990,890] },
};

// Категории для фильтрации
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

const CATEGORY_MAP = {
  futbolka_lozhnaya_setka: 'tshirts',   futbolka_soty: 'tshirts',
  futbolka_polo_lozhnaya_setka: 'tshirts', futbolka_polo_soty: 'tshirts',
  longsleeve_lozhnaya_setka: 'tshirts', longsleeve_soty: 'tshirts',
  hokkejka: 'tshirts',
  shorty_lozhnaya_setka: 'bottoms',     shorty_soty: 'bottoms',
  shorty_niagara: 'bottoms',            bryuki_niagara: 'bottoms',
  komplekt_setka: 'sets',               komplekt_soty: 'sets',
  kostyum_niagara: 'sets',              kostyum_brush: 'sets',
  olimpijka_niagara: 'sets',
  bomber_brush: 'outerwear',            vetrovka_niagara: 'outerwear',
  vetrovka_milki: 'outerwear',          svitsot_brush: 'outerwear',
  zhilet_niagara_s: 'vests',            zhilet_milki_s: 'vests',
  zhilet_niagara_bez: 'vests',          zhilet_milki_bez: 'vests',
  futbolka_hlopok: 'cotton',            shorty_hlopok: 'cotton',
  kostyum_hlopok: 'cotton',             svitsot_hlopok: 'cotton',
  manishki: 'acc',  beysbolka: 'acc',   panama: 'acc',
  flag: 'acc',      ryukzak: 'acc',
};

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

export default function CustomOrder() {
  const [category, setCategory] = useState('all');
  const [selectedKey, setSelectedKey] = useState('futbolka_lozhnaya_setka');
  const [group, setGroup] = useState('adult');
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [showPriceTable, setShowPriceTable] = useState(false);

  const filteredProducts = useMemo(() => {
    return Object.entries(priceData).filter(([key]) =>
      category === 'all' || CATEGORY_MAP[key] === category
    );
  }, [category]);

  const product = priceData[selectedKey];
  const safeQty = Math.max(1, Number(qty) || 1);
  const priceIndex = getPriceIndex(safeQty);
  const unitPrice = product[group][priceIndex];
  const total = unitPrice * safeQty;
  const orderTotal = items.reduce((s, i) => s + i.total, 0);

  function addItem() {
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

  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

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

        {/* ── Hero ── */}
        <section className="co-hero">
          <div className="container">
            <div className="co-hero-inner">
              <div className="co-hero-text">
                <span className="co-hero-badge">Индивидуальный пошив</span>
                <h1>Заказ формы<br />для команды</h1>
                <p>Сублимационная печать, индивидуальный дизайн, любые тиражи. Цены из официального прайса 2026.</p>
                <div className="co-hero-pills">
                  <span>Сублимация</span>
                  <span>Ваш дизайн</span>
                  <span>от 1 шт</span>
                </div>
              </div>
              <div className="co-hero-contacts">
                <div className="co-contact-item">
                  <strong>Телефон</strong>
                  <a href="tel:+79990600075">+7 (999) 060-00-75</a>
                </div>
                <div className="co-contact-item">
                  <strong>Адрес</strong>
                  <span>г. Якутск, ул. Дежнева, 30</span>
                </div>
                <div className="co-contact-item">
                  <strong>Опыт</strong>
                  <span>более 10 лет на рынке</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Условия ── */}
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
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Калькулятор ── */}
        <section className="co-calc-section">
          <div className="container">
            <div className="co-calc-layout">

              {/* Левая часть — выбор товара */}
              <div className="co-calc-left">
                <h2>Рассчитать стоимость</h2>

                {/* Категории */}
                <div className="co-cats">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.key}
                      type="button"
                      className={`co-cat-btn${category === c.key ? ' active' : ''}`}
                      onClick={() => {
                        setCategory(c.key);
                        const first = Object.keys(priceData).find(k => c.key === 'all' || CATEGORY_MAP[k] === c.key);
                        if (first) setSelectedKey(first);
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Список товаров */}
                <div className="co-products">
                  {filteredProducts.map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      className={`co-product-btn${selectedKey === key ? ' active' : ''}`}
                      onClick={() => setSelectedKey(key)}
                    >
                      <span className="co-product-name">{p.name}</span>
                      <span className="co-product-price">от {fmt(p.adult[3])}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Правая часть — настройка */}
              <div className="co-calc-right">
                <div className="co-calc-card">
                  <h3>{product.name}</h3>

                  {/* Категория */}
                  <div className="co-field">
                    <label>Категория</label>
                    <div className="co-group-tabs">
                      {GROUPS.map(g => (
                        <button
                          key={g.key}
                          type="button"
                          className={`co-group-tab${group === g.key ? ' active' : ''}`}
                          onClick={() => setGroup(g.key)}
                        >
                          <strong>{g.label}</strong>
                          <small>{g.sizes}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Количество */}
                  <div className="co-field">
                    <label>Количество</label>
                    <div className="co-qty-row">
                      <button type="button" className="co-qty-btn" onClick={() => setQty(q => Math.max(1, Number(q)-1))}>−</button>
                      <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                        className="co-qty-input"
                      />
                      <button type="button" className="co-qty-btn" onClick={() => setQty(q => Number(q)+1)}>+</button>
                    </div>
                    <div className="co-tier-hints">
                      {TIERS.map((t, i) => (
                        <span key={i} className={`co-tier${priceIndex === i ? ' active' : ''}`}>{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Итог позиции */}
                  <div className="co-result">
                    <div className="co-result-row">
                      <span>Цена за 1 шт.</span>
                      <strong>{fmt(unitPrice)}</strong>
                    </div>
                    <div className="co-result-row total">
                      <span>Сумма позиции</span>
                      <strong>{fmt(total)}</strong>
                    </div>
                  </div>

                  {/* Таблица цен */}
                  <button
                    type="button"
                    className="co-toggle-table"
                    onClick={() => setShowPriceTable(p => !p)}
                  >
                    {showPriceTable ? '▲ Скрыть таблицу цен' : '▼ Показать таблицу цен'}
                  </button>

                  {showPriceTable && (
                    <div className="co-price-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Тираж</th>
                            {GROUPS.map(g => <th key={g.key}>{g.label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {TIERS.map((tier, i) => (
                            <tr key={i} className={priceIndex === i ? 'active-row' : ''}>
                              <td>{tier}</td>
                              {GROUPS.map(g => (
                                <td key={g.key}>{fmt(product[g.key][i])}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button type="button" className="co-add-btn" onClick={addItem}>
                    + Добавить в расчёт
                  </button>
                </div>
              </div>
            </div>

            {/* Список позиций */}
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
                  <span>Общая сумма</span>
                  <strong>{fmt(orderTotal)}</strong>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Форма заявки ── */}
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
                    placeholder="Позиции заказа"
                    readOnly
                    rows={Math.max(3, items.length + 1)}
                  />
                  {orderTotal > 0 && (
                    <input type="text" value={`Итого: ${fmt(orderTotal)}`} readOnly />
                  )}
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