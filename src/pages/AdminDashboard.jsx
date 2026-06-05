import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEFAULT_CATEGORIES = [];

const SIZES = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const EMPTY_PRODUCT = { external_id: '', article: '', name: '', category: 'accessories', price: '', sizes: '', stock: '', image_url: '', images: '', description: '' };
const DEFAULT_THEME = {
  site_title: 'TETIM', logo_url: '/assets/logo-full.png', logo_white_url: '/assets/logo-full-white.png',
  site_theme: 'auto', holiday_theme_enabled: '1', header_ornament_url: '', background_pattern_url: '',
  decor_image_url: '', snow_enabled: '0', instagram_url: '', whatsapp_url: '', social_extra_url: '',
  telegram_url: '', phone: '+7 999 060 00 75', email: 'info@tetim.ru', address: 'Якутск',
  footer_text: '© 2026 TETIM. Все права защищены.', hero_badge: 'Новая коллекция',
  hero_title: 'Одежда с характером Севера', hero_text: 'Создаём одежду для города, спорта и активной жизни.',
  hero_button_primary: 'Каталог', hero_button_secondary: 'Индивидуальный заказ',
  accent_color: '#111111', background_color: '#f4f0e8',
};
const ORDER_STATUSES = { new: 'Новый', processing: 'В работе', done: 'Выполнен', cancelled: 'Отменён' };
const STATUS_COLORS = { new: '#f59e0b', processing: '#3b82f6', done: '#10b981', cancelled: '#9ca3af' };

async function safeJson(r) { try { return await r.json(); } catch { return {}; } }
const getToken = () => localStorage.getItem('token') || '';
const getUser = () => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } };
const fmt = v => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;
function parseSizes(val) {
  const r = {}; SIZES.forEach(s => { r[s] = ''; });
  String(val || '').split(',').map(s => s.trim()).filter(Boolean).forEach(item => {
    const [sz, st] = item.split(':').map(p => p.trim());
    const s = sz?.toUpperCase();
    if (SIZES.includes(s)) r[s] = st || '';
  });
  return r;
}
function buildSizes(ss) { return SIZES.map(s => { const n = Number(ss[s]||0); return n>0?`${s}:${n}`:null; }).filter(Boolean).join(', '); }
function totalStock(ss) { return SIZES.reduce((sum,s) => sum+Number(ss[s]||0), 0); }
function getImg(url) { if (!url) return ''; if (url.startsWith('http')) return url; if (url.startsWith('/')) return `${API_URL}${url}`; return url; }
function slugify(text) { return text.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/gi,'').replace(/-+/g,'-'); }

export default function AdminDashboard() {
  const [tab, setTab] = useState('dashboard');
  const [token, setToken] = useState(getToken);
  const [user, setUser] = useState(getUser);
  const [navOpen, setNavOpen] = useState(true);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [slides, setSlides] = useState([]);
  const [themeSettings, setThemeSettings] = useState(DEFAULT_THEME);

  const [categories, setCategories] = useState(() => {
    try { const s = localStorage.getItem('tetim_cats'); return s ? JSON.parse(s) : DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; }
  });
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatValue, setNewCatValue] = useState('');

  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editProduct, setEditProduct] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [filterStock, setFilterStock] = useState('all');
  const [filterPublished, setFilterPublished] = useState('all');
  const [filterPrice, setFilterPrice] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [builderSection, setBuilderSection] = useState('hero');
  const [slideForm, setSlideForm] = useState({ title: '', image_url: '', media_type: 'image', sort_order: 0 });

  const [coProducts, setCoProducts] = useState([]);
  const [coForm, setCoForm] = useState({ key_name: '', name: '', category: 'tshirts', price_adult_1: '', price_adult_2: '', price_adult_3: '', price_adult_4: '', price_teen_1: '', price_teen_2: '', price_teen_3: '', price_teen_4: '', price_kids_1: '', price_kids_2: '', price_kids_3: '', price_kids_4: '', sort_order: 0 });
  const [editCoProduct, setEditCoProduct] = useState(null);

  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || token}` });
  const headers = getHeaders();

  useEffect(() => { if (token) loadAll(); }, [token]);
  useEffect(() => { localStorage.setItem('tetim_cats', JSON.stringify(categories)); }, [categories]);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

  async function req(url, opts = {}) {
    try {
      const r = await fetch(url, opts); const d = await safeJson(r);
      if ((r.status === 401 || r.status === 403) && (d.message?.toLowerCase().includes('token') || d.message?.toLowerCase().includes('токен'))) {
        localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(''); setUser(null);
      }
      return { r, d };
    } catch { return { r: { ok: false, status: 0 }, d: { message: 'Сервер недоступен' } }; }
  }

  async function loadAll() {
    const h = getHeaders();
    setLoading(true);
    const [p, o, c, sl, th, co] = await Promise.all([
      req(`${API_URL}/admin/products`, { headers: h }),
      req(`${API_URL}/admin/orders`, { headers: h }),
      req(`${API_URL}/admin/users`, { headers: h }),
      req(`${API_URL}/admin/slides`, { headers: h }),
      req(`${API_URL}/admin/settings`, { headers: h }),
      req(`${API_URL}/admin/custom-order-products`, { headers: h }),
    ]);
    if (p.r.ok) setProducts(p.d.products || []);
    if (o.r.ok) setOrders(o.d.orders || []);
    if (c.r.ok) setClients(c.d.users || []);
    if (sl.r.ok) setSlides(sl.d.slides || []);
    if (th.r.ok) setThemeSettings({ ...DEFAULT_THEME, ...(th.d.settings || {}) });
    if (co.r.ok) setCoProducts(co.d.products || []);
    setLoading(false);
  }

  async function uploadFile(file) {
    if (file.size > 64*1024*1024) throw new Error('Файл слишком большой. Максимум 64 МБ');
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch(`${API_URL}/admin/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || token}` }, body: fd });
    const d = await safeJson(r);
    if (!r.ok) throw new Error(d.message || 'Ошибка загрузки');
    if (!d.url) throw new Error('Сервер не вернул URL');
    return d;
  }

  async function handleUpload(e, setter, field = 'image_url') {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const d = await uploadFile(file); setter(p => ({ ...p, [field]: getImg(d.url) })); showToast('Файл загружен'); }
    catch (err) { showToast(err.message, 'error'); }
    finally { setUploading(false); e.target.value = ''; }
  }

  async function handleExtraPhotoUpload(e, setter) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const d = await uploadFile(file);
      const url = getImg(d.url);
      setter(p => {
        const existing = String(p.images || '').split(',').map(s => s.trim()).filter(Boolean);
        if (existing.length >= 4) { showToast('Максимум 4 дополнительных фото', 'error'); return p; }
        return { ...p, images: [...existing, url].join(', ') };
      });
      showToast('Фото добавлено');
    }
    catch (err) { showToast(err.message, 'error'); }
    finally { setUploading(false); e.target.value = ''; }
  }

  function removeExtraPhoto(url, setter) {
    setter(p => {
      const next = String(p.images || '').split(',').map(s => s.trim()).filter(s => s && s !== url);
      return { ...p, images: next.join(', ') };
    });
  }

  function updateSize(sz, val, mode = 'create') {
    if (mode === 'edit') { const n = { ...parseSizes(editProduct.sizes), [sz]: val }; setEditProduct(p => ({ ...p, sizes: buildSizes(n), stock: totalStock(n) })); }
    else { const n = { ...parseSizes(productForm.sizes), [sz]: val }; setProductForm(p => ({ ...p, sizes: buildSizes(n), stock: totalStock(n) })); }
  }

  async function createProduct(e) {
    e.preventDefault();
    const { r, d } = await req(`${API_URL}/admin/products`, { method: 'POST', headers, body: JSON.stringify({ ...productForm, price: Number(productForm.price)||0, stock: Number(productForm.stock)||0 }) });
    if (!r.ok) { showToast(d.message || 'Ошибка', 'error'); return; }
    showToast('Товар добавлен'); setProductForm(EMPTY_PRODUCT);
    const { r: r2, d: d2 } = await req(`${API_URL}/admin/products`, { headers: getHeaders() });
    if (r2.ok) setProducts(d2.products || []);
  }

  async function saveEdit(e) {
    e.preventDefault();
    const { r, d } = await req(`${API_URL}/admin/products/${editProduct.id}`, { method: 'PATCH', headers, body: JSON.stringify({ ...editProduct, price: Number(editProduct.price)||0, stock: Number(editProduct.stock)||0 }) });
    if (!r.ok) { showToast(d.message || 'Ошибка', 'error'); return; }
    showToast('Сохранено'); setEditProduct(null);
    const { r: r2, d: d2 } = await req(`${API_URL}/admin/products`, { headers: getHeaders() });
    if (r2.ok) setProducts(d2.products || []);
  }

  async function togglePublish(p) {
    const ep = Number(p.is_published) === 1 ? 'unpublish' : 'publish';
    const { r, d } = await req(`${API_URL}/admin/products/${p.id}/${ep}`, { method: 'PATCH', headers });
    if (!r.ok) { showToast(d.message || 'Ошибка', 'error'); return; }
    showToast(ep === 'publish' ? 'Опубликован' : 'Снят');
    const { r: r2, d: d2 } = await req(`${API_URL}/admin/products`, { headers: getHeaders() });
    if (r2.ok) setProducts(d2.products || []);
  }

  async function deleteProduct(id) {
    const { r, d } = await req(`${API_URL}/admin/products/${id}`, { method: 'DELETE', headers });
    if (!r.ok) { showToast(d.message || 'Ошибка', 'error'); return; }
    showToast('Удалён'); setConfirm(null);
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  async function importExcel(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch(`${API_URL}/admin/products/import`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || token}` }, body: fd });
      const d = await safeJson(r);
      if (!r.ok) { showToast(d.message || 'Ошибка', 'error'); return; }
      showToast(`Импорт: +${d.created||0} новых, ${d.updated||0} обновлено`);
      const { r: r2, d: d2 } = await req(`${API_URL}/admin/products`, { headers: getHeaders() });
      if (r2.ok) setProducts(d2.products || []);
    } catch { showToast('Ошибка импорта', 'error'); }
    finally { e.target.value = ''; }
  }

  async function updateOrderStatus(id, status) {
    const { r, d } = await req(`${API_URL}/admin/orders/${id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
    if (!r.ok) { showToast(d.message || 'Ошибка', 'error'); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    showToast('Статус обновлён');
  }

  async function createSlide(e) {
    e.preventDefault();
    if (!slideForm.image_url) { showToast('Загрузите файл', 'error'); return; }
    const { r, d } = await req(`${API_URL}/admin/slides`, { method: 'POST', headers, body: JSON.stringify(slideForm) });
    if (!r.ok) { showToast(d.message || 'Ошибка', 'error'); return; }
    showToast('Слайд добавлен'); setSlideForm({ title: '', image_url: '', media_type: 'image', sort_order: 0 });
    const { r: r2, d: d2 } = await req(`${API_URL}/admin/slides`, { headers: getHeaders() });
    if (r2.ok) setSlides(d2.slides || []);
  }

  async function deleteSlide(id) {
    const { r, d } = await req(`${API_URL}/admin/slides/${id}`, { method: 'DELETE', headers });
    if (!r.ok) { showToast(d.message || 'Ошибка', 'error'); return; }
    showToast('Слайд удалён'); setConfirm(null);
    setSlides(prev => prev.filter(s => s.id !== id));
  }

  async function saveTheme() {
    setSavingTheme(true);
    const { r, d } = await req(`${API_URL}/admin/settings`, { method: 'PATCH', headers, body: JSON.stringify({ settings: themeSettings }) });
    setSavingTheme(false);
    if (!r.ok) { showToast(d.message || 'Ошибка', 'error'); return; }
    showToast('Настройки сохранены ✓');
  }

  function addCategory() {
    const label = newCatLabel.trim();
    if (!label) { showToast('Введите название', 'error'); return; }
    const value = newCatValue.trim() || slugify(label);
    if (categories.find(c => c.value === value)) { showToast('Такая категория уже есть', 'error'); return; }
    setCategories(prev => [...prev, { value, label }]);
    setNewCatLabel(''); setNewCatValue('');
    showToast(`Категория "${label}" добавлена`);
  }

  function deleteCategory(value) {
    setCategories(prev => prev.filter(c => c.value !== value));
    showToast('Категория удалена');
  }

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(''); setUser(null); };

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter(p => {
      if (q && !String(p.name||'').toLowerCase().includes(q) && !String(p.article||'').toLowerCase().includes(q) && !String(p.external_id||'').toLowerCase().includes(q)) return false;
      if (filterStock === 'instock' && Number(p.stock||0) <= 0) return false;
      if (filterStock === 'zero' && Number(p.stock||0) > 0) return false;
      if (filterPublished === 'published' && Number(p.is_published) !== 1) return false;
      if (filterPublished === 'draft' && Number(p.is_published) === 1) return false;
      if (filterPrice === 'withprice' && Number(p.price||0) <= 0) return false;
      if (filterPrice === 'noprice' && Number(p.price||0) > 0) return false;
      return true;
    });
  }, [products, productSearch, filterStock, filterPublished, filterPrice]);

  const toggleSelect = (id) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const selectAll = () => setSelectedIds(new Set(filteredProducts.map(p => p.id)));
  const selectNone = () => setSelectedIds(new Set());
  const allSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));

  async function bulkPublish(publish) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const ep = publish ? 'publish' : 'unpublish';
    await Promise.all(ids.map(id => req(`${API_URL}/admin/products/${id}/${ep}`, { method: 'PATCH', headers })));
    showToast(publish ? `Опубликовано: ${ids.length}` : `Снято: ${ids.length}`);
    setSelectedIds(new Set());
    const { r, d } = await req(`${API_URL}/admin/products`, { headers: getHeaders() });
    if (r.ok) setProducts(d.products || []);
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    await Promise.all(ids.map(id => req(`${API_URL}/admin/products/${id}`, { method: 'DELETE', headers })));
    showToast(`Удалено: ${ids.length}`);
    setSelectedIds(new Set());
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
    setConfirm(null);
  }

  async function bulkSetCategory(category) {
    const ids = [...selectedIds];
    if (!ids.length || !category) return;
    await Promise.all(ids.map(id => req(`${API_URL}/admin/products/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ category }) })));
    showToast(`Категория изменена: ${ids.length} товаров`);
    setSelectedIds(new Set());
    const { r, d } = await req(`${API_URL}/admin/products`, { headers: getHeaders() });
    if (r.ok) setProducts(d.products || []);
  }

  const stats = useMemo(() => ({
    total: products.length,
    published: products.filter(p => Number(p.is_published)===1).length,
    drafts: products.filter(p => Number(p.is_published)!==1).length,
    newOrders: orders.filter(o => o.status==='new').length,
    revenue: orders.filter(o => o.status!=='cancelled').reduce((s,o) => s+Number(o.total_amount||0), 0),
  }), [products, orders]);

  const getCatLabel = v => categories.find(c => c.value===v)?.label || v || '—';
  const pf = parseSizes(productForm.sizes);
  const ef = editProduct ? parseSizes(editProduct.sizes) : {};

  const BUILDER_SECTIONS = [
    { key: 'hero',  label: 'Главный экран' },
    { key: 'contacts',  label: 'Контакты' },
    { key: 'socials',  label: 'Соцсети' },
    { key: 'appearance', label: 'Оформление' },
    { key: 'logo',  label: 'Логотип' },
    { key: 'footer',  label: 'Подвал' },
    { key: 'slides',  label: 'Слайды' },
    { key: 'categories',  label: 'Категории' },
  ];

  if (!token || !user) return (
    <div className="ad-gate">
      <div className="ad-gate-box">
        <span className="ad-gate-logo">◈ TETIM</span>
        <p>Войдите для доступа к панели управления</p>
        <Link to="/" className="ad-gate-btn">← На сайт</Link>
      </div>
    </div>
  );

  return (
    <div className={`ad-root${navOpen ? '' : ' ad-root--narrow'}`}>

      {toast && <div className={`ad-toast${toast.type==='error'?' ad-toast--err':''}`}>{toast.type==='error'?'✕':'✓'} {toast.text}</div>}
      {uploading && <div className="ad-veil"><div className="ad-veil-box"><div className="ad-spinner" /><span>Загружаем...</span></div></div>}

      {/* Sidebar */}
      <aside className="ad-sidebar">
        <button type="button" className="ad-brand" onClick={() => setNavOpen(p => !p)}>
          <span>◈</span>{navOpen && <strong>TETIM</strong>}
        </button>
        <nav className="ad-nav">
          {[
            { key: 'dashboard', icon: '⬡', label: 'Обзор' },
            { key: 'products',  icon: '▤',  label: 'Товары' },
            { key: 'orders',    icon: '◎',  label: 'Заказы' },
            { key: 'clients',   icon: '⊙',  label: 'Клиенты' },
            { key: 'categories',icon: '◈',  label: 'Категории' },
            { key: 'custom-order', icon: '✦', label: 'Инд. заказ' },
            { key: 'builder',   icon: '⬕',  label: 'Конструктор' },
          ].map(n => (
            <button key={n.key} type="button" className={`ad-nav-item${tab===n.key?' --on':''}`} onClick={() => setTab(n.key)} title={n.label}>
              <span className="ad-nav-ic">{n.icon}</span>
              {navOpen && <span className="ad-nav-lbl">{n.label}</span>}
              {n.key==='orders' && stats.newOrders>0 && <span className="ad-nav-dot">{stats.newOrders}</span>}
            </button>
          ))}
        </nav>
        <div className="ad-sidebar-foot">
          <a href="/" target="_blank" rel="noreferrer" className="ad-nav-item" title="Открыть сайт">
            <span className="ad-nav-ic">↗</span>{navOpen && <span className="ad-nav-lbl">Открыть сайт</span>}
          </a>
          <button type="button" className="ad-nav-item ad-nav-item--out" onClick={logout} title="Выйти">
            <span className="ad-nav-ic">⏻</span>{navOpen && <span className="ad-nav-lbl">Выйти</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ad-main">

        {/* ОБЗОР */}
        {tab === 'dashboard' && (
          <section className="ad-page">
            <header className="ad-page-hd">
              <div>
                <h1>Привет{user?.name ? `, ${user.name}` : ''} 👋</h1>
                <p>{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <button type="button" className="ad-btn-refresh" onClick={loadAll} disabled={loading}>{loading ? '↻' : '↺'} Обновить</button>
            </header>
            <div className="ad-kpi-row">
              {[
                { l: 'Товаров',  v: stats.total,          c: '#818cf8' },
                { l: 'Опубл.',   v: stats.published,       c: '#34d399' },
                { l: 'Черн.',    v: stats.drafts,           c: '#fbbf24' },
                { l: 'Заказы',   v: stats.newOrders,        c: '#f87171' },
                { l: 'Выручка',  v: fmt(stats.revenue),     c: '#a78bfa' },
              ].map((k, i) => (
                <div key={i} className="ad-kpi" style={{ '--c': k.c }}>
                  <span>{k.l}</span><strong>{k.v}</strong>
                </div>
              ))}
            </div>
            <div className="ad-dash-grid">
              <div className="ad-card">
                <div className="ad-card-hd"><h2>Последние заказы</h2><button type="button" className="ad-link" onClick={() => setTab('orders')}>Все →</button></div>
                {orders.length === 0 ? <div className="ad-nil">Заказов пока нет</div> :
                  orders.slice(0,5).map(o => (
                    <div key={o.id} className="ad-row">
                      <div><strong>#{o.id} {o.customer_name}</strong><span>{o.phone}</span></div>
                      <div className="ad-row-r">
                        <span className="ad-status" style={{ '--sc': STATUS_COLORS[o.status] }}>{ORDER_STATUSES[o.status]||o.status}</span>
                        <strong>{fmt(o.total_amount)}</strong>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="ad-card">
                <div className="ad-card-hd"><h2>Последние товары</h2><button type="button" className="ad-link" onClick={() => setTab('products')}>Все →</button></div>
                {products.length === 0 ? <div className="ad-nil">Товаров пока нет</div> :
                  products.slice(0,5).map(p => (
                    <div key={p.id} className="ad-row">
                      <div className="ad-row-img">{p.image_url ? <img src={getImg(p.image_url)} alt="" /> : <span>—</span>}</div>
                      <div><strong>{p.name}</strong><span>{getCatLabel(p.category)}</span></div>
                      <div className="ad-row-r">
                        <span className={`ad-pill ${Number(p.is_published)?'ad-pill--g':'ad-pill--gr'}`}>{Number(p.is_published)?'Опубл.':'Черн.'}</span>
                        <strong>{fmt(p.price)}</strong>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </section>
        )}

        {/* ТОВАРЫ */}
        {tab === 'products' && (
          <section className="ad-page">
            <header className="ad-page-hd">
              <div><h1>Товары</h1><p>{stats.total} всего · {stats.published} опубликовано</p></div>
            </header>
            <div className="ad-split">
              <div className="ad-card">
                <h2 className="ad-card-title">Добавить товар</h2>
                <label className="ad-drop">
                  <span>⬆</span><strong>Импорт Excel / CSV</strong><small>.xlsx .xls .csv .ods</small>
                  <input type="file" accept=".xlsx,.xls,.csv,.ods" onChange={importExcel} style={{ display: 'none' }} />
                </label>
                <form onSubmit={createProduct} className="ad-form">
                  <div className="ad-form-2">
                    <input value={productForm.external_id} onChange={e => setProductForm(p => ({...p, external_id: e.target.value}))} placeholder="ID из 1С" />
                    <input value={productForm.article} onChange={e => setProductForm(p => ({...p, article: e.target.value}))} placeholder="Артикул" />
                  </div>
                  <input value={productForm.name} onChange={e => setProductForm(p => ({...p, name: e.target.value}))} placeholder="Название *" required />
                  <select value={productForm.category} onChange={e => setProductForm(p => ({...p, category: e.target.value}))}>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <input value={productForm.price} onChange={e => setProductForm(p => ({...p, price: e.target.value}))} placeholder="Цена ₽" type="number" min="0" />
                  <div className="ad-sizes">
                    <span className="ad-sizes-lbl">Остатки по размерам</span>
                    <div className="ad-sizes-grid">
                      {SIZES.map(s => (
                        <label key={s} className="ad-sz"><span>{s}</span>
                          <input type="number" min="0" value={pf[s]} onChange={e => updateSize(s, e.target.value)} placeholder="0" />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="ad-photo">
                    <span className="ad-sizes-lbl">Главное фото</span>
                    {productForm.image_url && <img src={productForm.image_url} alt="" className="ad-thumb" />}
                    <label className="ad-upload-btn">↑ Загрузить фото
                      <input type="file" accept="image/*" onChange={e => handleUpload(e, setProductForm)} disabled={uploading} style={{ display: 'none' }} />
                    </label>
                    <input value={productForm.image_url} onChange={e => setProductForm(p => ({...p, image_url: e.target.value}))} placeholder="или ссылка на фото" />
                  </div>
                  <div className="ad-photo">
                    <span className="ad-sizes-lbl">Дополнительные фото (до 4)</span>
                    <div className="ad-extra-photos">
                      {String(productForm.images || '').split(',').map(s => s.trim()).filter(Boolean).map((url, i) => (
                        <div key={i} className="ad-extra-photo-item">
                          <img src={url} alt="" />
                          <button type="button" className="ad-extra-photo-del" onClick={() => removeExtraPhoto(url, setProductForm)}>✕</button>
                        </div>
                      ))}
                      {String(productForm.images || '').split(',').filter(s => s.trim()).length < 4 && (
                        <label className="ad-extra-photo-add">
                          <span>+</span>
                          <input type="file" accept="image/*" onChange={e => handleExtraPhotoUpload(e, setProductForm)} disabled={uploading} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                  </div>
                  <textarea value={productForm.description} onChange={e => setProductForm(p => ({...p, description: e.target.value}))} placeholder="Описание" rows={3} />
                  <button type="submit" className="ad-btn-primary" disabled={uploading}>+ Добавить товар</button>
                </form>
              </div>
              <div className="ad-card ad-card--wide">
                <div className="ad-card-hd">
                  <h2 className="ad-card-title">Список товаров</h2>
                  <input className="ad-search" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Поиск..." />
                </div>
                <div className="ad-filters">
                  <select className="ad-filter-sel" value={filterStock} onChange={e => setFilterStock(e.target.value)}>
                    <option value="all">Все остатки</option>
                    <option value="instock">Есть в наличии</option>
                    <option value="zero">Нет в наличии</option>
                  </select>
                  <select className="ad-filter-sel" value={filterPublished} onChange={e => setFilterPublished(e.target.value)}>
                    <option value="all">Все статусы</option>
                    <option value="published">Опубликованные</option>
                    <option value="draft">Черновики</option>
                  </select>
                  <select className="ad-filter-sel" value={filterPrice} onChange={e => setFilterPrice(e.target.value)}>
                    <option value="all">Все цены</option>
                    <option value="withprice">С ценой</option>
                    <option value="noprice">Без цены</option>
                  </select>
                  {(filterStock !== 'all' || filterPublished !== 'all' || filterPrice !== 'all' || productSearch) && (
                    <button type="button" className="ad-filter-reset" onClick={() => { setFilterStock('all'); setFilterPublished('all'); setFilterPrice('all'); setProductSearch(''); }}>✕ Сбросить</button>
                  )}
                  <span className="ad-filter-count">{filteredProducts.length} из {products.length}</span>
                </div>
                {selectedIds.size > 0 && (
                  <div className="ad-bulk-bar">
                    <span className="ad-bulk-count">Выбрано: {selectedIds.size}</span>
                    <button type="button" className="ad-btn-sm" onClick={() => bulkPublish(true)}>↑ Опубликовать</button>
                    <button type="button" className="ad-btn-sm" onClick={() => bulkPublish(false)}>↓ Снять</button>
                    <select className="ad-filter-sel" defaultValue="" onChange={e => { if (e.target.value) { bulkSetCategory(e.target.value); e.target.value = ''; } }}>
                      <option value="" disabled>Сменить категорию...</option>
                      {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <button type="button" className="ad-btn-sm ad-btn-sm--del" onClick={() => setConfirm({ title: `Удалить ${selectedIds.size} товаров?`, text: 'Это действие нельзя отменить', onConfirm: async () => { await bulkDelete(); } })}>✕ Удалить</button>
                    <button type="button" className="ad-filter-reset" onClick={selectNone}>Отменить выбор</button>
                  </div>
                )}
                {filteredProducts.length === 0 ? <div className="ad-nil">Товаров пока нет</div> :
                  <div className="ad-prod-list">
                    <div className="ad-prod-row ad-prod-row--header">
                      <label className="ad-checkbox">
                        <input type="checkbox" checked={allSelected} onChange={() => allSelected ? selectNone() : selectAll()} />
                        <span>{allSelected ? 'Снять всё' : 'Выбрать всё'}</span>
                      </label>
                    </div>
                    {filteredProducts.map(p => (
                      <div key={p.id} className={`ad-prod-row${selectedIds.has(p.id) ? ' ad-prod-row--selected' : ''}`}>
                        <label className="ad-checkbox ad-checkbox--only">
                          <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                        </label>
                        <div className="ad-prod-pic">{p.image_url ? <img src={getImg(p.image_url)} alt={p.name} /> : <span>—</span>}</div>
                        <div className="ad-prod-info">
                          <strong>{p.name}</strong>
                          <span>{getCatLabel(p.category)} · {p.article||'нет арт.'}</span>
                          <span>{p.sizes||'нет размеров'} · ост. {p.stock||0}</span>
                        </div>
                        <div className="ad-prod-meta">
                          <strong>{fmt(p.price)}</strong>
                          <span className={`ad-pill ${Number(p.is_published)?'ad-pill--g':'ad-pill--gr'}`}>{Number(p.is_published)?'Опубликован':'Черновик'}</span>
                        </div>
                        <div className="ad-prod-acts">
                          <button type="button" className="ad-btn-sm" onClick={() => togglePublish(p)}>{Number(p.is_published)?'↓ Снять':'↑ Опубл.'}</button>
                          <button type="button" className="ad-btn-sm" onClick={() => setEditProduct({...p, image_url: getImg(p.image_url||'')})}>✎</button>
                          <button type="button" className="ad-btn-sm ad-btn-sm--del" onClick={() => setConfirm({ title: 'Удалить товар?', text: p.name, onConfirm: () => deleteProduct(p.id) })}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            </div>
          </section>
        )}

        {/* ЗАКАЗЫ */}
        {tab === 'orders' && (
          <section className="ad-page">
            <header className="ad-page-hd"><div><h1>Заказы</h1><p>{orders.length} всего · {stats.newOrders} новых</p></div></header>
            <div className="ad-card">
              {orders.length === 0 ? <div className="ad-nil">Заказов пока нет</div> :
                <div className="ad-order-list">
                  {orders.map(o => (
                    <div key={o.id} className="ad-order-row">
                      <div className="ad-order-num">#{o.id}</div>
                      <div className="ad-order-info">
                        <strong>{o.customer_name}</strong>
                        <span>{o.phone}{o.email?` · ${o.email}`:''}</span>
                        {o.address && <span>{o.address}</span>}
                        {o.created_at && <span>{new Date(o.created_at).toLocaleString('ru-RU')}</span>}
                      </div>
                      <strong className="ad-order-sum">{fmt(o.total_amount)}</strong>
                      <select className="ad-order-sel" value={o.status} style={{ '--sc': STATUS_COLORS[o.status] }} onChange={e => updateOrderStatus(o.id, e.target.value)}>
                        {Object.entries(ORDER_STATUSES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              }
            </div>
          </section>
        )}

        {/* КЛИЕНТЫ */}
        {tab === 'clients' && (
          <section className="ad-page">
            <header className="ad-page-hd"><div><h1>Клиенты</h1><p>{clients.length} зарегистрировано</p></div></header>
            <div className="ad-card">
              {clients.length === 0 ? <div className="ad-nil">Клиентов пока нет</div> :
                <div className="ad-client-list">
                  {clients.map(c => (
                    <div key={c.id} className="ad-client-row">
                      <div className="ad-client-av">{(c.name||'?')[0].toUpperCase()}</div>
                      <div className="ad-client-info"><strong>{c.name}</strong><span>{c.email}</span>{c.phone&&<span>{c.phone}</span>}</div>
                      <span className={`ad-pill ${c.role==='admin'?'ad-pill--p':'ad-pill--gr'}`}>{c.role}</span>
                    </div>
                  ))}
                </div>
              }
            </div>
          </section>
        )}

        {/* КОНСТРУКТОР */}
        {/* КАТЕГОРИИ */}
        {tab === 'categories' && (
          <section className="ad-page">
            <header className="ad-page-hd">
              <div>
                <h1>Категории каталога</h1>
                <p>{categories.length} категорий · отображаются в каталоге и формах товаров</p>
              </div>
            </header>
            <div className="ad-two-col">
              {/* Добавить */}
              <div className="ad-card ad-form-card">
                <h2>Добавить категорию</h2>
                <div className="ad-form">
                  <div>
                    <label className="ad-field-lbl">Название *</label>
                    <input value={newCatLabel} onChange={e => { setNewCatLabel(e.target.value); setNewCatValue(slugify(e.target.value)); }} placeholder="Спортивные костюмы" />
                  </div>
                  <div>
                    <label className="ad-field-lbl">Ключ (slug)</label>
                    <input value={newCatValue} onChange={e => setNewCatValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="sportivnye-kostyumy" />
                    <small className="ad-field-hint">Только a-z, 0-9, дефис. Используется в URL каталога.</small>
                  </div>
                  <button type="button" className="ad-btn-primary" onClick={addCategory}>+ Добавить категорию</button>
                </div>
              </div>

              {/* Список */}
              <div className="ad-card">
                <div className="ad-card-hd">
                  <h2>Все категории</h2>
                  <span className="ad-cat-total">{categories.length}</span>
                </div>
                <div className="ad-cat-list">
                  {categories.map(c => (
                    <div key={c.value} className="ad-cat-item">
                      <div className="ad-cat-info">
                        <strong>{c.label}</strong>
                        <code className="ad-cat-slug">{c.value}</code>
                      </div>
                      <span className="ad-cat-count">{products.filter(p => p.category === c.value).length} товаров</span>
                      <button type="button" className="ad-cat-del" onClick={() => setConfirm({ title: 'Удалить категорию?', text: `"${c.label}" — товары останутся, категория исчезнет из списка`, onConfirm: () => deleteCategory(c.value) })}>✕</button>
                    </div>
                  ))}
                </div>
                <div className="ad-cat-footer">
                  <small>Категории хранятся в браузере и сразу отображаются в каталоге</small>
                  <button type="button" className="ad-link" onClick={() => { setCategories(DEFAULT_CATEGORIES); showToast('Сброшено к стандартным'); }}>Сбросить к стандартным</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ИНДИВИДУАЛЬНЫЙ ЗАКАЗ */}
        {tab === 'custom-order' && (
          <section className="ad-page">
            <header className="ad-page-hd">
              <div><h1>Индивидуальный заказ</h1><p>Прайс-лист товаров для калькулятора</p></div>
            </header>
            <div className="ad-split">
              {/* Форма добавления */}
              <div className="ad-card">
                <h2 className="ad-card-title">{editCoProduct ? 'Редактировать позицию' : 'Добавить позицию'}</h2>
                <div className="ad-form">
                  <input value={editCoProduct ? editCoProduct.name : coForm.name}
                    onChange={e => editCoProduct ? setEditCoProduct(p=>({...p,name:e.target.value})) : setCoForm(p=>({...p,name:e.target.value}))}
                    placeholder="Название *" />
                  <select value={editCoProduct ? editCoProduct.category : coForm.category}
                    onChange={e => editCoProduct ? setEditCoProduct(p=>({...p,category:e.target.value})) : setCoForm(p=>({...p,category:e.target.value}))}>
                    <option value="tshirts">Футболки</option>
                    <option value="bottoms">Шорты / Брюки</option>
                    <option value="sets">Комплекты</option>
                    <option value="outerwear">Верхняя одежда</option>
                    <option value="vests">Жилеты</option>
                    <option value="cotton">Хлопок</option>
                    <option value="acc">Аксессуары</option>
                  </select>

                  {/* Цены взрослые */}
                  <div className="ad-sizes-lbl">Взрослые (1-9 / 10-29 / 30-49 / от 50)</div>
                  <div className="ad-form-2">
                    {['price_adult_1','price_adult_2','price_adult_3','price_adult_4'].map((f,i) => (
                      <input key={f} type="number" placeholder={`Тариф ${i+1}`}
                        value={editCoProduct ? editCoProduct[f]||'' : coForm[f]}
                        onChange={e => editCoProduct ? setEditCoProduct(p=>({...p,[f]:e.target.value})) : setCoForm(p=>({...p,[f]:e.target.value}))} />
                    ))}
                  </div>
                  <div className="ad-sizes-lbl">Подростки</div>
                  <div className="ad-form-2">
                    {['price_teen_1','price_teen_2','price_teen_3','price_teen_4'].map((f,i) => (
                      <input key={f} type="number" placeholder={`Тариф ${i+1}`}
                        value={editCoProduct ? editCoProduct[f]||'' : coForm[f]}
                        onChange={e => editCoProduct ? setEditCoProduct(p=>({...p,[f]:e.target.value})) : setCoForm(p=>({...p,[f]:e.target.value}))} />
                    ))}
                  </div>
                  <div className="ad-sizes-lbl">Детские</div>
                  <div className="ad-form-2">
                    {['price_kids_1','price_kids_2','price_kids_3','price_kids_4'].map((f,i) => (
                      <input key={f} type="number" placeholder={`Тариф ${i+1}`}
                        value={editCoProduct ? editCoProduct[f]||'' : coForm[f]}
                        onChange={e => editCoProduct ? setEditCoProduct(p=>({...p,[f]:e.target.value})) : setCoForm(p=>({...p,[f]:e.target.value}))} />
                    ))}
                  </div>

                  {editCoProduct ? (
                    <div style={{display:'flex',gap:10}}>
                      <button type="button" className="ad-btn-primary" style={{flex:1}} onClick={async () => {
                        const {r,d} = await req(`${API_URL}/admin/custom-order-products/${editCoProduct.id}`, {method:'PATCH',headers,body:JSON.stringify(editCoProduct)});
                        if (!r.ok) { showToast(d.message||'Ошибка','error'); return; }
                        showToast('Сохранено'); setEditCoProduct(null);
                        const {r:r2,d:d2} = await req(`${API_URL}/admin/custom-order-products`, { headers: getHeaders() });
                        if (r2.ok) setCoProducts(d2.products||[]);
                      }}>Сохранить</button>
                      <button type="button" className="ad-btn-ghost" onClick={() => setEditCoProduct(null)}>Отмена</button>
                    </div>
                  ) : (
                    <button type="button" className="ad-btn-primary" onClick={async () => {
                      if (!coForm.name) { showToast('Введите название','error'); return; }
                      const key = coForm.key_name || coForm.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-zа-я0-9-]/gi,'');
                      const {r,d} = await req(`${API_URL}/admin/custom-order-products`, {method:'POST',headers,body:JSON.stringify({...coForm,key_name:key})});
                      if (!r.ok) { showToast(d.message||'Ошибка','error'); return; }
                      showToast('Добавлено');
                      setCoForm({key_name:'',name:'',category:'tshirts',price_adult_1:'',price_adult_2:'',price_adult_3:'',price_adult_4:'',price_teen_1:'',price_teen_2:'',price_teen_3:'',price_teen_4:'',price_kids_1:'',price_kids_2:'',price_kids_3:'',price_kids_4:'',sort_order:0});
                      const {r:r2,d:d2} = await req(`${API_URL}/admin/custom-order-products`, { headers: getHeaders() });
                      if (r2.ok) setCoProducts(d2.products||[]);
                    }}>+ Добавить позицию</button>
                  )}
                </div>
              </div>

              {/* Список */}
              <div className="ad-card ad-card--wide">
                <div className="ad-card-hd">
                  <h2 className="ad-card-title">Все позиции ({coProducts.length})</h2>
                </div>
                {coProducts.length === 0 ? <div className="ad-nil">Позиций пока нет</div> : (
                  <div className="ad-prod-list">
                    {coProducts.map(p => (
                      <div key={p.id} className="ad-prod-row">
                        <div className="ad-prod-info">
                          <strong>{p.name}</strong>
                          <span>{p.category} · от {Number(p.price_adult_4).toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <div className="ad-prod-meta">
                          <span className={`ad-pill ${Number(p.is_active)?'ad-pill--g':'ad-pill--gr'}`}>{Number(p.is_active)?'Активен':'Скрыт'}</span>
                        </div>
                        <div className="ad-prod-acts">
                          <button type="button" className="ad-btn-sm" onClick={async () => {
                            const ep = Number(p.is_active) ? 0 : 1;
                            await req(`${API_URL}/admin/custom-order-products/${p.id}`,{method:'PATCH',headers,body:JSON.stringify({is_active:ep})});
                            const {r,d} = await req(`${API_URL}/admin/custom-order-products`, { headers: getHeaders() });
                            if (r.ok) setCoProducts(d.products||[]);
                          }}>{Number(p.is_active)?'Скрыть':'Показать'}</button>
                          <button type="button" className="ad-btn-sm" onClick={() => setEditCoProduct({...p})}>✎</button>
                          <button type="button" className="ad-btn-sm ad-btn-sm--del" onClick={() => setConfirm({title:'Удалить позицию?',text:p.name,onConfirm:async()=>{
                            await req(`${API_URL}/admin/custom-order-products/${p.id}`,{method:'DELETE',headers});
                            setCoProducts(prev=>prev.filter(x=>x.id!==p.id));
                            setConfirm(null); showToast('Удалено');
                          }})}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === 'builder' && (
          <section className="ad-page ad-page--builder">
            <div className="ad-builder-bar">
              <span className="ad-builder-title">⬕ Конструктор сайта</span>
              <div className="ad-builder-bar-r">
                <a href="/" target="_blank" rel="noreferrer" className="ad-btn-ghost">Открыть сайт ↗</a>
                <button type="button" className={`ad-btn-save${savingTheme?' --saving':''}`} onClick={saveTheme} disabled={savingTheme}>
                  {savingTheme ? '...' : '✓ Сохранить'}
                </button>
              </div>
            </div>
            <div className="ad-builder-body">
              <div className="ad-builder-nav">
                <div className="ad-builder-nav-title">Разделы</div>
                {BUILDER_SECTIONS.map(s => (
                  <button key={s.key} type="button" className={`ad-builder-nav-item${builderSection===s.key?' --on':''}`} onClick={() => setBuilderSection(s.key)}>
                    <span>{s.icon}</span><span>{s.label}</span>
                    <span className="ad-builder-nav-arr">{builderSection===s.key?'▾':'›'}</span>
                  </button>
                ))}
              </div>

              <div className="ad-builder-editor">

                {builderSection === 'hero' && (
                  <div className="ad-builder-section">
                    <div className="ad-builder-sec-hd"><span>🏠</span><h2>Главный экран</h2></div>
                    <div className="ad-builder-fields">
                      {[
                        { key: 'hero_badge', label: 'Бейдж над заголовком', type: 'text', ph: 'Новая коллекция' },
                        { key: 'hero_title', label: 'Главный заголовок', type: 'text', ph: 'Одежда с характером Севера' },
                        { key: 'hero_text', label: 'Описание', type: 'textarea', ph: 'Текст под заголовком...' },
                        { key: 'hero_button_primary', label: 'Кнопка 1 (тёмная)', type: 'text', ph: 'Каталог' },
                        { key: 'hero_button_secondary', label: 'Кнопка 2 (светлая)', type: 'text', ph: 'Индивидуальный заказ' },
                      ].map(f => (
                        <div key={f.key} className="ad-builder-field">
                          <label>{f.label}</label>
                          {f.type === 'textarea'
                            ? <textarea value={themeSettings[f.key]||''} onChange={e => setThemeSettings(p => ({...p, [f.key]: e.target.value}))} placeholder={f.ph} rows={3} />
                            : <input value={themeSettings[f.key]||''} onChange={e => setThemeSettings(p => ({...p, [f.key]: e.target.value}))} placeholder={f.ph} />
                          }
                        </div>
                      ))}
                    </div>
                    <div className="ad-builder-preview">
                      <div className="ad-builder-preview-lbl">Предпросмотр</div>
                      <div className="ad-hero-preview" style={{ background: themeSettings.background_color||'#f4f0e8' }}>
                        {themeSettings.hero_badge && <span className="ad-hero-badge">{themeSettings.hero_badge}</span>}
                        <h3>{themeSettings.hero_title||'Заголовок'}</h3>
                        <p>{themeSettings.hero_text||'Описание'}</p>
                        <div className="ad-hero-btns">
                          <span className="ad-hero-btn-d">{themeSettings.hero_button_primary||'Кнопка 1'}</span>
                          <span className="ad-hero-btn-l">{themeSettings.hero_button_secondary||'Кнопка 2'}</span>
                        </div>
                      </div>
                    </div>
                    <button type="button" className="ad-builder-save-btn" onClick={saveTheme} disabled={savingTheme}>{savingTheme?'Сохраняем...':'✓ Сохранить'}</button>
                  </div>
                )}

                {builderSection === 'contacts' && (
                  <div className="ad-builder-section">
                    <div className="ad-builder-sec-hd"><span>📞</span><h2>Контакты</h2></div>
                    <div className="ad-builder-fields">
                      {[
                        { key: 'phone', label: 'Телефон', ph: '+7 999 060 00 75' },
                        { key: 'email', label: 'Email', ph: 'info@tetim.ru' },
                        { key: 'address', label: 'Адрес', ph: 'г. Якутск, ул. Дежнева 30' },
                      ].map(f => (
                        <div key={f.key} className="ad-builder-field">
                          <label>{f.label}</label>
                          <input value={themeSettings[f.key]||''} onChange={e => setThemeSettings(p => ({...p, [f.key]: e.target.value}))} placeholder={f.ph} />
                        </div>
                      ))}
                    </div>
                    <button type="button" className="ad-builder-save-btn" onClick={saveTheme} disabled={savingTheme}>{savingTheme?'Сохраняем...':'✓ Сохранить'}</button>
                  </div>
                )}

                {builderSection === 'socials' && (
                  <div className="ad-builder-section">
                    <div className="ad-builder-sec-hd"><span>🌐</span><h2>Соцсети</h2></div>
                    <div className="ad-builder-fields">
                      {[
                        { key: 'instagram_url', label: 'Instagram', ph: 'https://instagram.com/tetim' },
                        { key: 'whatsapp_url', label: 'WhatsApp', ph: 'https://wa.me/79990600075' },
                        { key: 'social_extra_url', label: 'Ссылка 3', ph: 'https://...' },
                        { key: 'telegram_url', label: 'Telegram', ph: 'https://t.me/...' },
                      ].map(f => (
                        <div key={f.key} className="ad-builder-field">
                          <label>{f.label}</label>
                          <input value={themeSettings[f.key]||''} onChange={e => setThemeSettings(p => ({...p, [f.key]: e.target.value}))} placeholder={f.ph} />
                        </div>
                      ))}
                    </div>
                    <button type="button" className="ad-builder-save-btn" onClick={saveTheme} disabled={savingTheme}>{savingTheme?'Сохраняем...':'✓ Сохранить'}</button>
                  </div>
                )}

                {builderSection === 'appearance' && (
                  <div className="ad-builder-section">
                    <div className="ad-builder-sec-hd"><span>🎨</span><h2>Оформление сайта</h2></div>
                    <div className="ad-builder-fields">
                      <div className="ad-builder-field">
                        <label>Название сайта</label>
                        <input value={themeSettings.site_title||''} onChange={e => setThemeSettings(p => ({...p, site_title: e.target.value}))} placeholder="TETIM" />
                      </div>
                      <div className="ad-builder-field">
                        <label>Тема сайта</label>
                        <select value={themeSettings.site_theme||'auto'} onChange={e => setThemeSettings(p => ({...p, site_theme: e.target.value}))}>
                          <option value="auto">Авто по праздникам</option>
                          <option value="sakha">Саха</option>
                          <option value="newyear">Новогодняя</option>
                          <option value="defender">23 февраля</option>
                          <option value="womens">8 марта</option>
                          <option value="sakha-republic">День Республики</option>
                          <option value="ysyakh">Ысыах</option>
                          <option value="sakha-statehood">День государственности</option>
                        </select>
                      </div>
                      <div className="ad-builder-field-row">
                        <div className="ad-builder-field">
                          <label>Цвет акцента</label>
                          <div className="ad-color-row">
                            <input type="color" value={themeSettings.accent_color||'#111111'} onChange={e => setThemeSettings(p => ({...p, accent_color: e.target.value}))} />
                            <input value={themeSettings.accent_color||''} onChange={e => setThemeSettings(p => ({...p, accent_color: e.target.value}))} placeholder="#111111" />
                          </div>
                        </div>
                        <div className="ad-builder-field">
                          <label>Фон сайта</label>
                          <div className="ad-color-row">
                            <input type="color" value={themeSettings.background_color||'#f4f0e8'} onChange={e => setThemeSettings(p => ({...p, background_color: e.target.value}))} />
                            <input value={themeSettings.background_color||''} onChange={e => setThemeSettings(p => ({...p, background_color: e.target.value}))} placeholder="#f4f0e8" />
                          </div>
                        </div>
                      </div>
                      <div className="ad-builder-field">
                        <label>Снег на сайте</label>
                        <select value={themeSettings.snow_enabled||'0'} onChange={e => setThemeSettings(p => ({...p, snow_enabled: e.target.value}))}>
                          <option value="0">Выключен</option>
                          <option value="1">Включён</option>
                        </select>
                      </div>
                    </div>
                    <button type="button" className="ad-builder-save-btn" onClick={saveTheme} disabled={savingTheme}>{savingTheme?'Сохраняем...':'✓ Сохранить'}</button>
                  </div>
                )}

                {builderSection === 'logo' && (
                  <div className="ad-builder-section">
                    <div className="ad-builder-sec-hd"><span>🖼</span><h2>Логотип и декор</h2></div>
                    <div className="ad-builder-fields">
                      {[
                        { key: 'logo_url', label: 'Логотип (тёмный фон)' },
                        { key: 'logo_white_url', label: 'Логотип (светлый фон)' },
                        { key: 'header_ornament_url', label: 'Орнамент шапки' },
                        { key: 'background_pattern_url', label: 'Фоновый рисунок' },
                        { key: 'decor_image_url', label: 'Декоративный элемент' },
                      ].map(f => (
                        <div key={f.key} className="ad-builder-field">
                          <label>{f.label}</label>
                          {themeSettings[f.key] && <img src={themeSettings[f.key]} alt="" className="ad-logo-preview" />}
                          <div className="ad-upload-row">
                            <input value={themeSettings[f.key]||''} onChange={e => setThemeSettings(p => ({...p, [f.key]: e.target.value}))} placeholder="Ссылка или загрузите файл" />
                            <label className="ad-upload-btn-sm">↑
                              <input type="file" accept="image/*" onChange={e => handleUpload(e, setThemeSettings, f.key)} disabled={uploading} style={{ display: 'none' }} />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="ad-builder-save-btn" onClick={saveTheme} disabled={savingTheme}>{savingTheme?'Сохраняем...':'✓ Сохранить'}</button>
                  </div>
                )}

                {builderSection === 'footer' && (
                  <div className="ad-builder-section">
                    <div className="ad-builder-sec-hd"><span>📄</span><h2>Подвал сайта</h2></div>
                    <div className="ad-builder-fields">
                      <div className="ad-builder-field">
                        <label>Текст подвала</label>
                        <input value={themeSettings.footer_text||''} onChange={e => setThemeSettings(p => ({...p, footer_text: e.target.value}))} placeholder="© 2026 TETIM" />
                      </div>
                    </div>
                    <button type="button" className="ad-builder-save-btn" onClick={saveTheme} disabled={savingTheme}>{savingTheme?'Сохраняем...':'✓ Сохранить'}</button>
                  </div>
                )}

                {builderSection === 'slides' && (
                  <div className="ad-builder-section">
                    <div className="ad-builder-sec-hd">
                      <span>🎞</span><h2>Слайды главного экрана</h2>
                      <span className="ad-builder-count">{slides.length} / 10</span>
                    </div>
                    <form onSubmit={createSlide} className="ad-builder-fields">
                      <div className="ad-builder-field">
                        <label>Заголовок слайда (необязательно)</label>
                        <input value={slideForm.title} onChange={e => setSlideForm(p => ({...p, title: e.target.value}))} placeholder="Новая коллекция" />
                      </div>
                      <div className="ad-builder-field">
                        <label>Фото или видео</label>
                        {slideForm.image_url && (slideForm.media_type==='video'
                          ? <video src={slideForm.image_url} muted className="ad-slide-preview" />
                          : <img src={slideForm.image_url} alt="" className="ad-slide-preview" />
                        )}
                        <div className="ad-upload-row">
                          <input value={slideForm.image_url} onChange={e => setSlideForm(p => ({...p, image_url: e.target.value}))} placeholder="Ссылка на файл" />
                          <label className="ad-upload-btn-sm">↑
                            <input type="file" accept="image/*,video/*" onChange={e => handleUpload(e, setSlideForm)} disabled={uploading} style={{ display: 'none' }} />
                          </label>
                        </div>
                      </div>
                      <div className="ad-builder-field-row">
                        <div className="ad-builder-field">
                          <label>Тип</label>
                          <select value={slideForm.media_type} onChange={e => setSlideForm(p => ({...p, media_type: e.target.value}))}>
                            <option value="image">Фото</option>
                            <option value="video">Видео</option>
                          </select>
                        </div>
                        <div className="ad-builder-field">
                          <label>Порядок</label>
                          <input type="number" value={slideForm.sort_order} onChange={e => setSlideForm(p => ({...p, sort_order: e.target.value}))} />
                        </div>
                      </div>
                      <button type="submit" className="ad-btn-primary" disabled={uploading || !slideForm.image_url}>+ Добавить слайд</button>
                    </form>
                    {slides.length > 0 && (
                      <div className="ad-slides-list">
                        {slides.map(s => (
                          <div key={s.id} className="ad-slide-item">
                            <div className="ad-slide-thumb">
                              {s.media_type==='video' ? <video src={getImg(s.image_url)} muted /> : <img src={getImg(s.image_url)} alt="" />}
                            </div>
                            <div className="ad-slide-info"><strong>{s.title||'Без заголовка'}</strong><span>Порядок: {s.sort_order}</span></div>
                            <button type="button" className="ad-slide-del" onClick={() => setConfirm({ title: 'Удалить слайд?', text: s.title||'Без заголовка', onConfirm: () => deleteSlide(s.id) })}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {builderSection === 'categories' && (
                  <div className="ad-builder-section">
                    <div className="ad-builder-sec-hd"><span>🗂</span><h2>Категории каталога</h2></div>
                    <div className="ad-cat-add">
                      <h3>Добавить категорию</h3>
                      <div className="ad-builder-fields">
                        <div className="ad-builder-field">
                          <label>Название категории *</label>
                          <input value={newCatLabel} onChange={e => { setNewCatLabel(e.target.value); setNewCatValue(slugify(e.target.value)); }} placeholder="Например: Куртки" />
                        </div>
                        <div className="ad-builder-field">
                          <label>Ключ (slug) — автоматически</label>
                          <input value={newCatValue} onChange={e => setNewCatValue(e.target.value)} placeholder="kurtki" />
                        </div>
                        <button type="button" className="ad-btn-primary" onClick={addCategory}>+ Добавить категорию</button>
                      </div>
                    </div>
                    <div className="ad-cat-list">
                      <h3>Текущие категории ({categories.length})</h3>
                      {categories.map(c => (
                        <div key={c.value} className="ad-cat-item">
                          <div className="ad-cat-info"><strong>{c.label}</strong><span>{c.value}</span></div>
                          <span className="ad-cat-count">{products.filter(p => p.category===c.value).length} товаров</span>
                          <button type="button" className="ad-cat-del" onClick={() => setConfirm({ title: 'Удалить категорию?', text: `${c.label} — товары останутся, только категория исчезнет из списка`, onConfirm: () => deleteCategory(c.value) })}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </section>
        )}

      </main>

      {/* Модалка редактирования */}
      {editProduct && (
        <div className="ad-modal-bg" onClick={() => setEditProduct(null)}>
          <div className="ad-modal" onClick={e => e.stopPropagation()}>
            <div className="ad-modal-hd">
              <h2>Редактировать товар</h2>
              <button type="button" className="ad-modal-close" onClick={() => setEditProduct(null)}>✕</button>
            </div>
            <form onSubmit={saveEdit} className="ad-form">
              <div className="ad-form-2">
                <input value={editProduct.external_id||''} onChange={e => setEditProduct(p => ({...p, external_id: e.target.value}))} placeholder="ID из 1С" />
                <input value={editProduct.article||''} onChange={e => setEditProduct(p => ({...p, article: e.target.value}))} placeholder="Артикул" />
              </div>
              <input value={editProduct.name||''} onChange={e => setEditProduct(p => ({...p, name: e.target.value}))} placeholder="Название *" required />
              <select value={editProduct.category||'accessories'} onChange={e => setEditProduct(p => ({...p, category: e.target.value}))}>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input value={editProduct.price||''} onChange={e => setEditProduct(p => ({...p, price: e.target.value}))} placeholder="Цена ₽" type="number" min="0" />
              <div className="ad-sizes">
                <span className="ad-sizes-lbl">Остатки по размерам</span>
                <div className="ad-sizes-grid">
                  {SIZES.map(s => (
                    <label key={s} className="ad-sz"><span>{s}</span>
                      <input type="number" min="0" value={ef[s]||''} onChange={e => updateSize(s, e.target.value, 'edit')} placeholder="0" />
                    </label>
                  ))}
                </div>
              </div>
              <div className="ad-photo">
                <span className="ad-sizes-lbl">Главное фото</span>
                {editProduct.image_url && <img src={editProduct.image_url} alt="" className="ad-thumb" />}
                <label className="ad-upload-btn">↑ Загрузить новое фото
                  <input type="file" accept="image/*" onChange={e => handleUpload(e, setEditProduct)} disabled={uploading} style={{ display: 'none' }} />
                </label>
                <input value={editProduct.image_url||''} onChange={e => setEditProduct(p => ({...p, image_url: e.target.value}))} placeholder="или ссылка" />
              </div>
              <div className="ad-photo">
                <span className="ad-sizes-lbl">Дополнительные фото (до 4)</span>
                <div className="ad-extra-photos">
                  {String(editProduct.images || '').split(',').map(s => s.trim()).filter(Boolean).map((url, i) => (
                    <div key={i} className="ad-extra-photo-item">
                      <img src={url} alt="" />
                      <button type="button" className="ad-extra-photo-del" onClick={() => removeExtraPhoto(url, setEditProduct)}>✕</button>
                    </div>
                  ))}
                  {String(editProduct.images || '').split(',').filter(s => s.trim()).length < 4 && (
                    <label className="ad-extra-photo-add">
                      <span>+</span>
                      <input type="file" accept="image/*" onChange={e => handleExtraPhotoUpload(e, setEditProduct)} disabled={uploading} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>
              <textarea value={editProduct.description||''} onChange={e => setEditProduct(p => ({...p, description: e.target.value}))} placeholder="Описание" rows={3} />
              <div className="ad-modal-ft">
                <button type="submit" className="ad-btn-primary" disabled={uploading}>Сохранить</button>
                <button type="button" className="ad-btn-ghost" onClick={() => setEditProduct(null)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm */}
      {confirm && (
        <div className="ad-modal-bg" onClick={() => setConfirm(null)}>
          <div className="ad-confirm" onClick={e => e.stopPropagation()}>
            <h3>{confirm.title}</h3>
            {confirm.text && <p>{confirm.text}</p>}
            <div className="ad-confirm-ft">
              <button type="button" className="ad-btn-danger" onClick={async () => { await confirm.onConfirm(); setConfirm(null); }}>Подтвердить</button>
              <button type="button" className="ad-btn-ghost" onClick={() => setConfirm(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}