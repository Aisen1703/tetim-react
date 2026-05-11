import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const API_URL = 'http://localhost:4000/api';

const SLIDES_MIN = 3;
const SLIDES_MAX = 10;
const VIDEO_MAX_SECONDS = 60;

const PRODUCT_CATEGORIES = [
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

const emptyProductForm = {
  external_id: '',
  article: '',
  name: '',
  category: '',
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

const defaultSiteSettings = {
  site_title: 'TETIM',
  logo_url: '/assets/logo-full.png',
  logo_white_url: '/assets/logo-full-white.png',
  hero_badge: 'Новая коллекция',
  hero_title: 'Функциональная одежда для города, спорта и outdoor',
  hero_text: 'Структура сайта как у большого интернет-магазина: удобный каталог, отдельная корзина, подборки и категории.',
  hero_button_primary: 'Каталог',
  hero_button_secondary: 'Индивидуальный заказ',
  footer_text: '© 2026 TETIM. Все права защищены.',
  phone: '+7 999 060 00 75',
  email: 'info@tetim.ru',
  address: 'Якутск',
  telegram_url: '',
  whatsapp_url: '',
  instagram_url: '',
  accent_color: '#111111',
  background_color: '#f4f0e8',
};

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function getCategoryLabel(value) {
  const category = PRODUCT_CATEGORIES.find((item) => item.value === value);
  return category ? category.label : value || '—';
}

function getStatusLabel(status) {
  const labels = {
    new: 'Новый',
    processing: 'В обработке',
    shipped: 'Отправлен',
    done: 'Завершён',
    cancelled: 'Отменён',
    exported_to_1c: 'Выгружен в 1С',
  };

  return labels[status] || status || '—';
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const [activeTab, setActiveTab] = useState('products');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [slides, setSlides] = useState([]);

  const [message, setMessage] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [productUploadText, setProductUploadText] = useState('');
  const [slideUploadText, setSlideUploadText] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  const [form, setForm] = useState(emptyProductForm);
  const [editForm, setEditForm] = useState(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [slideForm, setSlideForm] = useState(emptySlideForm);
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);
  const [settingsUploadText, setSettingsUploadText] = useState('');

  const draftProducts = products.filter((item) => !Number(item.is_published));
  const publishedProducts = products.filter((item) => Number(item.is_published));
  const newOrders = orders.filter((item) => item.status === 'new');

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) => {
      return (
        String(product.name || '').toLowerCase().includes(query) ||
        String(product.article || '').toLowerCase().includes(query) ||
        String(product.external_id || '').toLowerCase().includes(query) ||
        String(product.category || '').toLowerCase().includes(query)
      );
    });
  }, [products, productSearch]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();

    if (!query) return orders;

    return orders.filter((order) => {
      return (
        String(order.id || '').includes(query) ||
        String(order.customer_name || '').toLowerCase().includes(query) ||
        String(order.phone || '').toLowerCase().includes(query) ||
        String(order.email || '').toLowerCase().includes(query)
      );
    });
  }, [orders, orderSearch]);

  useEffect(() => {
    if (!token || !user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([
      loadUsers(),
      loadProducts(),
      loadOrders(),
      loadSlides(),
      loadSettings(),
    ]);
  }

  function showMessage(text, type = 'success') {
    setMessage({ text, type });

    setTimeout(() => {
      setMessage(null);
    }, 3500);
  }

  async function safeJson(response) {
    const text = await response.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch(`${API_URL}/admin/users`, { headers });
      const data = await response.json();
      if (response.ok) setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch(`${API_URL}/admin/products`, { headers });
      const data = await response.json();
      if (response.ok) setProducts(data.products || []);
    } catch {
      setProducts([]);
    }
  }

  async function loadOrders() {
    try {
      const response = await fetch(`${API_URL}/admin/orders`, { headers });
      const data = await response.json();
      if (response.ok) setOrders(data.orders || []);
    } catch {
      setOrders([]);
    }
  }

  async function loadSlides() {
    try {
      const response = await fetch(`${API_URL}/public/slides`);
      const data = await response.json();

      if (response.ok) {
        setSlides(data.slides || []);
        return;
      }

      setSlides([]);
    } catch (error) {
      console.error('Ошибка загрузки слайдов:', error);
      setSlides([]);
    }
  }

  async function loadSettings() {
    try {
      const response = await fetch(`${API_URL}/public/settings`);
      const data = await response.json();

      if (response.ok) {
        setSiteSettings({ ...defaultSiteSettings, ...(data.settings || {}) });
      }
    } catch {
      setSiteSettings(defaultSiteSettings);
    }
  }

  function handleSettingChange(event) {
    const { name, value } = event.target;
    setSiteSettings((prev) => ({ ...prev, [name]: value }));
  }

  async function saveSettings(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ settings: siteSettings }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось сохранить настройки', 'error');
        return;
      }

      showMessage('Настройки сайта сохранены');
      await loadSettings();
    } catch {
      showMessage('Не удалось сохранить настройки. Проверьте backend.', 'error');
    }
  }

  async function uploadSiteLogo(event, fieldName) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSettingsUploadText('Можно загрузить только изображение.');
      event.target.value = '';
      return;
    }

    setSettingsUploadText('Загрузка логотипа...');

    try {
      const data = await uploadFile(file);
      setSiteSettings((prev) => ({ ...prev, [fieldName]: data.url }));
      setSettingsUploadText('Логотип загружен. Нажмите “Сохранить настройки”.');
    } catch (error) {
      setSettingsUploadText(error.message || 'Не удалось загрузить логотип');
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEditProduct(product) {
    setEditingProductId(product.id);
    setEditForm({
      external_id: product.external_id || '',
      article: product.article || '',
      name: product.name || '',
      category: product.category || '',
      price: product.price || '',
      sizes: product.sizes || '',
      stock: product.stock || '',
      image_url: product.image_url || '',
      description: product.description || '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditProduct() {
    setEditingProductId(null);
    setEditForm(emptyProductForm);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  }

  function getVideoDuration(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Не удалось прочитать длительность видео'));
      };
      video.src = url;
    });
  }

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/admin/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка загрузки файла');
    }

    return data;
  }

  async function uploadProductPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProductUploadText('Для товара можно загрузить только фото.');
      event.target.value = '';
      return;
    }

    setProductUploadText('Загрузка фото...');

    try {
      const data = await uploadFile(file);
      setForm((prev) => ({ ...prev, image_url: data.url }));
      setProductUploadText('Фото загружено');
    } catch (error) {
      setProductUploadText(error.message || 'Не удалось загрузить фото');
    }
  }

  async function uploadEditProductPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('Для товара можно загрузить только фото.', 'warning');
      event.target.value = '';
      return;
    }

    showMessage('Загрузка фото...', 'info');

    try {
      const data = await uploadFile(file);
      setEditForm((prev) => ({ ...prev, image_url: data.url }));
      showMessage('Фото загружено. Нажмите “Сохранить”.');
    } catch (error) {
      showMessage(error.message || 'Не удалось загрузить фото', 'error');
    }
  }

  function makeProductPayload(source) {
    return {
      external_id: String(source.external_id || '').trim(),
      article: String(source.article || '').trim(),
      name: String(source.name || '').trim(),
      category: String(source.category || '').trim(),
      price: Number(source.price || 0),
      sizes: String(source.sizes || '').trim(),
      stock: Number(source.stock || 0),
      image_url: String(source.image_url || '').trim(),
      description: String(source.description || '').trim(),
    };
  }

  function validateProductPayload(payload) {
    if (!payload.name) return 'Введите название товара';
    if (!payload.category) return 'Выберите категорию товара';
    if (!payload.price || payload.price <= 0) return 'Введите цену товара';
    return '';
  }

  async function addProduct(event) {
    event.preventDefault();

    const payload = makeProductPayload(form);
    const errorText = validateProductPayload(payload);

    if (errorText) {
      showMessage(errorText, 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Ошибка добавления товара', 'error');
        return;
      }

      showMessage('Товар добавлен. Теперь его можно опубликовать.');
      setForm(emptyProductForm);
      setProductUploadText('');
      await loadProducts();
    } catch {
      showMessage('Не удалось добавить товар. Проверьте backend.', 'error');
    }
  }

  async function saveEditProduct(id) {
    const payload = makeProductPayload(editForm);
    const errorText = validateProductPayload(payload);

    if (errorText) {
      showMessage(errorText, 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/products/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Ошибка сохранения товара', 'error');
        return;
      }

      showMessage('Товар сохранён');
      setEditingProductId(null);
      setEditForm(emptyProductForm);
      await loadProducts();
    } catch {
      showMessage('Не удалось сохранить товар. Проверьте backend.', 'error');
    }
  }

  function askDeleteProduct(product) {
    setConfirmModal({
      title: 'Удалить товар?',
      text: `Товар “${product.name}” будет удалён без восстановления.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
      onConfirm: () => deleteProduct(product.id),
    });
  }

  async function deleteProduct(id) {
    setConfirmModal(null);

    try {
      const response = await fetch(`${API_URL}/admin/products/${id}`, {
        method: 'DELETE',
        headers,
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Ошибка удаления товара', 'error');
        return;
      }

      showMessage('Товар удалён');
      await loadProducts();
    } catch {
      showMessage('Не удалось удалить товар', 'error');
    }
  }

  async function publishProduct(id) {
    try {
      const response = await fetch(`${API_URL}/admin/products/${id}/publish`, {
        method: 'PATCH',
        headers,
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Ошибка публикации', 'error');
        return;
      }

      showMessage('Товар опубликован');
      await loadProducts();
    } catch {
      showMessage('Не удалось опубликовать товар', 'error');
    }
  }

  async function unpublishProduct(id) {
    try {
      const response = await fetch(`${API_URL}/admin/products/${id}/unpublish`, {
        method: 'PATCH',
        headers,
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Ошибка снятия товара', 'error');
        return;
      }

      showMessage('Товар снят с публикации');
      await loadProducts();
    } catch {
      showMessage('Не удалось снять товар', 'error');
    }
  }

  async function changeOrderStatus(id, status) {
    try {
      const response = await fetch(`${API_URL}/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        showMessage('Не удалось изменить статус', 'error');
        return;
      }

      showMessage('Статус заказа изменён');
      await loadOrders();
    } catch {
      showMessage('Не удалось изменить статус', 'error');
    }
  }

  async function uploadSlideFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (slides.length >= SLIDES_MAX) {
      setSlideUploadText(`Нельзя добавить больше ${SLIDES_MAX} слайдов.`);
      event.target.value = '';
      return;
    }

    const isVideo = file.type.startsWith('video/');

    if (isVideo) {
      try {
        setSlideUploadText('Проверяем длительность видео...');
        const duration = await getVideoDuration(file);

        if (duration > VIDEO_MAX_SECONDS) {
          setSlideUploadText('Видео должно быть не длиннее 1 минуты.');
          event.target.value = '';
          return;
        }
      } catch {
        setSlideUploadText('Не удалось проверить видео. Выберите другой файл.');
        event.target.value = '';
        return;
      }
    }

    setSlideUploadText('Загрузка файла...');

    try {
      const data = await uploadFile(file);
      setSlideForm((prev) => ({
        ...prev,
        image_url: data.url,
        media_type: data.media_type,
      }));
      setSlideUploadText('Файл загружен');
    } catch (error) {
      setSlideUploadText(error.message || 'Не удалось загрузить файл');
    }
  }

  async function addSlide(event) {
    event.preventDefault();

    if (slides.length >= SLIDES_MAX) {
      setSlideUploadText(`Нельзя добавить больше ${SLIDES_MAX} слайдов.`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/slides`, {
        method: 'POST',
        headers,
        body: JSON.stringify(slideForm),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setSlideUploadText(data.message || 'Ошибка добавления слайда');
        return;
      }

      setSlideForm(emptySlideForm);
      setSlideUploadText('');
      showMessage('Слайд добавлен');
      await loadSlides();
    } catch {
      setSlideUploadText('Не удалось добавить слайд');
    }
  }

  async function deleteSlide(id) {
    if (slides.length <= SLIDES_MIN) {
      setSlideUploadText(`Нельзя оставить меньше ${SLIDES_MIN} слайдов.`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/slides/${id}`, {
        method: 'DELETE',
        headers,
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setSlideUploadText(data.message || 'Ошибка удаления слайда');
        return;
      }

      showMessage('Слайд удалён');
      await loadSlides();
    } catch {
      setSlideUploadText('Не удалось удалить слайд');
    }
  }

  function renderProductForm({ mode }) {
    const isEdit = mode === 'edit';
    const values = isEdit ? editForm : form;
    const onChange = isEdit ? handleEditChange : handleChange;

    return (
      <div className="admin-form-grid">
        <input name="external_id" value={values.external_id} onChange={onChange} placeholder="ID из 1С" />
        <input name="article" value={values.article} onChange={onChange} placeholder="Артикул" />
        <input name="name" value={values.name} onChange={onChange} placeholder="Название товара" required />

        <select name="category" value={values.category} onChange={onChange} required>
          <option value="">Категория</option>
          {PRODUCT_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </select>

        <input name="price" type="number" value={values.price} onChange={onChange} placeholder="Цена" required />
        <input name="stock" type="number" value={values.stock} onChange={onChange} placeholder="Остаток" />
        <input name="sizes" value={values.sizes} onChange={onChange} placeholder="Размеры: S, M, L" />
        <input name="image_url" value={values.image_url} onChange={onChange} placeholder="Ссылка на фото" />

        <textarea name="description" value={values.description} onChange={onChange} placeholder="Описание товара" />
      </div>
    );
  }

  return (
    <>
      <Header cartCount={0} />

      <main className="admin-page">
      <div className={`admin-shell ${sidebarOpen ? '' : 'sidebar-hidden'}`}>
        {!sidebarOpen && (
          <button
            type="button"
            className="admin-sidebar-open"
            onClick={() => setSidebarOpen(true)}
            aria-label="Показать меню"
          >
            ☰
          </button>
        )}

        <aside className={`admin-sidebar ${sidebarOpen ? '' : 'hidden'}`}>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Скрыть меню"
          >
            ‹
          </button>
          <div className="admin-brand">
            <div className="admin-logo">T</div>
            <div>
              <strong>TETIM</strong>
              <span>Админ-панель</span>
            </div>
          </div>

          <nav className="admin-nav">
            <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>Товары</button>
            <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Заказы</button>
            <button className={activeTab === 'slides' ? 'active' : ''} onClick={() => setActiveTab('slides')}>Слайды</button>
            <button className={activeTab === 'clients' ? 'active' : ''} onClick={() => setActiveTab('clients')}>Клиенты</button>
            <button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}>Предпросмотр</button>
            <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Настройки сайта</button>
          </nav>

          <div className="admin-sidebar-footer">
            <Link to="/" className="admin-small-link">На сайт</Link>
            <Link to="/account" className="admin-small-link">В кабинет</Link>
            <button type="button" onClick={logout}>Выйти</button>
          </div>
        </aside>

        <section className="admin-content">
          <header className="admin-topbar">
            <div>
              <h1>Панель управления</h1>
              <p>Товары из 1С, публикации, заказы, клиенты и главный баннер</p>
            </div>

            <button type="button" className="btn btn-dark" onClick={loadAll}>Обновить</button>
          </header>

          {message && (
            <div className={`admin-toast admin-toast-${message.type}`}>
              {message.text}
            </div>
          )}

          {confirmModal && (
            <div className="admin-modal-backdrop" onClick={() => setConfirmModal(null)}>
              <div className="admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
                <div className="admin-confirm-icon">!</div>
                <h3>{confirmModal.title}</h3>
                <p>{confirmModal.text}</p>

                <div className="admin-confirm-actions">
                  <button
                    type="button"
                    className="admin-confirm-cancel"
                    onClick={() => setConfirmModal(null)}
                  >
                    {confirmModal.cancelText || 'Отмена'}
                  </button>

                  <button
                    type="button"
                    className={confirmModal.danger ? 'admin-confirm-danger' : 'admin-confirm-ok'}
                    onClick={confirmModal.onConfirm}
                  >
                    {confirmModal.confirmText || 'Подтвердить'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="admin-stats-grid">
            <div className="admin-stat-card">
              <span>Всего товаров</span>
              <strong>{products.length}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Опубликовано</span>
              <strong>{publishedProducts.length}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Черновики / 1С</span>
              <strong>{draftProducts.length}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Новые заказы</span>
              <strong>{newOrders.length}</strong>
            </div>
          </section>

          {activeTab === 'products' && (
            <div className="admin-grid-2">
              <section className="admin-card">
                <div className="admin-card-head">
                  <div>
                    <h2>{editingProductId ? 'Редактировать товар' : 'Добавить товар'}</h2>
                    <p>Новые товары вручную или товары, пришедшие из 1С</p>
                  </div>

                  {editingProductId && (
                    <button type="button" className="btn btn-light" onClick={cancelEditProduct}>Отмена</button>
                  )}
                </div>

                <form className="admin-form" onSubmit={editingProductId ? (e) => { e.preventDefault(); saveEditProduct(editingProductId); } : addProduct}>
                  {renderProductForm({ mode: editingProductId ? 'edit' : 'create' })}

                  <label className="admin-upload-field">
                    <span>{editingProductId ? 'Загрузить новое фото' : 'Загрузить фото товара'}</span>
                    <input type="file" accept="image/*" onChange={editingProductId ? uploadEditProductPhoto : uploadProductPhoto} />
                  </label>

                  {productUploadText && !editingProductId && <div className="admin-note">{productUploadText}</div>}

                  {(editingProductId ? editForm.image_url : form.image_url) && (
                    <>
                      <div className="admin-preview-row">
                        <img src={editingProductId ? editForm.image_url : form.image_url} alt="preview" />
                      </div>

                      <div className="admin-preview-title">Предварительный просмотр товара</div>

                      <article className="admin-product-preview-card">
                        <div className="admin-product-preview-image">
                          <img src={editingProductId ? editForm.image_url : form.image_url} alt={editingProductId ? editForm.name : form.name} />
                        </div>

                        <div className="admin-product-preview-body">
                          <span>{getCategoryLabel(editingProductId ? editForm.category : form.category)}</span>
                          <strong>{editingProductId ? editForm.name || 'Название товара' : form.name || 'Название товара'}</strong>
                          <p>{editingProductId ? editForm.sizes || 'Размеры уточняйте' : form.sizes || 'Размеры уточняйте'}</p>

                          <div className="admin-product-preview-bottom">
                            <b>{formatPrice(editingProductId ? editForm.price : form.price)}</b>
                            <button type="button">В корзину</button>
                          </div>
                        </div>
                      </article>
                    </>
                  )}

                  <button type="submit" className="btn btn-dark full-width">
                    {editingProductId ? 'Сохранить товар' : 'Добавить товар'}
                  </button>
                </form>
              </section>

              <section className="admin-card admin-card-wide">
                <div className="admin-card-head">
                  <div>
                    <h2>Управление товарами</h2>
                    <p>Публикация, редактирование, удаление и товары из 1С</p>
                  </div>

                  <input className="admin-search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Поиск товара" />
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="admin-empty">Товаров пока нет</div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Товар</th>
                          <th>Категория</th>
                          <th>Цена</th>
                          <th>Остаток</th>
                          <th>Статус</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => (
                          <tr key={product.id}>
                            <td>
                              <div className="admin-product-cell">
                                <div className="admin-product-thumb">
                                  {product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>Нет фото</span>}
                                </div>
                                <div>
                                  <strong>{product.name}</strong>
                                  <span>Артикул: {product.article || '—'} · ID 1С: {product.external_id || '—'}</span>
                                </div>
                              </div>
                            </td>
                            <td>{getCategoryLabel(product.category)}</td>
                            <td>{formatPrice(product.price)}</td>
                            <td>{product.stock || 0}</td>
                            <td>
                              <span className={product.is_published ? 'admin-badge success' : 'admin-badge warning'}>
                                {product.is_published ? 'Опубликован' : 'Черновик'}
                              </span>
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                {product.is_published ? (
                                  <button type="button" onClick={() => unpublishProduct(product.id)}>Снять</button>
                                ) : (
                                  <button type="button" onClick={() => publishProduct(product.id)}>Опубликовать</button>
                                )}
                                <button type="button" onClick={() => startEditProduct(product)}>Изменить</button>
                                <button type="button" className="danger" onClick={() => askDeleteProduct(product)}>Удалить</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'orders' && (
            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h2>Заказы</h2>
                  <p>Смена статусов и контроль выгрузки в 1С</p>
                </div>

                <input className="admin-search" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Поиск заказа" />
              </div>

              {filteredOrders.length === 0 ? (
                <div className="admin-empty">Заказов пока нет</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Заказ</th>
                        <th>Клиент</th>
                        <th>Сумма</th>
                        <th>Доставка</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>#{order.id}</strong>
                            <span className="admin-muted">{order.created_at}</span>
                          </td>
                          <td>
                            <strong>{order.customer_name}</strong>
                            <span className="admin-muted">{order.phone}</span>
                            <span className="admin-muted">{order.email}</span>
                          </td>
                          <td>{formatPrice(order.total_amount)}</td>
                          <td>
                            {order.delivery_type === 'pickup' ? 'Самовывоз' : 'Доставка'}
                            {order.address ? <span className="admin-muted">{order.address}</span> : null}
                          </td>
                          <td>
                            <select value={order.status} onChange={(event) => changeOrderStatus(order.id, event.target.value)}>
                              <option value="new">Новый</option>
                              <option value="processing">В обработке</option>
                              <option value="shipped">Отправлен</option>
                              <option value="done">Завершён</option>
                              <option value="cancelled">Отменён</option>
                              <option value="exported_to_1c">Выгружен в 1С</option>
                            </select>
                            <span className="admin-muted">{getStatusLabel(order.status)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === 'slides' && (
            <div className="admin-grid-2">
              <section className="admin-card">
                <div className="admin-card-head">
                  <div>
                    <h2>Добавить слайд</h2>
                    <p>От {SLIDES_MIN} до {SLIDES_MAX} слайдов. Видео — до 1 минуты.</p>
                  </div>
                </div>

                <div className="admin-limit-box">Сейчас слайдов: <strong>{slides.length}</strong> / {SLIDES_MAX}</div>

                <form className="admin-form" onSubmit={addSlide}>
                  <input value={slideForm.title} onChange={(event) => setSlideForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Заголовок" />
                  <input value={slideForm.subtitle} onChange={(event) => setSlideForm((prev) => ({ ...prev, subtitle: event.target.value }))} placeholder="Подзаголовок" />

                  <label className="admin-upload-field">
                    <span>Загрузить фото или видео</span>
                    <input type="file" accept="image/*,video/mp4,video/webm" onChange={uploadSlideFile} disabled={slides.length >= SLIDES_MAX} />
                  </label>

                  {slideUploadText && <div className="admin-note">{slideUploadText}</div>}

                  {slideForm.image_url && (
                    <>
                      <div className="admin-preview-row">
                        {slideForm.media_type === 'video' ? <video src={slideForm.image_url} controls /> : <img src={slideForm.image_url} alt="preview" />}
                      </div>

                      <div className="admin-preview-title">Предварительный просмотр слайда</div>

                      <div
                        className="admin-slide-preview-card"
                        style={{ backgroundColor: slideForm.background_color || '#111111' }}
                      >
                        {slideForm.media_type === 'video' ? (
                          <video src={slideForm.image_url} controls />
                        ) : (
                          <img src={slideForm.image_url} alt={slideForm.title || 'Слайд'} />
                        )}

                        <div className="admin-slide-preview-overlay">
                          <strong>{slideForm.title || 'Заголовок слайда'}</strong>
                          <span>{slideForm.subtitle || 'Подзаголовок слайда'}</span>
                        </div>
                      </div>
                    </>
                  )}

                  <input value={slideForm.image_url} onChange={(event) => setSlideForm((prev) => ({ ...prev, image_url: event.target.value }))} placeholder="Ссылка на картинку или видео" required />

                  <select value={slideForm.media_type} onChange={(event) => setSlideForm((prev) => ({ ...prev, media_type: event.target.value }))}>
                    <option value="image">Фото</option>
                    <option value="video">Видео</option>
                  </select>

                  <input value={slideForm.background_color} onChange={(event) => setSlideForm((prev) => ({ ...prev, background_color: event.target.value }))} placeholder="#111111" />
                  <input type="number" value={slideForm.sort_order} onChange={(event) => setSlideForm((prev) => ({ ...prev, sort_order: event.target.value }))} placeholder="Порядок" />

                  <button className="btn btn-dark full-width" type="submit" disabled={slides.length >= SLIDES_MAX}>Добавить слайд</button>
                </form>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <div>
                    <h2>Список слайдов</h2>
                    <p>Управление главным баннером</p>
                  </div>
                </div>

                {slides.length === 0 ? (
                  <div className="admin-empty">Слайдов пока нет</div>
                ) : (
                  <div className="admin-slide-list">
                    {slides.map((slide) => (
                      <div className="admin-slide-item" key={slide.id}>
                        <div className="admin-slide-media">
                          {slide.media_type === 'video' ? <video src={slide.image_url} /> : <img src={slide.image_url} alt={slide.title || 'Слайд'} />}
                        </div>
                        <div>
                          <strong>{slide.title || 'Слайд'}</strong>
                          <span>{slide.subtitle || 'Без подзаголовка'}</span>
                          <span>Тип: {slide.media_type || 'image'} · Порядок: {slide.sort_order}</span>
                        </div>
                        <button type="button" className="admin-icon-btn danger" onClick={() => deleteSlide(slide.id)} disabled={slides.length <= SLIDES_MIN}>Удалить</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'settings' && (
            <section className="admin-card admin-settings-card">
              <div className="admin-card-head">
                <div>
                  <h2>Настройки сайта</h2>
                  <p>Логотип, тексты главной страницы, контакты, footer и цвета сайта</p>
                </div>
              </div>

              <form className="admin-settings-form" onSubmit={saveSettings}>
                <div className="admin-settings-grid">
                  <label>
                    <span>Название сайта</span>
                    <input name="site_title" value={siteSettings.site_title} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Логотип</span>
                    <input name="logo_url" value={siteSettings.logo_url} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Белый логотип</span>
                    <input name="logo_white_url" value={siteSettings.logo_white_url} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Надпись над заголовком</span>
                    <input name="hero_badge" value={siteSettings.hero_badge} onChange={handleSettingChange} />
                  </label>

                  <label className="wide">
                    <span>Главный заголовок</span>
                    <textarea name="hero_title" value={siteSettings.hero_title} onChange={handleSettingChange} />
                  </label>

                  <label className="wide">
                    <span>Описание на главной</span>
                    <textarea name="hero_text" value={siteSettings.hero_text} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Кнопка 1</span>
                    <input name="hero_button_primary" value={siteSettings.hero_button_primary} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Кнопка 2</span>
                    <input name="hero_button_secondary" value={siteSettings.hero_button_secondary} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Телефон</span>
                    <input name="phone" value={siteSettings.phone} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Email</span>
                    <input name="email" value={siteSettings.email} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Адрес</span>
                    <input name="address" value={siteSettings.address} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Telegram</span>
                    <input name="telegram_url" value={siteSettings.telegram_url} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>WhatsApp</span>
                    <input name="whatsapp_url" value={siteSettings.whatsapp_url} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Instagram</span>
                    <input name="instagram_url" value={siteSettings.instagram_url} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Основной цвет</span>
                    <input name="accent_color" value={siteSettings.accent_color} onChange={handleSettingChange} />
                  </label>

                  <label>
                    <span>Фон сайта</span>
                    <input name="background_color" value={siteSettings.background_color} onChange={handleSettingChange} />
                  </label>

                  <label className="wide">
                    <span>Текст footer</span>
                    <input name="footer_text" value={siteSettings.footer_text} onChange={handleSettingChange} />
                  </label>
                </div>

                <div className="admin-logo-upload-row">
                  <label className="admin-upload-field">
                    <span>Загрузить обычный логотип</span>
                    <input type="file" accept="image/*" onChange={(event) => uploadSiteLogo(event, 'logo_url')} />
                  </label>

                  <label className="admin-upload-field">
                    <span>Загрузить белый логотип</span>
                    <input type="file" accept="image/*" onChange={(event) => uploadSiteLogo(event, 'logo_white_url')} />
                  </label>
                </div>

                {settingsUploadText && <div className="admin-note">{settingsUploadText}</div>}

                <div className="admin-settings-preview">
                  <div style={{ backgroundColor: siteSettings.background_color }}>
                    <img src={siteSettings.logo_url} alt="logo" />
                    <span style={{ backgroundColor: siteSettings.accent_color }}>{siteSettings.hero_badge}</span>
                    <h3>{siteSettings.hero_title}</h3>
                    <p>{siteSettings.hero_text}</p>
                    <b>{siteSettings.footer_text}</b>
                  </div>
                </div>

                <button type="submit" className="btn btn-dark full-width">Сохранить настройки</button>
              </form>
            </section>
          )}

          {activeTab === 'preview' && (
            <section className="admin-card admin-site-preview-card">
              <div className="admin-card-head">
                <div>
                  <h2>Предварительный просмотр сайта</h2>
                  <p>Так будет выглядеть сайт для покупателей. После изменений нажмите “Обновить”.</p>
                </div>

                <div className="admin-preview-actions">
                  <button
                    type="button"
                    className={previewMode === 'desktop' ? 'active' : ''}
                    onClick={() => setPreviewMode('desktop')}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    className={previewMode === 'tablet' ? 'active' : ''}
                    onClick={() => setPreviewMode('tablet')}
                  >
                    Tablet
                  </button>
                  <button
                    type="button"
                    className={previewMode === 'mobile' ? 'active' : ''}
                    onClick={() => setPreviewMode('mobile')}
                  >
                    Mobile
                  </button>
                  <a href="/" target="_blank" rel="noreferrer">Открыть сайт</a>
                </div>
              </div>

              <div className={`admin-site-preview-shell ${previewMode}`}>
                <iframe
                  title="Предпросмотр сайта TETIM"
                  src="/"
                  className="admin-site-preview-frame"
                />
              </div>
            </section>
          )}

          {activeTab === 'clients' && (
            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h2>Клиенты</h2>
                  <p>Пользователи сайта и их роли</p>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="admin-empty">Клиентов пока нет</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Имя</th>
                        <th>Email</th>
                        <th>Телефон</th>
                        <th>Роль</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.name}</strong></td>
                          <td>{item.email}</td>
                          <td>{item.phone || '—'}</td>
                          <td><span className="admin-badge">{item.role}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </section>
      </div>
      </main>

      <Footer />
    </>
  );
}
