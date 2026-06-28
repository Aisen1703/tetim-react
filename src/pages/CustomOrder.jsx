import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import MockupGallery from '../components/MockupGallery.jsx';

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
const MOCKUP_CATS = [
  { key: 'tshirts',   label: 'Футболки' },
  { key: 'suits',     label: 'Костюмы' },
  { key: 'bottoms',   label: 'Шорты / Брюки' },
  { key: 'outerwear', label: 'Верхняя одежда' },
  { key: 'vests',     label: 'Жилеты' },
  { key: 'acc',       label: 'Аксессуары' },
];

// ── Палитра ТЭТИМ (CMYK для печати) ──
const PALETTE = [
  { group: 'Красный',    colors: ['#9d3333','#d17777','#ab6565','#943030','#790102','#59121a','#3e171c','#381b1f'] },
  { group: 'Оранжевый',  colors: ['#bb5612','#cb9879','#b5764d','#bb621e','#b45c14','#a14d11','#924912','#8a450c'] },
  { group: 'Желтый',     colors: ['#d9da03','#d1c06e','#d1bd5c','#ccb21d','#c29212','#b48c13','#a86e0a','#996712'] },
  { group: 'Зеленый',    colors: ['#6ba840','#85b569','#84b355','#729e47','#60863b','#53792e','#395c18','#283d14'] },
  { group: 'Голубой',    colors: ['#7285ad','#98a4bc','#7a8aac','#536498','#3d4f81','#3c4d79','#2c3765','#2e3762'] },
  { group: 'Синий',      colors: ['#24326f','#27346b','#32316b','#373469','#363060','#2f2959','#272344','#1b2036'] },
  { group: 'Фиолетовый', colors: ['#57427a','#b398b9','#a385ab','#936f9b','#775180','#6b4375','#5d3965','#4c2e54'] },
  { group: 'Разные А',   colors: ['#83b39b','#699e84','#446e5a','#a26b35','#70461c','#9d9459','#706b43','#484f2e'] },
  { group: 'Разные Б',   colors: ['#874553','#d09da6','#d0a7ad','#885286','#411643','#8ea36b','#6c7c4b','#364b13'] },
  { group: 'Разные В',   colors: ['#e7e0cd','#ebeae5','#ffffff','#bcb2b1','#595e58','#3c413b','#2c2e2b','#0d0d0d'] },
];

function needsDarkText(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 140;
}

// Возвращает код цвета по палитре: "Красный-1", "Разные Б-3" и т.д.
function getColorCode(hex) {
  for (const row of PALETTE) {
    const idx = row.colors.indexOf(hex);
    if (idx !== -1) return `${row.group}-${idx + 1}`;
  }
  return hex;
}

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
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorToast, setColorToast] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sizeTableOpen, setSizeTableOpen] = useState(false);
  const [sizeTables, setSizeTables] = useState([]);
  const [sizeTableIndex, setSizeTableIndex] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/public/size-tables`)
      .then(r => r.json())
      .then(d => setSizeTables(d.tables || []))
      .catch(() => {});
  }, []);

  function toggleColor(hex, event) {
    const already = selectedColors.includes(hex);
    if (already) {
      setSelectedColors(prev => prev.filter(c => c !== hex));
      setColorToast(null);
    } else {
      if (selectedColors.length >= 6) return;
      setSelectedColors(prev => [...prev, hex]);
      // Показываем предупреждение рядом с курсором
      const rect = event.currentTarget.getBoundingClientRect();
      setColorToast({ hex, x: rect.left + rect.width / 2, y: rect.top - 8 });
      setTimeout(() => setColorToast(null), 2500);
    }
  }

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

        {/* ── Hero ── */}
        <section className="co-hero">
          <div className="co-hero-geo co-hero-geo--tl" />
          <div className="co-hero-geo co-hero-geo--br" />
          <div className="container co-hero-inner">
            <div className="co-hero-text">
              <div className="co-hero-badge">Индивидуальный пошив</div>
              <h1>Заказ формы<br />для команды</h1>
              <p>Сублимационная печать, индивидуальный дизайн, любые тиражи.<br />Цены из официального прайса 2026.</p>
              <div className="co-hero-pills">
                <span>Сублимация</span>
                <span>Ваш дизайн</span>
                <span>от 1 шт</span>
                <span>Более 10 лет на рынке</span>
              </div>
            </div>
            <div className="co-hero-contacts">
              <div className="co-contact-item">
                <span className="co-contact-label">Телефон</span>
                <a href="tel:+79990600075" className="co-contact-value">+7 (999) 060-00-75</a>
              </div>
              <div className="co-contact-divider" />
              <div className="co-contact-item">
                <span className="co-contact-label">Адрес</span>
                <span className="co-contact-value">г. Якутск, ул. Дежнева, 30</span>
              </div>
              <div className="co-contact-divider" />
              <div className="co-contact-item">
                <span className="co-contact-label">Email</span>
                <a href="mailto:tetim.ma5ahyyn@mail.ru" className="co-contact-value">tetim.ma5ahyyn@mail.ru</a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Условия ── */}
        <section className="co-rules">
          <div className="container">
            <h2 className="co-section-title">Условия работы</h2>
            <div className="co-rules-grid">
              {[
                ['01', '100% предоплата', 'Работаем только после полной оплаты заказа'],
                ['02', 'Логотип TETIM', 'На каждом изделии оставляем фирменный логотип'],
                ['03', 'Разработка дизайна', 'Макет создаём в порядке очереди после оформления'],
                ['04', 'Наши размеры', 'Все изделия шьём по собственной размерной таблице'],
                ['05', 'Время выдачи', 'Заказ готов в оговоренную дату с 10:00 до 20:00'],
              ].map(([num, title, text]) => (
                <div key={num} className="co-rule-card">
                  <span className="co-rule-num">{num}</span>
                  <strong className="co-rule-title">{title}</strong>
                  <p className="co-rule-text">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Калькулятор ── */}
        <section className="co-calc-section">
          <div className="container">
            <h2 className="co-section-title">Рассчитать стоимость</h2>

            {loading ? (
              <div className="co-loading">Загрузка прайса...</div>
            ) : (
              <div className="co-calc-layout">

                {/* Левая колонка — список товаров */}
                <div className="co-calc-left">
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

                  <div className="co-products-list">
                    {filteredProducts.map(p => (
                      <button key={p.key} type="button"
                        className={`co-product-row${selectedKey === p.key ? ' active' : ''}`}
                        onClick={() => setSelectedKey(p.key)}
                      >
                        <span className="co-product-name">{p.name}</span>
                        <span className="co-product-from">от {fmt(p.adult[3])}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Правая колонка — калькулятор */}
                {product && (
                  <div className="co-calc-right">
                    <div className="co-calc-card">
                      <div className="co-calc-card-header">
                        <div>
                          <h3>{product.name}</h3>
                          <span className="co-calc-sublabel">Сублимационная печать</span>
                        </div>
                        {sizeTables.filter(t => {
                          const cat = CATEGORIES.find(c => c.key === category);
                          return t.category === category;
                        }).length > 0 && (
                          <button type="button" className="co-sizetable-btn"
                            onClick={() => {
                              const idx = sizeTables.findIndex(t => t.category === category);
                              setSizeTableIndex(idx >= 0 ? idx : 0);
                              setSizeTableOpen(true);
                            }}
                          >
                            📐 Размерная таблица
                          </button>
                        )}
                      </div>

                      {/* Группа */}
                      <div className="co-field">
                        <label className="co-field-label">Категория покупателей</label>
                        <div className="co-group-tabs">
                          {GROUPS.map(g => (
                            <button key={g.key} type="button"
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
                        <label className="co-field-label">Количество</label>
                        <div className="co-qty-row">
                          <button type="button" className="co-qty-btn" onClick={() => setQty(q => Math.max(1, Number(q) - 1))}>−</button>
                          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="co-qty-input" />
                          <button type="button" className="co-qty-btn" onClick={() => setQty(q => Number(q) + 1)}>+</button>
                        </div>
                        <div className="co-tiers">
                          {TIERS.map((t, i) => (
                            <span key={i} className={`co-tier${priceIndex === i ? ' active' : ''}`}>{t}</span>
                          ))}
                        </div>
                      </div>

                      {/* Итог */}
                      <div className="co-result-box">
                        <div className="co-result-row">
                          <span>Цена за 1 шт.</span>
                          <strong>{fmt(unitPrice)}</strong>
                        </div>
                        <div className="co-result-row co-result-total">
                          <span>Сумма позиции</span>
                          <strong>{fmt(total)}</strong>
                        </div>
                      </div>

                      {/* Таблица цен */}
                      <button type="button" className="co-toggle-table" onClick={() => setShowPriceTable(p => !p)}>
                        {showPriceTable ? '▲ Скрыть таблицу цен' : '▼ Полная таблица цен'}
                      </button>

                      {showPriceTable && (
                        <div className="co-price-table-wrap">
                          <table className="co-price-table">
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
                                  {GROUPS.map(g => <td key={g.key}>{fmt(product[g.key][i])}</td>)}
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
                )}
              </div>
            )}

            {/* Выбранные позиции */}
            {items.length > 0 && (
              <div className="co-order-list">
                <h3 className="co-order-list-title">Выбранные позиции</h3>
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

        {/* ── Модальное окно размерной таблицы ── */}
        {sizeTableOpen && sizeTables.length > 0 && (
          <div className="co-palette-backdrop" onClick={() => setSizeTableOpen(false)}>
            <div className="co-sizetable-modal" onClick={e => e.stopPropagation()}>
              <div className="co-palette-modal-header">
                <div>
                  <h2>Размерная таблица</h2>
                  <p>{MOCKUP_CATS.find(c => c.key === sizeTables[sizeTableIndex]?.category)?.label || ''}</p>
                </div>
                <button type="button" className="co-palette-modal-close" onClick={() => setSizeTableOpen(false)}>×</button>
              </div>

              {/* Табы если несколько таблиц в категории */}
              {(() => {
                const catTables = sizeTables.filter(t => t.category === category);
                if (catTables.length > 1) return (
                  <div className="co-sizetable-tabs">
                    {catTables.map((t, i) => (
                      <button key={t.id} type="button"
                        className={`co-sizetable-tab${sizeTables[sizeTableIndex]?.id === t.id ? ' active' : ''}`}
                        onClick={() => setSizeTableIndex(sizeTables.indexOf(t))}
                      >
                        Таблица {i + 1}
                      </button>
                    ))}
                  </div>
                );
                return null;
              })()}

              <div className="co-sizetable-img-wrap">
                <img
                  src={sizeTables[sizeTableIndex]?.image_url?.startsWith('http')
                    ? sizeTables[sizeTableIndex].image_url
                    : `${API_URL}${sizeTables[sizeTableIndex]?.image_url}`}
                  alt="Размерная таблица"
                />
              </div>

              {/* Навигация если несколько таблиц */}
              {sizeTables.filter(t => t.category === category).length > 1 && (
                <div className="co-sizetable-nav">
                  <button type="button" onClick={() => {
                    const cats = sizeTables.filter(t => t.category === category);
                    const cur = cats.findIndex(t => t.id === sizeTables[sizeTableIndex]?.id);
                    const prev = cats[(cur - 1 + cats.length) % cats.length];
                    setSizeTableIndex(sizeTables.indexOf(prev));
                  }}>‹</button>
                  <span>{sizeTables.filter(t => t.category === category).findIndex(t => t.id === sizeTables[sizeTableIndex]?.id) + 1} / {sizeTables.filter(t => t.category === category).length}</span>
                  <button type="button" onClick={() => {
                    const cats = sizeTables.filter(t => t.category === category);
                    const cur = cats.findIndex(t => t.id === sizeTables[sizeTableIndex]?.id);
                    const next = cats[(cur + 1) % cats.length];
                    setSizeTableIndex(sizeTables.indexOf(next));
                  }}>›</button>
                </div>
              )}
            </div>
          </div>
        )}
        {paletteOpen && (
          <div className="co-palette-backdrop" onClick={() => setPaletteOpen(false)}>
            <div className="co-palette-modal" onClick={e => e.stopPropagation()}>
              <div className="co-palette-modal-header">
                <div>
                  <h2>Выберите цвета</h2>
                  <p>Палитра CMYK · до 6 цветов</p>
                </div>
                <button type="button" className="co-palette-modal-close" onClick={() => setPaletteOpen(false)}>×</button>
              </div>

              {selectedColors.length > 0 && (
                <div className="co-selected-colors">
                  <span className="co-selected-label">Выбрано:</span>
                  <div className="co-selected-swatches">
                    {selectedColors.map(hex => (
                      <button key={hex} type="button" className="co-selected-swatch"
                        style={{ background: hex }} title={getColorCode(hex)}
                        onClick={(e) => toggleColor(hex, e)}
                      >
                        <span style={{ color: needsDarkText(hex) ? '#111' : '#fff' }}>✕</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="co-clear-colors" onClick={() => setSelectedColors([])}>Сбросить</button>
                </div>
              )}

              <div className="co-palette-grid">
                <div className="co-palette-col-labels">
                  <div className="co-palette-corner" />
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <div key={n} className="co-palette-col-num">{n}</div>
                  ))}
                </div>
                {PALETTE.map(row => (
                  <div key={row.group} className="co-palette-row">
                    <div className="co-palette-row-label">{row.group}</div>
                    {row.colors.map((hex, ci) => {
                      const isSelected = selectedColors.includes(hex);
                      return (
                        <button key={ci} type="button"
                          className={`co-swatch${isSelected ? ' selected' : ''}`}
                          style={{ background: hex }}
                          title={`${row.group}-${ci + 1}`}
                          onClick={(e) => toggleColor(hex, e)}
                          aria-pressed={isSelected}
                        >
                          {isSelected && (
                            <span className="co-swatch-check" style={{ color: needsDarkText(hex) ? '#111' : '#fff' }}>✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <button type="button" className="co-palette-modal-done" onClick={() => setPaletteOpen(false)}>
                Готово {selectedColors.length > 0 && `(${selectedColors.length})`}
              </button>
            </div>

            {colorToast && (
              <div className="co-color-toast" style={{ left: colorToast.x, top: colorToast.y }}>
                <span className="co-color-toast-dot" style={{ background: colorToast.hex }} />
                ⚠ Оттенок на изделии может отличаться
              </div>
            )}
          </div>
        )}

        {/* ── Галерея примеров работ ── */}
        <MockupGallery activeCategoryKey={category} />

        {/* ── Форма заявки ── */}
        <section className="co-form-section">
          <div className="container">
            <div className="co-form-layout">
              <div className="co-form-card">
                <div className="co-form-card-header">
                  <h2>Оставить заявку</h2>
                  <p>Заполните форму — мы свяжемся с вами для уточнения деталей</p>
                </div>
                <form className="co-form" onSubmit={submit}>
                  <div className="co-form-row">
                    <label className="co-form-label">Ваше имя</label>
                    <input type="text" placeholder="Имя и фамилия" required />
                  </div>
                  <div className="co-form-row">
                    <label className="co-form-label">Телефон</label>
                    <input type="tel" placeholder="+7 (___) ___-__-__" required />
                  </div>
                  <div className="co-form-row">
                    <label className="co-form-label">Email</label>
                    <input type="email" placeholder="example@mail.ru" />
                  </div>
                  <div className="co-form-row">
                    <label className="co-form-label">Позиции заказа</label>
                    <textarea
                      value={items.map((it, i) =>
                        `${i + 1}. ${it.name} / ${it.groupLabel} / ${it.qty} шт. / ${fmt(it.unitPrice)} за шт. / итого ${fmt(it.total)}`
                      ).join('\n')}
                      placeholder="Используйте калькулятор выше для добавления позиций"
                      readOnly
                      rows={Math.max(3, items.length + 1)}
                    />
                  </div>
                  <div className="co-form-row">
                    <label className="co-form-label">Цвета изделия</label>
                    <button type="button" className="co-open-palette-btn" onClick={() => setPaletteOpen(true)}>
                      {selectedColors.length === 0 ? (
                        <span>Выбрать цвета из палитры →</span>
                      ) : (
                        <div className="co-open-palette-preview">
                          {selectedColors.map(hex => (
                            <span key={hex} className="co-open-palette-dot" style={{ background: hex }} />
                          ))}
                          <span className="co-open-palette-edit">Изменить →</span>
                        </div>
                      )}
                    </button>
                    {selectedColors.length > 0 && (
                      <div className="co-form-swatches">
                        {selectedColors.map(hex => (
                          <button key={hex} type="button" className="co-form-swatch"
                            title={`Убрать ${getColorCode(hex)}`}
                            onClick={(e) => toggleColor(hex, e)}
                          >
                            <div className="co-form-swatch-square" style={{ background: hex }}>
                              <span className="co-form-swatch-x" style={{ color: needsDarkText(hex) ? '#111' : '#fff' }}>✕</span>
                            </div>
                            <span className="co-form-swatch-label">{getColorCode(hex)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <input type="hidden" value={selectedColors.map(getColorCode).join(', ')} readOnly />
                  </div>
                  {orderTotal > 0 && (
                    <div className="co-form-total-row">
                      <span>Итого по расчёту:</span>
                      <strong>{fmt(orderTotal)}</strong>
                    </div>
                  )}
                  <div className="co-form-row">
                    <label className="co-form-label">Комментарий</label>
                    <textarea placeholder="Размеры, сроки, пожелания по дизайну..." rows={3} />
                  </div>
                  <button type="submit" className="co-submit-btn">Отправить заявку</button>
                </form>
                {message && <div className="co-message">{message}</div>}
              </div>

              {/* Боковая информация */}
              <div className="co-form-side">
                <div className="co-info-card co-info-card--dark">
                  <h3>Размерная сетка</h3>
                  <div className="co-sizes-table">
                    {GROUPS.map(g => (
                      <div key={g.key} className="co-sizes-row">
                        <span>{g.label}</span>
                        <strong>{g.sizes}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="co-info-card co-info-card--warn">
                  <strong>⚠ Важно</strong>
                  <p>Итоговая стоимость может меняться в зависимости от сложности дизайна, количества цветов и дополнительных услуг.</p>
                </div>

                <div className="co-info-card co-info-card--contacts">
                  <h3>Контакты</h3>
                  <a href="tel:+79990600075" className="co-info-phone">+7 (999) 060-00-75</a>
                  <a href="mailto:tetim.ma5ahyyn@mail.ru" className="co-info-email">tetim.ma5ahyyn@mail.ru</a>
                  <span className="co-info-address">г. Якутск, ул. Дежнева, 30</span>
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