import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ─── ИСПРАВЛЕНИЕ 1: API_URL берётся из env корректно
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import SiteBuilder from './SiteBuilder.jsx';
import '../styles/SiteBuilder.css';

const categories = [
  { value: 'accessories', label: 'Аксессуары' },
  { value: 'sale', label: 'Акционные товары' },
  { value: 'pants-shorts', label: 'Брюки и Шорты' },
  { value: 'headwear', label: 'Головные уборы' },
  { value: 'sweatshirts', label: 'Джемпера, свитшоты, толстовки' },
  { value: 'vests', label: 'Жилеты' },
  { value: 'suits', label: 'Костюмы, комплекты' },
  { value: 'jackets', label: 'Пуховики, куртки, ветровки' },
  { value: 'shirts', label: 'Рубашки' },
  { value: 'tshirts-longsleeves', label: 'Футболки и Лонгсливы' },
  { value: 'bags', label: 'Сумки' },
  { value: 'backpacks', label: 'Рюкзаки' },
  { value: 'caps', label: 'Кепки' },
  { value: 'hats', label: 'Шапки' },
  { value: 'socks', label: 'Носки' },
  { value: 'belts', label: 'Ремни' },
];

const productSizes = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'];

const emptyProductForm = {
  external_id: '',
  article: '',
  name: '',
  category: 'accessories',
  price: '',
  sizes: '',
  stock: '',
  image_url: '',
  description: '',
};

const emptySlideForm = {
  title: '',
  subtitle: '',
  image_url: '',
  media_type: 'image',
  background_color: '#111111',
  sort_order: 0,
  is_active: true,
};

const emptyBlockForm = {
  page: 'home',
  type: 'hero',
  title: '',
  subtitle: '',
  image_url: '',
  background_color: '#fffaf2',
  text_color: '#111111',
  sort_order: 0,
  is_active: true,
  content_json: '{}',
};

const defaultThemeForm = {
  site_title: 'TETIM',
  logo_url: '/assets/logo-full.png',
  logo_white_url: '/assets/logo-full-white.png',
  site_theme: 'auto',
  holiday_theme_enabled: '1',
  header_ornament_url: '',
  background_pattern_url: '',
  decor_image_url: '',
  snow_enabled: '0',
  instagram_url: '',
  whatsapp_url: '',
  social_extra_url: '',
  telegram_url: '',
  phone: '+7 999 060 00 75',
  email: 'info@tetim.ru',
  address: 'Якутск',
  footer_text: '© 2026 TETIM. Все права защищены.',
  hero_badge: 'Новая коллекция',
  hero_title: 'Одежда с характером Севера',
  hero_text: 'Создаём одежду для города, спорта и активной жизни — с вниманием к деталям, комфорту и северному характеру.',
  hero_button_primary: 'Каталог',
  hero_button_secondary: 'Индивидуальный заказ',
  accent_color: '#111111',
  background_color: '#f4f0e8',
  newyear_theme_start: '2026-01-01',
  newyear_theme_end: '2026-01-08',
  defender_theme_start: '2026-02-23',
  defender_theme_end: '2026-02-23',
  womens_theme_start: '2026-03-08',
  womens_theme_end: '2026-03-08',
  republic_theme_start: '2026-04-27',
  republic_theme_end: '2026-04-27',
  ysyakh_theme_start: '2026-06-21',
  ysyakh_theme_end: '2026-06-21',
  statehood_theme_start: '2026-09-27',
  statehood_theme_end: '2026-09-27',
};

async function safeJson(response) {
  try { return await response.json(); } catch { return {}; }
}

function getToken() {
  return localStorage.getItem('token') || '';
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function getCategoryLabel(value) {
  return categories.find((item) => item.value === value)?.label || value || 'Без категории';
}

function getBlockTypeLabel(type) {
  const labels = { hero: 'Главный экран', slider: 'Слайдер', categories: 'Категории', products: 'Товары', text_image: 'Текст + фото' };
  return labels[type] || type;
}

function getDefaultJsonByType(type) {
  if (type === 'slider') return JSON.stringify({ source: 'admin_slides', autoplay: true, interval: 4000, showDots: true }, null, 2);
  if (type === 'hero') return JSON.stringify({ badge: 'Новая коллекция', primaryButton: 'Каталог', secondaryButton: 'Индивидуальный заказ' }, null, 2);
  if (type === 'categories') return JSON.stringify({ layout: 'cards' }, null, 2);
  if (type === 'products') return JSON.stringify({ limit: 8, category: 'all', buttonText: 'Смотреть все', buttonLink: '/catalog' }, null, 2);
  return JSON.stringify({ buttonText: '', buttonUrl: '' }, null, 2);
}

function parseSizesStock(value) {
  const result = {};
  productSizes.forEach((size) => { result[size] = ''; });
  String(value || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((item) => {
    const [rawSize, rawStock] = item.split(':').map((p) => p.trim());
    const size = String(rawSize || '').toUpperCase();
    if (productSizes.includes(size)) result[size] = rawStock || '';
  });
  return result;
}

function buildSizesStockString(sizeStock) {
  return productSizes.map((size) => {
    const stock = Number(sizeStock[size] || 0);
    return stock > 0 ? `${size}:${stock}` : null;
  }).filter(Boolean).join(', ');
}

function getTotalStockFromSizes(sizeStock) {
  return productSizes.reduce((sum, size) => sum + Number(sizeStock[size] || 0), 0);
}

// ─── ИСПРАВЛЕНИЕ 2: изображения с серверным путём /uploads/... нужно
// открывать через API_URL, иначе фронтенд на другом порту не найдёт файл
function getImageSrc(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [builderMode, setBuilderMode] = useState('blocks');
  const [token, setToken] = useState(getToken);
  const [user, setUser] = useState(getStoredUser);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [slides, setSlides] = useState([]);
  const [pageBlocks, setPageBlocks] = useState([]);

  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editProductId, setEditProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState(emptyProductForm);
  const [showEditModal, setShowEditModal] = useState(false);

  const [slideForm, setSlideForm] = useState(emptySlideForm);
  const [blockForm, setBlockForm] = useState(emptyBlockForm);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [themeForm, setThemeForm] = useState(defaultThemeForm);

  const [productSearch, setProductSearch] = useState('');
  const [message, setMessage] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [builderPreviewOpen, setBuilderPreviewOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  // ─── ИСПРАВЛЕНИЕ 3: флаг загрузки файла — блокируем кнопки и показываем индикатор
  const [uploadingFile, setUploadingFile] = useState(false);

  const builderEditorRef = useRef(null);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!token) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function showMessage(text, type = 'success') {
    setMessage({ text, type });
    window.setTimeout(() => setMessage(null), 3500);
  }

  // ─── ИСПРАВЛЕНИЕ 4: request ловит сетевые ошибки (упавший сервер, CORS)
  // и не разлогинивает пользователя при любом 401 — только при явном "нет доступа"
  async function request(url, options = {}) {
    try {
      const response = await fetch(url, options);
      const data = await safeJson(response);
      if ((response.status === 401 || response.status === 403) &&
          (data.message?.toLowerCase().includes('токен') ||
           data.message?.toLowerCase().includes('token') ||
           data.message === 'Доступ запрещён')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken('');
        setUser(null);
      }
      return { response, data };
    } catch {
      return {
        response: { ok: false, status: 0 },
        data: { message: 'Сервер недоступен. Проверьте соединение.' },
      };
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadProducts(), loadOrders(), loadClients(), loadSlides(), loadPageBlocks(), loadThemeSettings()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    const { response, data } = await request(`${API_URL}/admin/products`, { headers });
    if (response.ok) setProducts(data.products || []);
  }
  async function loadOrders() {
    const { response, data } = await request(`${API_URL}/admin/orders`, { headers });
    if (response.ok) setOrders(data.orders || []);
  }
  async function loadClients() {
    const { response, data } = await request(`${API_URL}/admin/users`, { headers });
    if (response.ok) setClients(data.users || []);
  }
  async function loadSlides() {
    const { response, data } = await request(`${API_URL}/admin/slides`, { headers });
    if (response.ok) setSlides(data.slides || []);
  }
  async function loadPageBlocks() {
    const { response, data } = await request(`${API_URL}/admin/page-blocks`, { headers });
    if (response.ok) setPageBlocks(data.blocks || []);
  }
  async function loadThemeSettings() {
    const { response, data } = await request(`${API_URL}/admin/settings`, { headers });
    if (response.ok) setThemeForm({ ...defaultThemeForm, ...(data.settings || {}) });
  }

  // ─── ИСПРАВЛЕНИЕ 5: uploadFile — ГЛАВНАЯ ПРИЧИНА "не загружается фото"
  //
  // Было:   headers содержал Content-Type: application/json
  //         → PHP не мог распознать multipart/form-data
  //         → $_FILES был пустой → "Файл не загружен"
  //
  // Стало:  передаём ТОЛЬКО Authorization, без Content-Type
  //         → браузер сам ставит Content-Type: multipart/form-data; boundary=...
  //         → PHP видит $_FILES корректно
  async function uploadFile(file) {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!allowed.includes(file.type)) throw new Error(`Неподдерживаемый формат: ${file.type}`);
    if (file.size > 64 * 1024 * 1024) throw new Error('Файл слишком большой. Максимум 64 МБ');

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/admin/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // БЕЗ Content-Type!
      body: formData,
    });

    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.message || `Ошибка сервера (${response.status})`);
    if (!data.url) throw new Error('Сервер не вернул URL файла');
    return data;
  }

  async function handleProductPhoto(event, mode = 'create') {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const data = await uploadFile(file);
      const url = getImageSrc(data.url);
      if (mode === 'edit') setEditProductForm((prev) => ({ ...prev, image_url: url }));
      else setProductForm((prev) => ({ ...prev, image_url: url }));
      showMessage('Фото товара загружено');
    } catch (err) {
      showMessage(err.message || 'Ошибка загрузки фото', 'error');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  }

  async function handleSlideFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const data = await uploadFile(file);
      const url = getImageSrc(data.url);
      setSlideForm((prev) => ({ ...prev, image_url: url, media_type: data.media_type || 'image' }));
      showMessage('Файл слайда загружен');
    } catch (err) {
      showMessage(err.message || 'Ошибка загрузки файла', 'error');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  }

  async function handleBlockImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const data = await uploadFile(file);
      setBlockForm((prev) => ({ ...prev, image_url: getImageSrc(data.url) }));
      showMessage('Картинка блока загружена');
    } catch (err) {
      showMessage(err.message || 'Ошибка загрузки картинки', 'error');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  }

  async function uploadThemeImage(event, fieldName) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const data = await uploadFile(file);
      setThemeForm((prev) => ({ ...prev, [fieldName]: getImageSrc(data.url) }));
      showMessage('Изображение загружено');
    } catch (err) {
      showMessage(err.message || 'Не удалось загрузить изображение', 'error');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  }

  function updateProductSizeStock(size, value) {
    const next = { ...parseSizesStock(productForm.sizes), [size]: value };
    setProductForm((prev) => ({ ...prev, sizes: buildSizesStockString(next), stock: getTotalStockFromSizes(next) }));
  }
  function updateEditProductSizeStock(size, value) {
    const next = { ...parseSizesStock(editProductForm.sizes), [size]: value };
    setEditProductForm((prev) => ({ ...prev, sizes: buildSizesStockString(next), stock: getTotalStockFromSizes(next) }));
  }

  async function createProduct(event) {
    event.preventDefault();
    const { response, data } = await request(`${API_URL}/admin/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...productForm, price: Number(productForm.price) || 0, stock: Number(productForm.stock) || 0 }),
    });
    if (!response.ok) { showMessage(data.message || 'Не удалось добавить товар', 'error'); return; }
    showMessage('Товар добавлен');
    setProductForm(emptyProductForm);
    await loadProducts();
  }

  // ─── ИСПРАВЛЕНИЕ 6: startEditProduct — image_url строим через getImageSrc
  // чтобы превью в модалке корректно отображалось для серверных путей
  function startEditProduct(product) {
    setEditProductId(product.id);
    setEditProductForm({
      external_id: product.external_id || '',
      article: product.article || '',
      name: product.name || '',
      category: product.category || 'accessories',
      price: product.price ?? '',
      sizes: product.sizes || '',
      stock: product.stock ?? '',
      image_url: getImageSrc(product.image_url || ''),
      description: product.description || '',
    });
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditProductId(null);
    setEditProductForm(emptyProductForm);
  }

  async function saveProductEdit(event) {
    event.preventDefault();
    if (!editProductId) return;
    const { response, data } = await request(`${API_URL}/admin/products/${editProductId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ...editProductForm, price: Number(editProductForm.price) || 0, stock: Number(editProductForm.stock) || 0 }),
    });
    if (!response.ok) { showMessage(data.message || 'Не удалось сохранить товар', 'error'); return; }
    showMessage('Товар сохранён');
    closeEditModal();
    await loadProducts();
  }

  async function publishProduct(productId) {
    const { response, data } = await request(`${API_URL}/admin/products/${productId}/publish`, { method: 'PATCH', headers });
    if (!response.ok) { showMessage(data.message || 'Ошибка', 'error'); return; }
    showMessage('Товар опубликован');
    await loadProducts();
  }
  async function unpublishProduct(productId) {
    const { response, data } = await request(`${API_URL}/admin/products/${productId}/unpublish`, { method: 'PATCH', headers });
    if (!response.ok) { showMessage(data.message || 'Ошибка', 'error'); return; }
    showMessage('Товар снят с публикации');
    await loadProducts();
  }

  function askDeleteProduct(product) {
    setConfirmModal({ title: 'Удалить товар?', text: product.name, confirmText: 'Удалить', danger: true, onConfirm: () => deleteProduct(product.id) });
  }
  async function deleteProduct(productId) {
    const { response, data } = await request(`${API_URL}/admin/products/${productId}`, { method: 'DELETE', headers });
    if (!response.ok) { showMessage(data.message || 'Ошибка', 'error'); return; }
    showMessage('Товар удалён');
    setConfirmModal(null);
    await loadProducts();
  }

  // ─── ИСПРАВЛЕНИЕ 7: importProductsFromExcel — убран Content-Type из заголовков
  async function importProductsFromExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_URL}/admin/products/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // БЕЗ Content-Type!
        body: formData,
      });
      const data = await safeJson(response);
      if (!response.ok) { showMessage(data.message || 'Не удалось импортировать товары', 'error'); return; }
      showMessage(`Импорт готов: добавлено ${data.created || 0}, обновлено ${data.updated || 0}, пропущено ${data.skipped || 0}`);
      await loadProducts();
    } catch {
      showMessage('Ошибка импорта Excel', 'error');
    } finally {
      event.target.value = '';
    }
  }

  async function createSlide(event) {
    event.preventDefault();
    if (!slideForm.image_url.trim()) { showMessage('Загрузите файл или укажите ссылку', 'error'); return; }
    const { response, data } = await request(`${API_URL}/admin/slides`, { method: 'POST', headers, body: JSON.stringify(slideForm) });
    if (!response.ok) { showMessage(data.message || 'Ошибка', 'error'); return; }
    showMessage('Слайд добавлен');
    setSlideForm(emptySlideForm);
    await loadSlides();
  }
  function askDeleteSlide(slide) {
    setConfirmModal({ title: 'Удалить слайд?', text: slide.title || 'Без заголовка', confirmText: 'Удалить', danger: true, onConfirm: () => deleteSlide(slide.id) });
  }
  async function deleteSlide(slideId) {
    const { response, data } = await request(`${API_URL}/admin/slides/${slideId}`, { method: 'DELETE', headers });
    if (!response.ok) { showMessage(data.message || 'Ошибка', 'error'); return; }
    showMessage('Слайд удалён');
    setConfirmModal(null);
    await loadSlides();
  }

  async function updateOrderStatus(orderId, status) {
    const { response, data } = await request(`${API_URL}/admin/orders/${orderId}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
    if (!response.ok) { showMessage(data.message || 'Ошибка', 'error'); return; }
    showMessage('Статус заказа изменён');
    await loadOrders();
  }

  function createEmptyBlock(type = 'text_image') {
    const nextOrder = pageBlocks.length > 0 ? Math.max(...pageBlocks.map((b) => Number(b.sort_order || 0))) + 1 : 1;
    setActiveTab('builder');
    setBuilderMode('blocks');
    setSelectedBlockId(null);
    setBlockForm({ ...emptyBlockForm, type, title: getBlockTypeLabel(type), sort_order: nextOrder, content_json: getDefaultJsonByType(type) });
    setTimeout(() => builderEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  function selectBlock(block) {
    let prettyJson = block.content_json || '{}';
    try { prettyJson = JSON.stringify(JSON.parse(prettyJson), null, 2); } catch { /* keep */ }
    setBuilderMode('blocks');
    setSelectedBlockId(block.id);
    setBlockForm({
      page: block.page || 'home',
      type: block.type || 'hero',
      title: block.title || '',
      subtitle: block.subtitle || '',
      image_url: getImageSrc(block.image_url || ''),
      background_color: block.background_color || '#ffffff',
      text_color: block.text_color || '#111111',
      sort_order: Number(block.sort_order || 0),
      is_active: Number(block.is_active) === 1,
      content_json: prettyJson,
    });
    setTimeout(() => builderEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  async function savePageBlock(event) {
    event.preventDefault();
    try { JSON.parse(blockForm.content_json || '{}'); } catch {
      showMessage('JSON настройки блока заполнен неверно', 'error'); return;
    }
    const url = selectedBlockId ? `${API_URL}/admin/page-blocks/${selectedBlockId}` : `${API_URL}/admin/page-blocks`;
    const method = selectedBlockId ? 'PATCH' : 'POST';
    const { response, data } = await request(url, { method, headers, body: JSON.stringify(blockForm) });
    if (!response.ok) { showMessage(data.message || 'Ошибка', 'error'); return; }
    showMessage(selectedBlockId ? 'Блок сохранён' : 'Блок добавлен');
    setSelectedBlockId(data.block?.id || selectedBlockId);
    await loadPageBlocks();
  }

  function askDeleteBlock(block) {
    setConfirmModal({ title: 'Удалить блок?', text: block.title || getBlockTypeLabel(block.type), confirmText: 'Удалить', danger: true, onConfirm: () => deleteBlock(block.id) });
  }
  async function deleteBlock(blockId) {
    const { response, data } = await request(`${API_URL}/admin/page-blocks/${blockId}`, { method: 'DELETE', headers });
    if (!response.ok) { showMessage(data.message || 'Ошибка', 'error'); return; }
    showMessage('Блок удалён');
    setConfirmModal(null);
    setSelectedBlockId(null);
    setBlockForm(emptyBlockForm);
    await loadPageBlocks();
  }

  async function saveThemeSettings() {
    const { response, data } = await request(`${API_URL}/admin/settings`, { method: 'PATCH', headers, body: JSON.stringify({ settings: themeForm }) });
    if (!response.ok) { showMessage(data.message || 'Ошибка', 'error'); return; }
    showMessage('Оформление сайта сохранено');
    await loadThemeSettings();
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  }

  const filteredProducts = useMemo(() => {
    const text = productSearch.trim().toLowerCase();
    if (!text) return products;
    return products.filter((p) =>
      String(p.name || '').toLowerCase().includes(text) ||
      String(p.article || '').toLowerCase().includes(text) ||
      String(p.external_id || '').toLowerCase().includes(text) ||
      String(p.category || '').toLowerCase().includes(text)
    );
  }, [products, productSearch]);

  const stats = useMemo(() => ({
    totalProducts: products.length,
    published: products.filter((p) => Number(p.is_published) === 1).length,
    drafts: products.filter((p) => Number(p.is_published) !== 1).length,
    newOrders: orders.filter((o) => o.status === 'new').length,
  }), [products, orders]);

  if (!token || !user) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <h1>TETIM</h1>
          <p>Для доступа к админ-панели войдите через сайт.</p>
          <Link to="/" className="btn-dark">На сайт</Link>
        </section>
      </main>
    );
  }

  const productSizeStock = parseSizesStock(productForm.sizes);
  const editProductSizeStock = parseSizesStock(editProductForm.sizes);

  return (
    <main className={sidebarCollapsed ? 'admin-page admin-sidebar-collapsed' : 'admin-page'}>

      {/* Toast-уведомление */}
      {message && (
        <div className={`admin-toast${message.type === 'error' ? ' admin-toast-error' : ''}`}>
          {message.text}
        </div>
      )}

      {/* ─── ИСПРАВЛЕНИЕ 8: оверлей во время загрузки файла */}
      {uploadingFile && (
        <div className="admin-upload-overlay">
          <div className="admin-upload-spinner">Загрузка файла...</div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarCollapsed ? ' hidden' : ''}`}>
        <button type="button" className="admin-sidebar-close" onClick={() => setSidebarCollapsed(true)}>×</button>
        <div className="admin-sidebar-brand">
          <strong>TETIM</strong>
          <span>Админ-панель</span>
        </div>
        <nav className="admin-nav">
          {[['products','Товары'],['orders','Заказы'],['clients','Клиенты'],['builder','Конструктор сайта']].map(([key, label]) => (
            <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/">На сайт</Link>
          <Link to="/account">В кабинет</Link>
          <button type="button" onClick={logout}>Выйти</button>
        </div>
      </aside>

      {sidebarCollapsed && (
        <button type="button" className="admin-sidebar-open" onClick={() => setSidebarCollapsed(false)}>☰</button>
      )}

      <section className="admin-main">
        <header className="admin-hero-card">
          <div>
            <h1>Панель управления</h1>
            <p>Товары, заказы, клиенты и конструктор сайта TETIM</p>
          </div>
          <button type="button" onClick={loadAll} disabled={loading}>{loading ? 'Обновление...' : 'Обновить'}</button>
        </header>

        <section className="admin-stats-grid">
          <article><span>Всего товаров</span><strong>{stats.totalProducts}</strong></article>
          <article><span>Опубликовано</span><strong>{stats.published}</strong></article>
          <article><span>Черновики / 1С</span><strong>{stats.drafts}</strong></article>
          <article><span>Новые заказы</span><strong>{stats.newOrders}</strong></article>
        </section>

        {/* ══════════ ТОВАРЫ ══════════ */}
        {activeTab === 'products' && (
          <section className="admin-grid admin-products-grid">
            <article className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h2>Добавить товар</h2>
                  <p>Вручную или импортом из Excel</p>
                </div>
              </div>

              <label className="admin-excel-import">
                <span>Загрузить товары из Excel / CSV</span>
                <small>Поддержка: .xlsx, .xls, .csv, .ods</small>
                <input type="file" accept=".xlsx,.xls,.csv,.ods,.tsv,.txt" onChange={importProductsFromExcel} />
              </label>

              <form className="admin-form" onSubmit={createProduct}>
                <input value={productForm.external_id} onChange={(e) => setProductForm((p) => ({...p, external_id: e.target.value}))} placeholder="ID из 1С" />
                <input value={productForm.article} onChange={(e) => setProductForm((p) => ({...p, article: e.target.value}))} placeholder="Артикул" />
                <input value={productForm.name} onChange={(e) => setProductForm((p) => ({...p, name: e.target.value}))} placeholder="Название товара" required />
                <select value={productForm.category} onChange={(e) => setProductForm((p) => ({...p, category: e.target.value}))}>
                  {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input value={productForm.price} onChange={(e) => setProductForm((p) => ({...p, price: e.target.value}))} placeholder="Цена" type="number" min="0" />

                <div className="admin-size-stock-picker">
                  <span>Остатки по размерам</span>
                  <div className="admin-size-stock-grid">
                    {productSizes.map((size) => (
                      <label key={size}>
                        <strong>{size}</strong>
                        <input type="number" min="0" value={productSizeStock[size]} onChange={(e) => updateProductSizeStock(size, e.target.value)} placeholder="0" />
                      </label>
                    ))}
                  </div>
                  <small>Итого: {productForm.sizes || 'не задано'}</small>
                </div>

                <input value={productForm.stock} placeholder="Общий остаток (автоматически)" type="number" readOnly />

                {/* ─── ИСПРАВЛЕНИЕ 9: поле загрузки фото с превью */}
                <div className="admin-upload-field">
                  <span>Загрузить фото товара</span>
                  {productForm.image_url && (
                    <img src={productForm.image_url} alt="превью" className="admin-photo-preview" />
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleProductPhoto(e, 'create')} disabled={uploadingFile} />
                  {uploadingFile && <small className="admin-upload-hint">Загружаем...</small>}
                </div>

                <input value={productForm.image_url} onChange={(e) => setProductForm((p) => ({...p, image_url: e.target.value}))} placeholder="Или вставьте ссылку на фото" />
                <textarea value={productForm.description} onChange={(e) => setProductForm((p) => ({...p, description: e.target.value}))} placeholder="Описание" />
                <button type="submit" disabled={uploadingFile}>Добавить товар</button>
              </form>
            </article>

            <article className="admin-card admin-wide-card">
              <div className="admin-card-head admin-card-head-row">
                <div>
                  <h2>Управление товарами</h2>
                  <p>Публикация, редактирование и удаление</p>
                </div>
                <input className="admin-search" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Поиск товара" />
              </div>

              {filteredProducts.length === 0 ? (
                <div className="admin-empty">Товаров пока нет</div>
              ) : (
                <div className="admin-products-list">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="admin-product-row">
                      <div className="admin-product-main">
                        <div className="admin-product-image">
                          {product.image_url
                            ? <img src={getImageSrc(product.image_url)} alt={product.name} />
                            : <span>Нет фото</span>}
                        </div>
                        <div>
                          <strong>{product.name}</strong>
                          <small>Артикул: {product.article || '—'} · ID 1С: {product.external_id || '—'}</small>
                          <small>Размеры: {product.sizes || '—'}</small>
                        </div>
                      </div>
                      <span>{getCategoryLabel(product.category)}</span>
                      <span>{formatPrice(product.price)}</span>
                      <span>Остаток: {Number(product.stock || 0)}</span>
                      <span className={Number(product.is_published) === 1 ? 'status published' : 'status draft'}>
                        {Number(product.is_published) === 1 ? 'Опубликован' : 'Черновик'}
                      </span>
                      <div className="admin-row-actions">
                        {Number(product.is_published) === 1
                          ? <button type="button" onClick={() => unpublishProduct(product.id)}>Снять</button>
                          : <button type="button" onClick={() => publishProduct(product.id)}>Опубликовать</button>}
                        <button type="button" onClick={() => startEditProduct(product)}>Изменить</button>
                        <button type="button" className="danger" onClick={() => askDeleteProduct(product)}>Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}

        {/* ══════════ ЗАКАЗЫ ══════════ */}
        {activeTab === 'orders' && (
          <section className="admin-card">
            <h2>Заказы</h2>
            {orders.length === 0 ? <div className="admin-empty">Заказов пока нет</div> : (
              <div className="admin-orders-list">
                {orders.map((order) => (
                  <div key={order.id} className="admin-order-row">
                    <div>
                      <strong>Заказ №{order.id}</strong>
                      <small>{order.customer_name} · {order.phone}</small>
                      <small>{order.email || 'email не указан'}</small>
                      {order.address && <small>{order.address}</small>}
                    </div>
                    <span>{formatPrice(order.total_amount)}</span>
                    <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                      <option value="new">Новый</option>
                      <option value="processing">В работе</option>
                      <option value="done">Выполнен</option>
                      <option value="cancelled">Отменён</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ══════════ КЛИЕНТЫ ══════════ */}
        {activeTab === 'clients' && (
          <section className="admin-card">
            <h2>Клиенты</h2>
            {clients.length === 0 ? <div className="admin-empty">Клиентов пока нет</div> : (
              <div className="admin-clients-list">
                {clients.map((client) => (
                  <div key={client.id} className="admin-client-row">
                    <strong>{client.name}</strong>
                    <span>{client.email}</span>
                    <span>{client.phone || '—'}</span>
                    <small>{client.role}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ══════════ КОНСТРУКТОР ══════════ */}
        {activeTab === 'builder' && (
          <section className="admin-card builder-panel">
            <div className="builder-top">
              <div>
                <h2>Конструктор сайта</h2>
                <p>Собирайте главную страницу из блоков</p>
              </div>
              <div className="builder-add-actions">
                <button type="button" onClick={() => setBuilderPreviewOpen(true)}>Предпросмотр</button>
                <button type="button" className={builderMode === 'blocks' ? 'active' : ''} onClick={() => setBuilderMode('blocks')}>Блоки</button>
                <button type="button" onClick={() => createEmptyBlock('hero')}>+ Главный экран</button>
                <button type="button" onClick={() => createEmptyBlock('slider')}>+ Слайдер</button>
                <button type="button" onClick={() => createEmptyBlock('categories')}>+ Категории</button>
                <button type="button" onClick={() => createEmptyBlock('products')}>+ Товары</button>
                <button type="button" onClick={() => createEmptyBlock('text_image')}>+ Текст + фото</button>
                <button type="button" className={builderMode === 'slides' ? 'active' : ''} onClick={() => setBuilderMode('slides')}>Слайды</button>
                <button type="button" className={builderMode === 'appearance' ? 'active' : ''} onClick={() => setBuilderMode('appearance')}>Оформление</button>
              </div>
            </div>

            {builderMode === 'blocks' && (
              <div className="builder-layout">
                <div className="builder-blocks-list">
                  <h3>Блоки страницы</h3>
                  {pageBlocks.length === 0 ? <div className="admin-empty">Блоков пока нет</div> : (
                    pageBlocks.map((block) => (
                      <button key={block.id} type="button" className={selectedBlockId === block.id ? 'builder-block-item active' : 'builder-block-item'} onClick={() => selectBlock(block)}>
                        <strong>{block.title || getBlockTypeLabel(block.type)}</strong>
                        <span>{getBlockTypeLabel(block.type)} · порядок {block.sort_order}</span>
                      </button>
                    ))
                  )}
                </div>

                <form ref={builderEditorRef} className="builder-editor" onSubmit={savePageBlock}>
                  <h3>{selectedBlockId ? 'Редактировать блок' : 'Новый блок'}</h3>
                  <div className="builder-form-grid">
                    <label>
                      <span>Тип блока</span>
                      <select value={blockForm.type} onChange={(e) => setBlockForm((p) => ({...p, type: e.target.value, content_json: getDefaultJsonByType(e.target.value)}))}>
                        <option value="hero">Главный экран</option>
                        <option value="slider">Слайдер</option>
                        <option value="categories">Категории</option>
                        <option value="products">Товары</option>
                        <option value="text_image">Текст + фото</option>
                      </select>
                    </label>
                    <label>
                      <span>Порядок</span>
                      <input type="number" value={blockForm.sort_order} onChange={(e) => setBlockForm((p) => ({...p, sort_order: e.target.value}))} />
                    </label>
                    <label><span>Заголовок</span><input value={blockForm.title} onChange={(e) => setBlockForm((p) => ({...p, title: e.target.value}))} /></label>
                    <label><span>Подзаголовок</span><input value={blockForm.subtitle} onChange={(e) => setBlockForm((p) => ({...p, subtitle: e.target.value}))} /></label>
                    <label><span>Фон</span><input type="color" value={blockForm.background_color} onChange={(e) => setBlockForm((p) => ({...p, background_color: e.target.value}))} /></label>
                    <label><span>Цвет текста</span><input type="color" value={blockForm.text_color} onChange={(e) => setBlockForm((p) => ({...p, text_color: e.target.value}))} /></label>
                    <label className="wide">
                      <span>Картинка блока</span>
                      <input value={blockForm.image_url} onChange={(e) => setBlockForm((p) => ({...p, image_url: e.target.value}))} placeholder="Ссылка на изображение" />
                      <input type="file" accept="image/*" onChange={handleBlockImage} disabled={uploadingFile} />
                    </label>
                    <label className="wide">
                      <span>JSON настройки блока</span>
                      <textarea value={blockForm.content_json} onChange={(e) => setBlockForm((p) => ({...p, content_json: e.target.value}))} rows={8} />
                    </label>
                    <label className="builder-check wide">
                      <input type="checkbox" checked={blockForm.is_active} onChange={(e) => setBlockForm((p) => ({...p, is_active: e.target.checked}))} />
                      <span>Блок активен</span>
                    </label>
                  </div>

                  <div className="builder-preview">
                    <div className="builder-preview-block" style={{ backgroundColor: blockForm.background_color, color: blockForm.text_color }}>
                      {blockForm.image_url && <img src={blockForm.image_url} alt="" />}
                      <span>{getBlockTypeLabel(blockForm.type)}</span>
                      <h2>{blockForm.title || 'Заголовок блока'}</h2>
                      <p>{blockForm.subtitle || 'Описание блока'}</p>
                    </div>
                  </div>

                  <div className="builder-editor-actions">
                    <button type="submit">{selectedBlockId ? 'Сохранить блок' : 'Добавить блок'}</button>
                    {selectedBlockId && (
                      <button type="button" className="danger" onClick={() => askDeleteBlock({ id: selectedBlockId, title: blockForm.title, type: blockForm.type })}>Удалить блок</button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {builderMode === 'slides' && (
              <div className="builder-inside-section">
                <div className="builder-inside-head">
                  <div>
                    <h2>Слайды главного экрана</h2>
                    <p>Добавляйте фото или видео для слайдера</p>
                  </div>
                  <span>{slides.length} / 10</span>
                </div>

                <form className="admin-form builder-inside-form" onSubmit={createSlide}>
                  <input value={slideForm.title} onChange={(e) => setSlideForm((p) => ({...p, title: e.target.value}))} placeholder="Заголовок слайда" />
                  <input value={slideForm.subtitle} onChange={(e) => setSlideForm((p) => ({...p, subtitle: e.target.value}))} placeholder="Подзаголовок слайда" />

                  {/* ─── ИСПРАВЛЕНИЕ 10: превью файла слайда перед сохранением */}
                  <div className="admin-upload-field wide">
                    <span>Загрузить фото или видео</span>
                    {slideForm.image_url && (
                      slideForm.media_type === 'video'
                        ? <video src={slideForm.image_url} muted className="admin-photo-preview" />
                        : <img src={slideForm.image_url} alt="" className="admin-photo-preview" />
                    )}
                    <input type="file" accept="image/*,video/*" onChange={handleSlideFile} disabled={uploadingFile} />
                    {uploadingFile && <small className="admin-upload-hint">Загружаем...</small>}
                  </div>

                  <input value={slideForm.image_url} onChange={(e) => setSlideForm((p) => ({...p, image_url: e.target.value}))} placeholder="Или вставьте ссылку на файл" />
                  <select value={slideForm.media_type} onChange={(e) => setSlideForm((p) => ({...p, media_type: e.target.value}))}>
                    <option value="image">Фото</option>
                    <option value="video">Видео</option>
                  </select>
                  <input value={slideForm.background_color} onChange={(e) => setSlideForm((p) => ({...p, background_color: e.target.value}))} placeholder="#111111" />
                  <input value={slideForm.sort_order} onChange={(e) => setSlideForm((p) => ({...p, sort_order: e.target.value}))} placeholder="Порядок" type="number" />
                  <button type="submit" disabled={uploadingFile}>Добавить слайд</button>
                </form>

                <div className="builder-slide-grid">
                  {slides.length === 0 ? <div className="admin-empty">Слайдов пока нет</div> : (
                    slides.map((slide) => (
                      <article key={slide.id} className="builder-slide-card">
                        <div>
                          {slide.media_type === 'video'
                            ? <video src={getImageSrc(slide.image_url)} muted />
                            : <img src={getImageSrc(slide.image_url)} alt={slide.title || 'Слайд'} />}
                        </div>
                        <strong>{slide.title || 'Без заголовка'}</strong>
                        <span>{slide.subtitle || ''}</span>
                        <small>Порядок: {slide.sort_order}</small>
                        <button type="button" className="danger" onClick={() => askDeleteSlide(slide)}>Удалить</button>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            {builderMode === 'appearance' && (
              <div className="builder-inside-section">
                <div className="builder-inside-head">
                  <div>
                    <h2>Оформление сайта</h2>
                    <p>Тема, узоры, цвета, контакты, соцсети и праздничное оформление</p>
                  </div>
                  <button type="button" onClick={saveThemeSettings}>Сохранить оформление</button>
                </div>

                <div className="builder-theme-grid">
                  <label><span>Название сайта</span><input value={themeForm.site_title} onChange={(e) => setThemeForm((p) => ({...p, site_title: e.target.value}))} /></label>
                  <label>
                    <span>Тема сайта</span>
                    <select value={themeForm.site_theme} onChange={(e) => setThemeForm((p) => ({...p, site_theme: e.target.value}))}>
                      <option value="auto">Автоматически по праздникам</option>
                      <option value="default">Обычная</option>
                      <option value="sakha">Саха</option>
                      <option value="newyear">Новогодняя</option>
                      <option value="defender">23 февраля</option>
                      <option value="womens">8 марта</option>
                      <option value="sakha-republic">День Республики Саха</option>
                      <option value="ysyakh">Ысыах</option>
                      <option value="sakha-statehood">День государственности</option>
                    </select>
                  </label>
                  <label>
                    <span>Автотемы по праздникам</span>
                    <select value={themeForm.holiday_theme_enabled} onChange={(e) => setThemeForm((p) => ({...p, holiday_theme_enabled: e.target.value}))}>
                      <option value="1">Включены</option>
                      <option value="0">Выключены</option>
                    </select>
                  </label>
                  <label>
                    <span>Снег</span>
                    <select value={themeForm.snow_enabled} onChange={(e) => setThemeForm((p) => ({...p, snow_enabled: e.target.value}))}>
                      <option value="0">Выключен</option>
                      <option value="1">Включен</option>
                    </select>
                  </label>
                  <label className="wide">
                    <span>Логотип</span>
                    <input value={themeForm.logo_url} onChange={(e) => setThemeForm((p) => ({...p, logo_url: e.target.value}))} placeholder="/assets/logo-full.png" />
                    <input type="file" accept="image/*" onChange={(e) => uploadThemeImage(e, 'logo_url')} disabled={uploadingFile} />
                  </label>
                  <label className="wide">
                    <span>Логотип белый</span>
                    <input value={themeForm.logo_white_url} onChange={(e) => setThemeForm((p) => ({...p, logo_white_url: e.target.value}))} placeholder="/assets/logo-full-white.png" />
                    <input type="file" accept="image/*" onChange={(e) => uploadThemeImage(e, 'logo_white_url')} disabled={uploadingFile} />
                  </label>
                  <label className="wide">
                    <span>Орнамент header</span>
                    <input value={themeForm.header_ornament_url} onChange={(e) => setThemeForm((p) => ({...p, header_ornament_url: e.target.value}))} placeholder="Ссылка на узор" />
                    <input type="file" accept="image/*" onChange={(e) => uploadThemeImage(e, 'header_ornament_url')} disabled={uploadingFile} />
                  </label>
                  <label className="wide">
                    <span>Фоновый рисунок сайта</span>
                    <input value={themeForm.background_pattern_url} onChange={(e) => setThemeForm((p) => ({...p, background_pattern_url: e.target.value}))} placeholder="Ссылка на фон" />
                    <input type="file" accept="image/*" onChange={(e) => uploadThemeImage(e, 'background_pattern_url')} disabled={uploadingFile} />
                  </label>
                  <label className="wide">
                    <span>Декоративный рисунок</span>
                    <input value={themeForm.decor_image_url} onChange={(e) => setThemeForm((p) => ({...p, decor_image_url: e.target.value}))} placeholder="Ссылка на декор" />
                    <input type="file" accept="image/*" onChange={(e) => uploadThemeImage(e, 'decor_image_url')} disabled={uploadingFile} />
                  </label>
                  <label><span>Телефон</span><input value={themeForm.phone} onChange={(e) => setThemeForm((p) => ({...p, phone: e.target.value}))} /></label>
                  <label><span>Email</span><input value={themeForm.email} onChange={(e) => setThemeForm((p) => ({...p, email: e.target.value}))} /></label>
                  <label><span>Адрес</span><input value={themeForm.address} onChange={(e) => setThemeForm((p) => ({...p, address: e.target.value}))} /></label>
                  <label><span>Цвет акцента</span><input type="color" value={themeForm.accent_color || '#111111'} onChange={(e) => setThemeForm((p) => ({...p, accent_color: e.target.value}))} /></label>
                  <label className="wide"><span>Текст footer</span><input value={themeForm.footer_text} onChange={(e) => setThemeForm((p) => ({...p, footer_text: e.target.value}))} /></label>
                  <label className="wide"><span>Ссылка Instagram</span><input value={themeForm.instagram_url || ''} onChange={(e) => setThemeForm((p) => ({...p, instagram_url: e.target.value}))} placeholder="https://instagram.com/tetim" /></label>
                  <label className="wide"><span>Ссылка WhatsApp</span><input value={themeForm.whatsapp_url || ''} onChange={(e) => setThemeForm((p) => ({...p, whatsapp_url: e.target.value}))} placeholder="https://wa.me/79990600075" /></label>
                  <label className="wide"><span>Ссылка третьей иконки</span><input value={themeForm.social_extra_url || ''} onChange={(e) => setThemeForm((p) => ({...p, social_extra_url: e.target.value}))} placeholder="https://..." /></label>
                </div>

                <div className={`builder-theme-preview theme-${themeForm.site_theme}`}>
                  {themeForm.header_ornament_url && <img src={themeForm.header_ornament_url} alt="" />}
                  <h2>{themeForm.site_theme === 'newyear' ? 'Новогодняя тема TETIM' : 'Тема сайта TETIM'}</h2>
                  <p>Здесь администратор видит, как будет выглядеть оформление сайта.</p>
                </div>
              </div>
            )}
          </section>
        )}
      </section>

      {/* ══════════ МОДАЛКА РЕДАКТИРОВАНИЯ ══════════ */}
      {showEditModal && (
        <div className="admin-modal-overlay" onClick={closeEditModal}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" type="button" onClick={closeEditModal}>×</button>
            <form className="admin-product-edit-form" onSubmit={saveProductEdit}>
              <h3>Редактировать товар</h3>
              <div className="admin-form two-columns">
                <input value={editProductForm.external_id} onChange={(e) => setEditProductForm((p) => ({...p, external_id: e.target.value}))} placeholder="ID из 1С" />
                <input value={editProductForm.article} onChange={(e) => setEditProductForm((p) => ({...p, article: e.target.value}))} placeholder="Артикул" />
                <input value={editProductForm.name} onChange={(e) => setEditProductForm((p) => ({...p, name: e.target.value}))} placeholder="Название товара" required />
                <select value={editProductForm.category} onChange={(e) => setEditProductForm((p) => ({...p, category: e.target.value}))}>
                  {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input value={editProductForm.price} onChange={(e) => setEditProductForm((p) => ({...p, price: e.target.value}))} placeholder="Цена" type="number" min="0" />

                <div className="admin-size-stock-picker wide">
                  <span>Остатки по размерам</span>
                  <div className="admin-size-stock-grid">
                    {productSizes.map((size) => (
                      <label key={size}>
                        <strong>{size}</strong>
                        <input type="number" min="0" value={editProductSizeStock[size]} onChange={(e) => updateEditProductSizeStock(size, e.target.value)} placeholder="0" />
                      </label>
                    ))}
                  </div>
                  <small>Итого: {editProductForm.sizes || 'не задано'}</small>
                </div>

                <input value={editProductForm.stock} placeholder="Общий остаток (автоматически)" type="number" readOnly />

                {/* ─── ИСПРАВЛЕНИЕ 11: превью фото в модалке редактирования */}
                <div className="admin-upload-field wide">
                  <span>Загрузить новое фото</span>
                  {editProductForm.image_url && (
                    <img src={editProductForm.image_url} alt="превью" className="admin-photo-preview" />
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleProductPhoto(e, 'edit')} disabled={uploadingFile} />
                  {uploadingFile && <small className="admin-upload-hint">Загружаем...</small>}
                </div>

                <input value={editProductForm.image_url} onChange={(e) => setEditProductForm((p) => ({...p, image_url: e.target.value}))} placeholder="Или вставьте ссылку на фото" />
                <textarea className="wide" value={editProductForm.description} onChange={(e) => setEditProductForm((p) => ({...p, description: e.target.value}))} placeholder="Описание" />
              </div>
              <div className="admin-edit-actions">
                <button type="submit" disabled={uploadingFile}>Сохранить товар</button>
                <button type="button" onClick={closeEditModal}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Предпросмотр сайта */}
      {builderPreviewOpen && (
        <div className="admin-modal-backdrop" onClick={() => setBuilderPreviewOpen(false)}>
          <div className="builder-site-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="builder-site-preview-head">
              <div><h3>Предпросмотр сайта</h3><p>Открыто из конструктора</p></div>
              <button type="button" onClick={() => setBuilderPreviewOpen(false)}>×</button>
            </div>
            <iframe title="Предпросмотр сайта" src="/" />
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="admin-modal-backdrop" onClick={() => setConfirmModal(null)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmModal.title}</h3>
            {confirmModal.text && <p>{confirmModal.text}</p>}
            <div className="admin-confirm-actions">
              <button type="button" className={confirmModal.danger ? 'admin-confirm-danger' : 'admin-confirm-ok'} onClick={confirmModal.onConfirm}>
                {confirmModal.confirmText || 'OK'}
              </button>
              <button type="button" className="admin-confirm-cancel" onClick={() => setConfirmModal(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}