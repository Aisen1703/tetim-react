import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const API_URL = 'http://localhost:4000/api';

const CATEGORIES = [
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

const BLOCK_TYPES = [
  { value: 'hero', label: 'Главный экран' },
  { value: 'slider', label: 'Слайдер' },
  { value: 'categories', label: 'Категории' },
  { value: 'products', label: 'Товары' },
  { value: 'text_image', label: 'Текст + фото' },
  { value: 'banner', label: 'Баннер' },
  { value: 'contacts', label: 'Контакты' },
  { value: 'footer', label: 'Footer' },
];

const emptyProductForm = {
  external_id: '',
  article: '',
  name: '',
  category: '',
  price: '',
  sizes: 'S, M, L',
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
  background_color: '#ffffff',
  text_color: '#111111',
  sort_order: 1,
  is_active: true,
  content_json: '{}',
};

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function getCategoryLabel(value) {
  return CATEGORIES.find((item) => item.value === value)?.label || value || 'Каталог';
}

function getBlockTypeLabel(value) {
  return BLOCK_TYPES.find((item) => item.value === value)?.label || value || 'Блок';
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getDefaultJsonByType(type) {
  if (type === 'slider') {
    return JSON.stringify(
      {
        source: 'admin_slides',
        autoplay: true,
        interval: 4000,
        showDots: true,
      },
      null,
      2
    );
  }

  if (type === 'hero') {
    return JSON.stringify(
      {
        badge: 'Новая коллекция',
        buttonText: 'Каталог',
        buttonLink: '/catalog',
        secondButtonText: 'Индивидуальный заказ',
        secondButtonLink: '/custom-order',
      },
      null,
      2
    );
  }

  if (type === 'categories') {
    return JSON.stringify(
      {
        items: [
          { title: 'Худи', link: '/catalog?category=sweatshirts' },
          { title: 'Футболки', link: '/catalog?category=tshirts-longsleeves' },
          { title: 'Куртки', link: '/catalog?category=jackets' },
        ],
      },
      null,
      2
    );
  }

  if (type === 'products') {
    return JSON.stringify(
      {
        limit: 8,
        buttonText: 'Смотреть все',
        buttonLink: '/catalog',
      },
      null,
      2
    );
  }

  if (type === 'text_image' || type === 'banner') {
    return JSON.stringify(
      {
        text: 'Текст блока',
        buttonText: 'Подробнее',
        buttonLink: '/catalog',
      },
      null,
      2
    );
  }

  if (type === 'contacts') {
    return JSON.stringify(
      {
        phone: '+7 999 060 00 75',
        email: 'info@tetim.ru',
        address: 'Якутск',
      },
      null,
      2
    );
  }

  return '{}';
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem('token') || '';
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [activeTab, setActiveTab] = useState('products');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [builderPreviewOpen, setBuilderPreviewOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [slides, setSlides] = useState([]);
  const [pageBlocks, setPageBlocks] = useState([]);

  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editProductId, setEditProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState(emptyProductForm);

  const [slideForm, setSlideForm] = useState(emptySlideForm);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [blockForm, setBlockForm] = useState(emptyBlockForm);
  const [themeForm, setThemeForm] = useState({
    site_theme: 'auto',
    holiday_theme_enabled: '1',
    header_ornament_url: '/assets/sakha-ornament.png',
    background_pattern_url: '',
    decor_image_url: '',
    snow_enabled: '0',
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
  });

  const [productSearch, setProductSearch] = useState('');
  const [message, setMessage] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const builderEditorRef = useRef(null);

  const stats = useMemo(() => {
    const published = products.filter((item) => Number(item.is_published) === 1).length;
    const drafts = products.length - published;
    const newOrders = orders.filter((item) => item.status === 'new').length;

    return {
      totalProducts: products.length,
      published,
      drafts,
      newOrders,
    };
  }, [products, orders]);

  const filteredProducts = useMemo(() => {
    const text = productSearch.trim().toLowerCase();

    if (!text) {
      return products;
    }

    return products.filter((product) => {
      return (
        String(product.name || '').toLowerCase().includes(text) ||
        String(product.article || '').toLowerCase().includes(text) ||
        String(product.external_id || '').toLowerCase().includes(text) ||
        String(product.category || '').toLowerCase().includes(text)
      );
    });
  }, [products, productSearch]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
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
      loadPageBlocks(),
      loadThemeSettings(),
    ]);
  }

  function showMessage(text, type = 'success') {
    setMessage({ text, type });

    setTimeout(() => {
      setMessage(null);
    }, 2500);
  }

  async function loadUsers() {
    try {
      const response = await fetch(`${API_URL}/admin/users`, { headers });
      const data = await safeJson(response);
      setUsers(response.ok ? data.users || [] : []);
    } catch {
      setUsers([]);
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch(`${API_URL}/admin/products`, { headers });
      const data = await safeJson(response);
      setProducts(response.ok ? data.products || [] : []);
    } catch {
      setProducts([]);
    }
  }

  async function loadOrders() {
    try {
      const response = await fetch(`${API_URL}/admin/orders`, { headers });
      const data = await safeJson(response);
      setOrders(response.ok ? data.orders || [] : []);
    } catch {
      setOrders([]);
    }
  }

  async function loadSlides() {
    try {
      const response = await fetch(`${API_URL}/admin/slides`, { headers });
      const data = await safeJson(response);
      setSlides(response.ok ? data.slides || [] : []);
    } catch {
      setSlides([]);
    }
  }

  async function loadThemeSettings() {
    try {
      const response = await fetch(`${API_URL}/admin/settings`, { headers });
      const data = await safeJson(response);

      if (response.ok) {
        setThemeForm((prev) => ({
          ...prev,
          ...(data.settings || {}),
        }));
      }
    } catch {
      showMessage('Не удалось загрузить оформление', 'error');
    }
  }

  async function saveThemeSettings() {
    try {
      const response = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          settings: themeForm,
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось сохранить оформление', 'error');
        return;
      }

      showMessage('Оформление сайта сохранено');
    } catch {
      showMessage('Ошибка сохранения оформления', 'error');
    }
  }

  async function uploadThemeImage(event, fieldName) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await uploadFile(file);

      setThemeForm((prev) => ({
        ...prev,
        [fieldName]: data.url,
      }));

      showMessage('Рисунок загружен');
    } catch (error) {
      showMessage(error.message || 'Не удалось загрузить рисунок', 'error');
    }
  }

  async function loadPageBlocks() {
    try {
      const response = await fetch(`${API_URL}/admin/page-blocks?page=home`, { headers });
      const data = await safeJson(response);

      if (response.ok) {
        const blocks = data.blocks || [];
        setPageBlocks(blocks);

        if (!selectedBlockId && blocks.length > 0) {
          selectBlock(blocks[0]);
        }
      } else {
        setPageBlocks([]);
      }
    } catch {
      setPageBlocks([]);
    }
  }

  function handleProductChange(event, target = 'new') {
    const { name, value } = event.target;

    if (target === 'edit') {
      setEditProductForm((prev) => ({ ...prev, [name]: value }));
      return;
    }

    setProductForm((prev) => ({ ...prev, [name]: value }));
  }

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/admin/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка загрузки файла');
    }

    return data;
  }

  async function uploadProductImage(event, target = 'new') {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await uploadFile(file);

      if (target === 'edit') {
        setEditProductForm((prev) => ({ ...prev, image_url: data.url }));
      } else {
        setProductForm((prev) => ({ ...prev, image_url: data.url }));
      }

      showMessage('Фото товара загружено');
    } catch (error) {
      showMessage(error.message || 'Не удалось загрузить фото', 'error');
    }
  }

  async function importProductsFromExcel(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/admin/products/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось импортировать товары', 'error');
        return;
      }

      showMessage(
        `Импорт готов: добавлено ${data.created || 0}, обновлено ${data.updated || 0}, пропущено ${data.skipped || 0}`
      );

      await loadProducts();
    } catch {
      showMessage('Ошибка импорта Excel', 'error');
    } finally {
      event.target.value = '';
    }
  }

  async function createProduct(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API_URL}/admin/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(productForm),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось добавить товар', 'error');
        return;
      }

      showMessage('Товар добавлен');
      setProductForm(emptyProductForm);
      await loadProducts();
    } catch {
      showMessage('Ошибка добавления товара', 'error');
    }
  }

  function startEditProduct(product) {
    setEditProductId(product.id);
    setEditProductForm({
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
  }

  async function saveProductEdit(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API_URL}/admin/products/${editProductId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(editProductForm),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось сохранить товар', 'error');
        return;
      }

      showMessage('Товар сохранён');
      setEditProductId(null);
      setEditProductForm(emptyProductForm);
      await loadProducts();
    } catch {
      showMessage('Ошибка сохранения товара', 'error');
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
        showMessage(data.message || 'Не удалось опубликовать', 'error');
        return;
      }

      showMessage('Товар опубликован');
      await loadProducts();
    } catch {
      showMessage('Ошибка публикации', 'error');
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
        showMessage(data.message || 'Не удалось снять товар', 'error');
        return;
      }

      showMessage('Товар снят с публикации');
      await loadProducts();
    } catch {
      showMessage('Ошибка снятия товара', 'error');
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
        showMessage(data.message || 'Не удалось удалить товар', 'error');
        return;
      }

      showMessage('Товар удалён');
      await loadProducts();
    } catch {
      showMessage('Ошибка удаления товара', 'error');
    }
  }

  async function uploadSlideMedia(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await uploadFile(file);

      setSlideForm((prev) => ({
        ...prev,
        image_url: data.url,
        media_type: data.media_type || prev.media_type,
      }));

      showMessage('Файл слайда загружен');
    } catch (error) {
      showMessage(error.message || 'Не удалось загрузить слайд', 'error');
    }
  }

  async function createSlide(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API_URL}/admin/slides`, {
        method: 'POST',
        headers,
        body: JSON.stringify(slideForm),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось добавить слайд', 'error');
        return;
      }

      showMessage('Слайд добавлен');
      setSlideForm(emptySlideForm);
      await loadSlides();
    } catch {
      showMessage('Ошибка добавления слайда', 'error');
    }
  }

  async function deleteSlide(id) {
    setConfirmModal({
      title: 'Удалить слайд?',
      text: 'Слайд будет удалён с главного баннера.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);

        try {
          const response = await fetch(`${API_URL}/admin/slides/${id}`, {
            method: 'DELETE',
            headers,
          });

          const data = await safeJson(response);

          if (!response.ok) {
            showMessage(data.message || 'Не удалось удалить слайд', 'error');
            return;
          }

          showMessage('Слайд удалён');
          await loadSlides();
        } catch {
          showMessage('Ошибка удаления слайда', 'error');
        }
      },
    });
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const response = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось изменить статус', 'error');
        return;
      }

      showMessage('Статус заказа изменён');
      await loadOrders();
    } catch {
      showMessage('Ошибка изменения статуса', 'error');
    }
  }

  function selectBlock(block) {
    setSelectedBlockId(block.id);

    let prettyJson = block.content_json || '{}';

    try {
      prettyJson = JSON.stringify(JSON.parse(prettyJson), null, 2);
    } catch {
      prettyJson = block.content_json || '{}';
    }

    setBlockForm({
      page: block.page || 'home',
      type: block.type || 'hero',
      title: block.title || '',
      subtitle: block.subtitle || '',
      image_url: block.image_url || '',
      background_color: block.background_color || '#ffffff',
      text_color: block.text_color || '#111111',
      sort_order: Number(block.sort_order || 0),
      is_active: Number(block.is_active) === 1,
      content_json: prettyJson,
    });

    setTimeout(() => {
      builderEditorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }

  function createEmptyBlock(type = 'text_image') {
    const nextOrder =
      pageBlocks.length > 0
        ? Math.max(...pageBlocks.map((item) => Number(item.sort_order || 0))) + 1
        : 1;

    setActiveTab('builder');
    setSelectedBlockId(null);
    setBlockForm({
      ...emptyBlockForm,
      type,
      sort_order: nextOrder,
      title: getBlockTypeLabel(type),
      content_json: getDefaultJsonByType(type),
    });

    setTimeout(() => {
      builderEditorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }

  function handleBlockTypeChange(type) {
    setBlockForm((prev) => ({
      ...prev,
      type,
      title: prev.title || getBlockTypeLabel(type),
      content_json: getDefaultJsonByType(type),
    }));
  }

  async function savePageBlock(event) {
    event.preventDefault();

    let parsed = {};

    try {
      parsed = JSON.parse(blockForm.content_json || '{}');
    } catch {
      showMessage('JSON блока заполнен неправильно', 'error');
      return;
    }

    const payload = {
      ...blockForm,
      content_json: JSON.stringify(parsed),
      is_active: blockForm.is_active,
    };

    const url = selectedBlockId
      ? `${API_URL}/admin/page-blocks/${selectedBlockId}`
      : `${API_URL}/admin/page-blocks`;

    const method = selectedBlockId ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось сохранить блок', 'error');
        return;
      }

      showMessage(selectedBlockId ? 'Блок сохранён' : 'Блок добавлен');
      await loadPageBlocks();
    } catch {
      showMessage('Ошибка сохранения блока', 'error');
    }
  }

  async function uploadBlockImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await uploadFile(file);

      setBlockForm((prev) => ({
        ...prev,
        image_url: data.url,
      }));

      showMessage('Изображение блока загружено');
    } catch (error) {
      showMessage(error.message || 'Не удалось загрузить изображение', 'error');
    }
  }

  function deletePageBlock(id) {
    setConfirmModal({
      title: 'Удалить блок?',
      text: 'Блок будет удалён со страницы без восстановления.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);

        try {
          const response = await fetch(`${API_URL}/admin/page-blocks/${id}`, {
            method: 'DELETE',
            headers,
          });

          const data = await safeJson(response);

          if (!response.ok) {
            showMessage(data.message || 'Не удалось удалить блок', 'error');
            return;
          }

          showMessage('Блок удалён');
          setSelectedBlockId(null);
          await loadPageBlocks();
        } catch {
          showMessage('Ошибка удаления блока', 'error');
        }
      },
    });
  }

  async function moveBlock(block, direction) {
    if (!block) return;

    const nextOrder = Number(block.sort_order || 0) + direction;

    if (nextOrder < 1) return;

    try {
      const response = await fetch(`${API_URL}/admin/page-blocks/${block.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          ...block,
          sort_order: nextOrder,
          is_active: Number(block.is_active) === 1,
        }),
      });

      if (response.ok) {
        await loadPageBlocks();
      }
    } catch {
      showMessage('Не удалось изменить порядок', 'error');
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
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

            <div>
              <div className="admin-brand">
                <strong>TETIM</strong>
                <span>Админ-панель</span>
              </div>

              <nav className="admin-nav">
                <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>Товары</button>
                <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Заказы</button>
                <button className={activeTab === 'slides' ? 'active' : ''} onClick={() => setActiveTab('slides')}>Слайды</button>
                <button className={activeTab === 'clients' ? 'active' : ''} onClick={() => setActiveTab('clients')}>Клиенты</button>
                <button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}>Предпросмотр</button>
                <button className={activeTab === 'builder' ? 'active' : ''} onClick={() => setActiveTab('builder')}>Конструктор сайта</button>
                <button className={activeTab === 'appearance' ? 'active' : ''} onClick={() => setActiveTab('appearance')}>Оформление сайта</button>
              </nav>
            </div>

            <div className="admin-sidebar-footer">
              <Link to="/" className="admin-small-link">На сайт</Link>
              <Link to="/account" className="admin-small-link">В кабинет</Link>
              <button type="button" onClick={logout}>Выйти</button>
            </div>
          </aside>

          <section className="admin-content">
            <div className="admin-topbar">
              <div>
                <h1>Панель управления</h1>
                <p>Товары из 1С, публикации, заказы, клиенты и конструктор сайта</p>
              </div>

              <button type="button" className="btn btn-dark" onClick={loadAll}>Обновить</button>
            </div>

            <div className="admin-stats-grid">
              <div className="admin-stat-card"><span>Всего товаров</span><strong>{stats.totalProducts}</strong></div>
              <div className="admin-stat-card"><span>Опубликовано</span><strong>{stats.published}</strong></div>
              <div className="admin-stat-card"><span>Черновики / 1С</span><strong>{stats.drafts}</strong></div>
              <div className="admin-stat-card"><span>Новые заказы</span><strong>{stats.newOrders}</strong></div>
            </div>

            {activeTab === 'products' && (
              <div className="admin-grid-2">
                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <h2>Добавить товар</h2>
                      <p>Новые товары вручную, из 1С или импортом из Excel</p>
                    </div>
                  </div>

                  <label className="admin-excel-import">
                    <span>Загрузить товары из Excel / CSV / ODS</span>
                    <small>Поддержка: .xlsx, .xls, .csv, .ods, .tsv, .txt</small>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.ods,.tsv,.txt"
                      onChange={importProductsFromExcel}
                    />
                  </label>

                  <form className="admin-form" onSubmit={createProduct}>
                    <input name="external_id" value={productForm.external_id} onChange={handleProductChange} placeholder="ID из 1С" />
                    <input name="article" value={productForm.article} onChange={handleProductChange} placeholder="Артикул" />
                    <input name="name" value={productForm.name} onChange={handleProductChange} placeholder="Название товара" required />

                    <select name="category" value={productForm.category} onChange={handleProductChange} required>
                      <option value="">Категория</option>
                      {CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>{category.label}</option>
                      ))}
                    </select>

                    <input name="price" type="number" value={productForm.price} onChange={handleProductChange} placeholder="Цена" required />
                    <input name="stock" type="number" value={productForm.stock} onChange={handleProductChange} placeholder="Остаток" />
                    <input name="sizes" value={productForm.sizes} onChange={handleProductChange} placeholder="Размеры: S, M, L" />

                    <label className="admin-upload-field">
                      <span>Загрузить фото товара</span>
                      <input type="file" accept="image/*" onChange={(event) => uploadProductImage(event, 'new')} />
                    </label>

                    <input name="image_url" value={productForm.image_url} onChange={handleProductChange} placeholder="Ссылка на фото" />
                    <textarea name="description" value={productForm.description} onChange={handleProductChange} placeholder="Описание" />

                    {productForm.image_url && (
                      <article className="admin-product-preview-card">
                        <div className="admin-product-preview-image">
                          <img src={productForm.image_url} alt={productForm.name} />
                        </div>
                        <div className="admin-product-preview-body">
                          <span>{getCategoryLabel(productForm.category)}</span>
                          <strong>{productForm.name || 'Название товара'}</strong>
                          <p>{productForm.sizes || 'Размеры уточняйте'}</p>
                          <div className="admin-product-preview-bottom">
                            <b>{formatPrice(productForm.price)}</b>
                            <button type="button">В корзину</button>
                          </div>
                        </div>
                      </article>
                    )}

                    <button type="submit" className="btn btn-dark full-width">Добавить товар</button>
                  </form>
                </section>

                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <h2>Управление товарами</h2>
                      <p>Публикация, редактирование, удаление и товары из 1С</p>
                    </div>
                    <input className="admin-search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Поиск товара" />
                  </div>

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
                                  {product.image_url ? <img src={product.image_url} alt={product.name} /> : 'Нет фото'}
                                </div>
                                <div>
                                  <strong>{product.name}</strong>
                                  <span>Артикул: {product.article || '—'} · ID 1C: {product.external_id || '—'}</span>
                                </div>
                              </div>
                            </td>
                            <td>{getCategoryLabel(product.category)}</td>
                            <td>{formatPrice(product.price)}</td>
                            <td>{product.stock}</td>
                            <td>
                              <span className={`admin-badge ${Number(product.is_published) === 1 ? 'success' : 'warning'}`}>
                                {Number(product.is_published) === 1 ? 'Опубликован' : 'Черновик'}
                              </span>
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                {Number(product.is_published) === 1 ? (
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

                    {filteredProducts.length === 0 && <div className="admin-empty">Товаров пока нет</div>}
                  </div>

                  {editProductId && (
                    <form className="admin-product-edit" onSubmit={saveProductEdit}>
                      <div>
                        <h3>Редактировать товар</h3>
                        <div className="admin-product-edit-grid">
                          <input name="external_id" value={editProductForm.external_id} onChange={(event) => handleProductChange(event, 'edit')} placeholder="ID из 1С" />
                          <input name="article" value={editProductForm.article} onChange={(event) => handleProductChange(event, 'edit')} placeholder="Артикул" />
                          <input name="name" value={editProductForm.name} onChange={(event) => handleProductChange(event, 'edit')} placeholder="Название" required />
                          <select name="category" value={editProductForm.category} onChange={(event) => handleProductChange(event, 'edit')} required>
                            <option value="">Категория</option>
                            {CATEGORIES.map((category) => (
                              <option key={category.value} value={category.value}>{category.label}</option>
                            ))}
                          </select>
                          <input name="price" type="number" value={editProductForm.price} onChange={(event) => handleProductChange(event, 'edit')} placeholder="Цена" required />
                          <input name="stock" type="number" value={editProductForm.stock} onChange={(event) => handleProductChange(event, 'edit')} placeholder="Остаток" />
                          <input name="sizes" value={editProductForm.sizes} onChange={(event) => handleProductChange(event, 'edit')} placeholder="Размеры" />
                          <input name="image_url" value={editProductForm.image_url} onChange={(event) => handleProductChange(event, 'edit')} placeholder="Фото" />
                        </div>

                        <label className="admin-upload-field">
                          <span>Заменить фото</span>
                          <input type="file" accept="image/*" onChange={(event) => uploadProductImage(event, 'edit')} />
                        </label>

                        <textarea name="description" value={editProductForm.description} onChange={(event) => handleProductChange(event, 'edit')} placeholder="Описание" />

                        <div className="admin-edit-actions">
                          <button type="button" className="btn btn-light" onClick={() => setEditProductId(null)}>Отмена</button>
                          <button type="submit" className="btn btn-dark">Сохранить</button>
                        </div>
                      </div>

                      <div className="admin-product-preview">
                        {editProductForm.image_url ? <img src={editProductForm.image_url} alt={editProductForm.name} /> : 'Нет фото'}
                      </div>
                    </form>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'orders' && (
              <section className="admin-card">
                <div className="admin-card-head">
                  <div>
                    <h2>Заказы</h2>
                    <p>Смена статуса заказов покупателей</p>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Клиент</th>
                        <th>Контакты</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>{order.customer_name}</td>
                          <td>{order.phone}<br />{order.email}</td>
                          <td>{formatPrice(order.total_amount)}</td>
                          <td>
                            <select value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value)}>
                              <option value="new">Новый</option>
                              <option value="processing">В работе</option>
                              <option value="completed">Выполнен</option>
                              <option value="cancelled">Отменён</option>
                            </select>
                          </td>
                          <td>{order.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {orders.length === 0 && <div className="admin-empty">Заказов пока нет</div>}
                </div>
              </section>
            )}

            {activeTab === 'slides' && (
              <div className="admin-grid-2">
                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <h2>Добавить слайд</h2>
                      <p>От 0 до 10 слайдов. Видео — до 1 минуты.</p>
                    </div>
                  </div>

                  <form className="admin-form" onSubmit={createSlide}>
                    <div className="admin-limit-box">Сейчас слайдов: {slides.length} / 10</div>
                    <input value={slideForm.title} onChange={(event) => setSlideForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Заголовок" />
                    <input value={slideForm.subtitle} onChange={(event) => setSlideForm((prev) => ({ ...prev, subtitle: event.target.value }))} placeholder="Подзаголовок" />

                    <label className="admin-upload-field">
                      <span>Загрузить фото или видео</span>
                      <input type="file" accept="image/*,video/*" onChange={uploadSlideMedia} />
                    </label>

                    <input value={slideForm.image_url} onChange={(event) => setSlideForm((prev) => ({ ...prev, image_url: event.target.value }))} placeholder="Ссылка появится после загрузки файла" />
                    <select value={slideForm.media_type} onChange={(event) => setSlideForm((prev) => ({ ...prev, media_type: event.target.value }))}>
                      <option value="image">Фото</option>
                      <option value="video">Видео</option>
                    </select>
                    <input value={slideForm.background_color} onChange={(event) => setSlideForm((prev) => ({ ...prev, background_color: event.target.value }))} placeholder="#111111" />
                    <input type="number" value={slideForm.sort_order} onChange={(event) => setSlideForm((prev) => ({ ...prev, sort_order: Number(event.target.value) }))} placeholder="Порядок" />

                    {slideForm.image_url && (
                      <div className="admin-slide-preview-card" style={{ backgroundColor: slideForm.background_color }}>
                        {slideForm.media_type === 'video' ? (
                          <video src={slideForm.image_url} controls />
                        ) : (
                          <img src={slideForm.image_url} alt={slideForm.title || 'Слайд'} />
                        )}
                      </div>
                    )}

                    <button type="submit" className="btn btn-dark full-width">Добавить слайд</button>
                  </form>
                </section>

                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <h2>Список слайдов</h2>
                      <p>Управление главным баннером</p>
                    </div>
                  </div>

                  <div className="admin-slide-list">
                    {slides.map((slide) => (
                      <div key={slide.id} className="admin-slide-item">
                        <div className="admin-slide-media">
                          {slide.media_type === 'video' ? <video src={slide.image_url} /> : <img src={slide.image_url} alt={slide.title || 'Слайд'} />}
                        </div>
                        <div>
                          <strong>{slide.title || 'Без заголовка'}</strong>
                          <span>{slide.image_url}</span>
                        </div>
                        <button type="button" className="admin-icon-btn danger" onClick={() => deleteSlide(slide.id)}>Удалить</button>
                      </div>
                    ))}

                    {slides.length === 0 && <div className="admin-empty">Слайдов пока нет</div>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'clients' && (
              <section className="admin-card">
                <div className="admin-card-head">
                  <div>
                    <h2>Клиенты</h2>
                    <p>Зарегистрированные пользователи сайта</p>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Имя</th>
                        <th>Email</th>
                        <th>Телефон</th>
                        <th>Роль</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.email}</td>
                          <td>{item.phone}</td>
                          <td>{item.role}</td>
                          <td>{item.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {users.length === 0 && <div className="admin-empty">Клиентов пока нет</div>}
                </div>
              </section>
            )}

            {activeTab === 'preview' && (
              <section className="admin-card admin-site-preview-card">
                <div className="admin-card-head">
                  <div>
                    <h2>Предварительный просмотр сайта</h2>
                    <p>Так будет выглядеть сайт для покупателей</p>
                  </div>

                  <div className="admin-preview-actions">
                    <button type="button" className={previewMode === 'desktop' ? 'active' : ''} onClick={() => setPreviewMode('desktop')}>Desktop</button>
                    <button type="button" className={previewMode === 'tablet' ? 'active' : ''} onClick={() => setPreviewMode('tablet')}>Tablet</button>
                    <button type="button" className={previewMode === 'mobile' ? 'active' : ''} onClick={() => setPreviewMode('mobile')}>Mobile</button>
                    <a href="/" target="_blank" rel="noreferrer">Открыть сайт</a>
                  </div>
                </div>

                <div className={`admin-site-preview-shell ${previewMode}`}>
                  <iframe title="Предпросмотр сайта TETIM" src="/" className="admin-site-preview-frame" />
                </div>
              </section>
            )}

            {activeTab === 'appearance' && (
              <section className="builder-theme-card appearance-page-card">
                <div className="builder-theme-head">
                  <div>
                    <h2>Оформление сайта</h2>
                    <p>Отдельный раздел для темы сайта, орнамента, фона и праздничного декора</p>
                  </div>

                  <button type="button" onClick={saveThemeSettings}>
                    Сохранить оформление
                  </button>
                </div>

                <div className="builder-theme-grid">
                  <label>
                    <span>Тема сайта</span>
                    <select
                      value={themeForm.site_theme}
                      onChange={(event) =>
                        setThemeForm((prev) => ({
                          ...prev,
                          site_theme: event.target.value,
                        }))
                      }
                    >
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
                    <select
                      value={themeForm.holiday_theme_enabled}
                      onChange={(event) =>
                        setThemeForm((prev) => ({
                          ...prev,
                          holiday_theme_enabled: event.target.value,
                        }))
                      }
                    >
                      <option value="1">Включены</option>
                      <option value="0">Выключены</option>
                    </select>
                  </label>

                  <label>
                    <span>Снег</span>
                    <select
                      value={themeForm.snow_enabled}
                      onChange={(event) =>
                        setThemeForm((prev) => ({
                          ...prev,
                          snow_enabled: event.target.value,
                        }))
                      }
                    >
                      <option value="0">Выключен</option>
                      <option value="1">Включен</option>
                    </select>
                  </label>

                  <label className="wide">
                    <span>Орнамент header</span>
                    <input
                      value={themeForm.header_ornament_url}
                      onChange={(event) =>
                        setThemeForm((prev) => ({
                          ...prev,
                          header_ornament_url: event.target.value,
                        }))
                      }
                      placeholder="/assets/sakha-ornament.png"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => uploadThemeImage(event, 'header_ornament_url')}
                    />
                  </label>

                  <label className="wide">
                    <span>Фоновый рисунок сайта</span>
                    <input
                      value={themeForm.background_pattern_url}
                      onChange={(event) =>
                        setThemeForm((prev) => ({
                          ...prev,
                          background_pattern_url: event.target.value,
                        }))
                      }
                      placeholder="Ссылка на фон"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => uploadThemeImage(event, 'background_pattern_url')}
                    />
                  </label>

                  <label className="wide">
                    <span>Декоративный рисунок</span>
                    <input
                      value={themeForm.decor_image_url}
                      onChange={(event) =>
                        setThemeForm((prev) => ({
                          ...prev,
                          decor_image_url: event.target.value,
                        }))
                      }
                      placeholder="Например снежинка, узор, новогодний декор"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => uploadThemeImage(event, 'decor_image_url')}
                    />
                  </label>
                </div>

                <div className={`builder-theme-preview theme-${themeForm.site_theme}`}>
                  {themeForm.header_ornament_url && (
                    <img src={themeForm.header_ornament_url} alt="" />
                  )}

                  <h2>
                    {themeForm.site_theme === 'newyear'
                      ? 'Новогодняя тема TETIM'
                      : 'Тема сайта TETIM'}
                  </h2>

                  <p>Здесь администратор видит, как будет выглядеть оформление сайта.</p>
                </div>
              </section>
            )}

            {activeTab === 'builder' && (
              <section className="builder-panel">
                <div className="builder-top">
                  <div>
                    <h2>Конструктор сайта</h2>
                    <p>Собирайте главную страницу из блоков: как в Tilda</p>
                  </div>

                  <div className="builder-add-actions">
                    <button
                      type="button"
                      className="builder-preview-open-btn"
                      onClick={() => setBuilderPreviewOpen(true)}
                    >
                      Предпросмотр сайта
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        createEmptyBlock('hero');
                        showMessage('Блок “Главный экран” готов к добавлению');
                      }}
                    >
                      + Главный экран
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        createEmptyBlock('slider');
                        showMessage('Блок “Слайдер” готов к добавлению');
                      }}
                    >
                      + Слайдер
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        createEmptyBlock('categories');
                        showMessage('Блок “Категории” готов к добавлению');
                      }}
                    >
                      + Категории
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        createEmptyBlock('products');
                        showMessage('Блок “Товары” готов к добавлению');
                      }}
                    >
                      + Товары
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        createEmptyBlock('text_image');
                        showMessage('Блок “Текст + фото” готов к добавлению');
                      }}
                    >
                      + Текст + фото
                    </button>
                  </div>
                </div>

                <div className="builder-layout">
                  <aside className="builder-blocks">
                    <div className="builder-blocks-head">
                      <strong>Блоки страницы</strong>
                      <span>{pageBlocks.length}</span>
                    </div>

                    {pageBlocks.length === 0 ? (
                      <div className="admin-empty">Блоков пока нет</div>
                    ) : (
                      pageBlocks.map((block) => (
                        <button
                          key={block.id}
                          type="button"
                          className={`builder-block-card ${selectedBlockId === block.id ? 'active' : ''}`}
                          onClick={() => selectBlock(block)}
                        >
                          <span>{getBlockTypeLabel(block.type)}</span>
                          <strong>{block.title || 'Без названия'}</strong>
                          <small>#{block.sort_order} · {Number(block.is_active) === 1 ? 'Включён' : 'Скрыт'}</small>
                        </button>
                      ))
                    )}
                  </aside>

                  <form ref={builderEditorRef} className="builder-editor" onSubmit={savePageBlock}>
                    <div className="builder-editor-head">
                      <div>
                        <h3>{selectedBlockId ? 'Редактировать блок' : 'Новый блок'}</h3>
                        <p>Изменения сохраняются в базу и потом выводятся на главной странице.</p>
                      </div>

                      {selectedBlockId && (
                        <button type="button" className="builder-delete-btn" onClick={() => deletePageBlock(selectedBlockId)}>Удалить</button>
                      )}
                    </div>

                    <div className="builder-form-grid">
                      <label>
                        <span>Тип блока</span>
                        <select value={blockForm.type} onChange={(event) => handleBlockTypeChange(event.target.value)}>
                          {BLOCK_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Порядок</span>
                        <input type="number" value={blockForm.sort_order} onChange={(event) => setBlockForm((prev) => ({ ...prev, sort_order: Number(event.target.value) }))} />
                      </label>

                      <label className="wide">
                        <span>Заголовок</span>
                        <input value={blockForm.title} onChange={(event) => setBlockForm((prev) => ({ ...prev, title: event.target.value }))} />
                      </label>

                      <label className="wide">
                        <span>Подзаголовок / текст</span>
                        <textarea value={blockForm.subtitle} onChange={(event) => setBlockForm((prev) => ({ ...prev, subtitle: event.target.value }))} />
                      </label>

                      <label className="builder-color-field">
                        <span>Фон</span>

                        <div className="builder-color-row">
                          <input
                            type="color"
                            value={blockForm.background_color || '#ffffff'}
                            onChange={(event) =>
                              setBlockForm((prev) => ({
                                ...prev,
                                background_color: event.target.value,
                              }))
                            }
                            aria-label="Выбрать цвет фона"
                          />

                          <input
                            value={blockForm.background_color}
                            onChange={(event) =>
                              setBlockForm((prev) => ({
                                ...prev,
                                background_color: event.target.value,
                              }))
                            }
                            placeholder="#ffffff"
                          />

                          <b
                            className="builder-color-sample"
                            style={{ backgroundColor: blockForm.background_color || '#ffffff' }}
                            title={blockForm.background_color || '#ffffff'}
                          />
                        </div>
                      </label>

                      <label className="builder-color-field">
                        <span>Цвет текста</span>

                        <div className="builder-color-row">
                          <input
                            type="color"
                            value={blockForm.text_color || '#111111'}
                            onChange={(event) =>
                              setBlockForm((prev) => ({
                                ...prev,
                                text_color: event.target.value,
                              }))
                            }
                            aria-label="Выбрать цвет текста"
                          />

                          <input
                            value={blockForm.text_color}
                            onChange={(event) =>
                              setBlockForm((prev) => ({
                                ...prev,
                                text_color: event.target.value,
                              }))
                            }
                            placeholder="#111111"
                          />

                          <b
                            className="builder-color-sample"
                            style={{ backgroundColor: blockForm.text_color || '#111111' }}
                            title={blockForm.text_color || '#111111'}
                          />
                        </div>
                      </label>

                      <label className="wide">
                        <span>Картинка / видео</span>
                        <input value={blockForm.image_url} onChange={(event) => setBlockForm((prev) => ({ ...prev, image_url: event.target.value }))} placeholder="URL изображения" />
                      </label>

                      <label className="wide admin-upload-field">
                        <span>Загрузить изображение блока</span>
                        <input type="file" accept="image/*,video/*" onChange={uploadBlockImage} />
                      </label>

                      {blockForm.type === 'slider' && (
                        <div className="builder-slides-inside wide">
                          <div className="builder-slides-head">
                            <div>
                              <strong>Слайды в конструкторе</strong>
                              <span>{slides.length} / 10</span>
                            </div>

                            <button type="button" onClick={() => setActiveTab('slides')}>
                              Добавить или удалить слайд
                            </button>
                          </div>

                          <div className="builder-slides-list">
                            {slides.length === 0 ? (
                              <div className="admin-empty">Слайдов пока нет</div>
                            ) : (
                              slides.map((slide) => (
                                <div key={slide.id} className="builder-slide-mini">
                                  <div>
                                    {slide.media_type === 'video' ? (
                                      <video src={slide.image_url} muted />
                                    ) : (
                                      <img src={slide.image_url} alt={slide.title || 'Слайд'} />
                                    )}
                                  </div>
                                  <strong>{slide.title || 'Без заголовка'}</strong>
                                  <small>Порядок: {slide.sort_order}</small>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      <label className="wide">
                        <span>JSON настройки блока</span>
                        <textarea className="builder-json" value={blockForm.content_json} onChange={(event) => setBlockForm((prev) => ({ ...prev, content_json: event.target.value }))} />
                      </label>

                      <label className="builder-check">
                        <input type="checkbox" checked={blockForm.is_active} onChange={(event) => setBlockForm((prev) => ({ ...prev, is_active: event.target.checked }))} />
                        <span>Показывать блок на сайте</span>
                      </label>
                    </div>

                    <div className="builder-preview">
                      <div className="builder-preview-block" style={{ backgroundColor: blockForm.background_color, color: blockForm.text_color }}>
                        {blockForm.type === 'slider' ? (
                          <div className="builder-slider-preview">
                            <span>{getBlockTypeLabel(blockForm.type)}</span>
                            <h2>{blockForm.title || 'Слайдер главного экрана'}</h2>
                            <p>{blockForm.subtitle || 'Слайды берутся из раздела “Слайды”'}</p>

                            <div className="builder-slider-preview-grid">
                              {slides.slice(0, 4).map((slide) => (
                                <div key={slide.id} className="builder-slider-preview-item">
                                  {slide.media_type === 'video' ? (
                                    <video src={slide.image_url} muted />
                                  ) : (
                                    <img src={slide.image_url} alt={slide.title || 'Слайд'} />
                                  )}
                                </div>
                              ))}
                            </div>

                            {slides.length === 0 && <div className="admin-empty">Слайдов пока нет</div>}
                          </div>
                        ) : (
                          <>
                            {blockForm.image_url && <img src={blockForm.image_url} alt="" />}
                            <span>{getBlockTypeLabel(blockForm.type)}</span>
                            <h2>{blockForm.title || 'Заголовок блока'}</h2>
                            <p>{blockForm.subtitle || 'Описание блока'}</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="builder-editor-actions">
                      {selectedBlockId && (
                        <>
                          <button type="button" onClick={() => moveBlock(pageBlocks.find((item) => item.id === selectedBlockId), -1)}>Выше</button>
                          <button type="button" onClick={() => moveBlock(pageBlocks.find((item) => item.id === selectedBlockId), 1)}>Ниже</button>
                        </>
                      )}

                      <button type="submit" className="builder-save-btn">
                        {selectedBlockId ? 'Сохранить блок' : 'Добавить блок'}
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}
          </section>
        </div>

        {message && <div className={`admin-toast admin-toast-${message.type}`}>{message.text}</div>}

        {builderPreviewOpen && (
          <div className="admin-modal-backdrop" onClick={() => setBuilderPreviewOpen(false)}>
            <div className="builder-site-preview-modal" onClick={(event) => event.stopPropagation()}>
              <div className="builder-site-preview-head">
                <div>
                  <h3>Предпросмотр сайта</h3>
                  <p>Открыто из конструктора сайта</p>
                </div>

                <button type="button" onClick={() => setBuilderPreviewOpen(false)}>×</button>
              </div>

              <iframe title="Предпросмотр сайта из конструктора" src="/" />
            </div>
          </div>
        )}

        {confirmModal && (
          <div className="admin-modal-backdrop" onClick={() => setConfirmModal(null)}>
            <div className="admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
              <div className="admin-confirm-icon">!</div>
              <h3>{confirmModal.title}</h3>
              <p>{confirmModal.text}</p>
              <div className="admin-confirm-actions">
                <button type="button" className="admin-confirm-cancel" onClick={() => setConfirmModal(null)}>{confirmModal.cancelText || 'Отмена'}</button>
                <button type="button" className={confirmModal.danger ? 'admin-confirm-danger' : 'admin-confirm-ok'} onClick={confirmModal.onConfirm}>{confirmModal.confirmText || 'Подтвердить'}</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
