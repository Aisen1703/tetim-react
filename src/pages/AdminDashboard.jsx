// src/pages/AdminDashboard.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

// ===== КОНСТАНТЫ =====
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

const PRODUCT_SIZES = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'];

const EMPTY_PRODUCT_FORM = {
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

const EMPTY_SLIDE_FORM = {
  title: '',
  subtitle: '',
  image_url: '',
  media_type: 'image',
  background_color: '#111111',
  sort_order: 0,
  is_active: true,
};

const EMPTY_BLOCK_FORM = {
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

const DEFAULT_THEME_FORM = {
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

// ===== УТИЛИТЫ =====
async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getToken() {
  return localStorage.getItem('token') || '';
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

export function getCategoryLabel(value) {
  return CATEGORIES.find((item) => item.value === value)?.label || value || 'Без категории';
}

export function getBlockTypeLabel(type) {
  const labels = {
    hero: 'Главный экран',
    slider: 'Слайдер',
    categories: 'Категории',
    products: 'Товары',
    text_image: 'Текст + фото',
  };
  return labels[type] || type;
}

export function getDefaultJsonByType(type) {
  if (type === 'slider') {
    return JSON.stringify({ source: 'admin_slides', autoplay: true, interval: 4000, showDots: true }, null, 2);
  }
  if (type === 'hero') {
    return JSON.stringify({ badge: 'Новая коллекция', primaryButton: 'Каталог', secondaryButton: 'Индивидуальный заказ' }, null, 2);
  }
  if (type === 'categories') {
    return JSON.stringify({ layout: 'cards' }, null, 2);
  }
  if (type === 'products') {
    return JSON.stringify({ limit: 8, category: 'all', buttonText: 'Смотреть все', buttonLink: '/catalog' }, null, 2);
  }
  return JSON.stringify({ buttonText: '', buttonUrl: '' }, null, 2);
}

export function parseSizesStock(value) {
  const result = {};
  PRODUCT_SIZES.forEach((size) => {
    result[size] = '';
  });
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const [rawSize, rawStock] = item.split(':').map((part) => part.trim());
      const size = String(rawSize || '').toUpperCase();
      if (PRODUCT_SIZES.includes(size)) {
        result[size] = rawStock || '';
      }
    });
  return result;
}

export function buildSizesStockString(sizeStock) {
  return PRODUCT_SIZES
    .map((size) => {
      const stock = Number(sizeStock[size] || 0);
      if (stock <= 0) return null;
      return `${size}:${stock}`;
    })
    .filter(Boolean)
    .join(', ');
}

export function getTotalStockFromSizes(sizeStock) {
  return PRODUCT_SIZES.reduce((sum, size) => sum + Number(sizeStock[size] || 0), 0);
}

// ===== КОМПОНЕНТ =====
export default function AdminDashboard() {
  // ===== STATE =====
  const [activeTab, setActiveTab] = useState('products');
  const [builderMode, setBuilderMode] = useState('blocks');
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getStoredUser());
  
  // Данные
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [slides, setSlides] = useState([]);
  const [pageBlocks, setPageBlocks] = useState([]);
  
  // Формы
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [editProductId, setEditProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [showEditModal, setShowEditModal] = useState(false);
  const [slideForm, setSlideForm] = useState(EMPTY_SLIDE_FORM);
  const [blockForm, setBlockForm] = useState(EMPTY_BLOCK_FORM);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [themeForm, setThemeForm] = useState(DEFAULT_THEME_FORM);
  
  // UI State
  const [productSearch, setProductSearch] = useState('');
  const [message, setMessage] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [builderPreviewOpen, setBuilderPreviewOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs
  const builderEditorRef = useRef(null);

  // ===== MEMOIZED VALUES =====
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const productSizeStock = useMemo(() => parseSizesStock(productForm.sizes), [productForm.sizes]);
  const editProductSizeStock = useMemo(() => parseSizesStock(editProductForm.sizes), [editProductForm.sizes]);

  const filteredProducts = useMemo(() => {
    const text = productSearch.trim().toLowerCase();
    if (!text) return products;
    return products.filter((product) =>
      String(product.name || '').toLowerCase().includes(text) ||
      String(product.article || '').toLowerCase().includes(text) ||
      String(product.external_id || '').toLowerCase().includes(text) ||
      String(product.category || '').toLowerCase().includes(text)
    );
  }, [products, productSearch]);

  const stats = useMemo(() => ({
    totalProducts: products.length,
    published: products.filter((p) => Number(p.is_published) === 1).length,
    drafts: products.filter((p) => Number(p.is_published) !== 1).length,
    newOrders: orders.filter((o) => o.status === 'new').length,
  }), [products, orders]);

  // ===== EFFECTS =====
  useEffect(() => {
    if (!token) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ===== API HELPERS =====
  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    const timer = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(timer);
  }, []);

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(url, options);
    const data = await safeJson(response);
    
    if (response.status === 401 || response.status === 403) {
      if (data.message === 'Неверный токен' || data.message === 'Нет токен') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken('');
        setUser(null);
      }
    }
    return { response, data };
  }, []);

  // ===== DATA LOADERS =====
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadOrders(),
        loadClients(),
        loadSlides(),
        loadPageBlocks(),
        loadThemeSettings(),
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    const { response, data } = await request(`${API_URL}/admin/products`, { headers });
    if (response.ok) setProducts(data.products || []);
  }, [request, headers]);

  const loadOrders = useCallback(async () => {
    const { response, data } = await request(`${API_URL}/admin/orders`, { headers });
    if (response.ok) setOrders(data.orders || []);
  }, [request, headers]);

  const loadClients = useCallback(async () => {
    const { response, data } = await request(`${API_URL}/admin/users`, { headers });
    if (response.ok) setClients(data.users || []);
  }, [request, headers]);

  const loadSlides = useCallback(async () => {
    const { response, data } = await request(`${API_URL}/admin/slides`, { headers });
    if (response.ok) setSlides(data.slides || []);
  }, [request, headers]);

  const loadPageBlocks = useCallback(async () => {
    const { response, data } = await request(`${API_URL}/admin/page-blocks?page=home`, { headers });
    if (response.ok) setPageBlocks(data.blocks || []);
  }, [request, headers]);

  const loadThemeSettings = useCallback(async () => {
    const { response, data } = await request(`${API_URL}/admin/settings`, { headers });
    if (response.ok) setThemeForm({ ...DEFAULT_THEME_FORM, ...(data.settings || {}) });
  }, [request, headers]);

  // ===== FILE UPLOAD =====
  const uploadFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/admin/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.message || 'Не удалось загрузить файл');
    return data;
  }, [token]);

  const handleProductPhoto = useCallback(async (event, mode = 'create') => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await uploadFile(file);
      if (mode === 'edit') {
        setEditProductForm((prev) => ({ ...prev, image_url: data.url }));
      } else {
        setProductForm((prev) => ({ ...prev, image_url: data.url }));
      }
      showMessage('Фото товара загружено');
    } catch (error) {
      showMessage(error.message || 'Ошибка загрузки фото', 'error');
    } finally {
      event.target.value = '';
    }
  }, [uploadFile, showMessage]);

  const handleSlideFile = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await uploadFile(file);
      setSlideForm((prev) => ({ 
        ...prev, 
        image_url: data.url, 
        media_type: data.media_type || 'image' 
      }));
      showMessage('Файл слайда загружен');
    } catch (error) {
      showMessage(error.message || 'Ошибка загрузки файла', 'error');
    } finally {
      event.target.value = '';
    }
  }, [uploadFile, showMessage]);

  const handleBlockImage = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await uploadFile(file);
      setBlockForm((prev) => ({ ...prev, image_url: data.url }));
      showMessage('Картинка блока загружена');
    } catch (error) {
      showMessage(error.message || 'Ошибка загрузки картинки', 'error');
    } finally {
      event.target.value = '';
    }
  }, [uploadFile, showMessage]);

  const uploadThemeImage = useCallback(async (event, fieldName) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await uploadFile(file);
      setThemeForm((prev) => ({ ...prev, [fieldName]: data.url }));
      showMessage('Рисунок загружен');
    } catch (error) {
      showMessage(error.message || 'Не удалось загрузить рисунок', 'error');
    } finally {
      event.target.value = '';
    }
  }, [uploadFile, showMessage]);

  // ===== SIZE/STOCK HANDLERS =====
  const updateProductSizeStock = useCallback((size, value) => {
    const currentStock = parseSizesStock(productForm.sizes);
    const nextStock = { ...currentStock, [size]: value };
    setProductForm((prev) => ({
      ...prev,
      sizes: buildSizesStockString(nextStock),
      stock: getTotalStockFromSizes(nextStock),
    }));
  }, [productForm.sizes]);

  const updateEditProductSizeStock = useCallback((size, value) => {
    const currentStock = parseSizesStock(editProductForm.sizes);
    const nextStock = { ...currentStock, [size]: value };
    setEditProductForm((prev) => ({
      ...prev,
      sizes: buildSizesStockString(nextStock),
      stock: getTotalStockFromSizes(nextStock),
    }));
  }, [editProductForm.sizes]);

  // ===== PRODUCT ACTIONS =====
  const createProduct = useCallback(async (event) => {
    event.preventDefault();
    const { response, data } = await request(`${API_URL}/admin/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(productForm),
    });

    if (!response.ok) {
      showMessage(data.message || 'Не удалось добавить товар', 'error');
      return;
    }

    showMessage('Товар добавлен');
    setProductForm(EMPTY_PRODUCT_FORM);
    await loadProducts();
  }, [request, headers, productForm, showMessage, loadProducts]);

  const startEditProduct = useCallback((product) => {
    setEditProductId(product.id);
    setEditProductForm({
      external_id: product.external_id || '',
      article: product.article || '',
      name: product.name || '',
      category: product.category || 'accessories',
      price: product.price || '',
      sizes: product.sizes || '',
      stock: product.stock || '',
      image_url: product.image_url || '',
      description: product.description || '',
    });
    setShowEditModal(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditProductId(null);
    setEditProductForm(EMPTY_PRODUCT_FORM);
  }, []);

  const saveProductEdit = useCallback(async (event) => {
    event.preventDefault();
    if (!editProductId) return;
    
    const { response, data } = await request(`${API_URL}/admin/products/${editProductId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(editProductForm),
    });

    if (!response.ok) {
      showMessage(data.message || 'Не удалось сохранить товар', 'error');
      return;
    }

    showMessage('Товар сохранён');
    closeEditModal();
    await loadProducts();
  }, [request, headers, editProductId, editProductForm, showMessage, closeEditModal, loadProducts]);

  const publishProduct = useCallback(async (productId) => {
    const { response, data } = await request(`${API_URL}/admin/products/${productId}/publish`, {
      method: 'PATCH',
      headers,
    });
    if (!response.ok) {
      showMessage(data.message || 'Не удалось опубликовать товар', 'error');
      return;
    }
    showMessage('Товар опубликован');
    await loadProducts();
  }, [request, headers, showMessage, loadProducts]);

  const unpublishProduct = useCallback(async (productId) => {
    const { response, data } = await request(`${API_URL}/admin/products/${productId}/unpublish`, {
      method: 'PATCH',
      headers,
    });
    if (!response.ok) {
      showMessage(data.message || 'Не удалось снять товар', 'error');
      return;
    }
    showMessage('Товар снят с публикации');
    await loadProducts();
  }, [request, headers, showMessage, loadProducts]);

  const askDeleteProduct = useCallback((product) => {
    setConfirmModal({
      title: 'Удалить товар?',
      text: product.name,
      confirmText: 'Удалить',
      danger: true,
      onConfirm: () => deleteProduct(product.id),
    });
  }, []);

  const deleteProduct = useCallback(async (productId) => {
    const { response, data } = await request(`${API_URL}/admin/products/${productId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      showMessage(data.message || 'Не удалось удалить товар', 'error');
      return;
    }
    showMessage('Товар удалён');
    setConfirmModal(null);
    await loadProducts();
  }, [request, headers, showMessage, loadProducts]);

  const importProductsFromExcel = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/admin/products/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await safeJson(response);

      if (!response.ok) {
        showMessage(data.message || 'Не удалось импортировать товары', 'error');
        return;
      }
      showMessage(`Импорт готов: добавлено ${data.created || 0}, обновлено ${data.updated || 0}, пропущено ${data.skipped || 0}`);
      await loadProducts();
    } catch {
      showMessage('Ошибка импорта Excel', 'error');
    } finally {
      event.target.value = '';
    }
  }, [token, showMessage, loadProducts]);

  // ===== SLIDE ACTIONS =====
  const createSlide = useCallback(async (event) => {
    event.preventDefault();
    const { response, data } = await request(`${API_URL}/admin/slides`, {
      method: 'POST',
      headers,
      body: JSON.stringify(slideForm),
    });

    if (!response.ok) {
      showMessage(data.message || 'Не удалось добавить слайд', 'error');
      return;
    }

    showMessage('Слайд добавлен');
    setSlideForm(EMPTY_SLIDE_FORM);
    await loadSlides();
  }, [request, headers, slideForm, showMessage, loadSlides]);

  const askDeleteSlide = useCallback((slide) => {
    setConfirmModal({
      title: 'Удалить слайд?',
      text: slide.title || 'Без заголовка',
      confirmText: 'Удалить',
      danger: true,
      onConfirm: () => deleteSlide(slide.id),
    });
  }, []);

  const deleteSlide = useCallback(async (slideId) => {
    const { response, data } = await request(`${API_URL}/admin/slides/${slideId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      showMessage(data.message || 'Не удалось удалить слайд', 'error');
      return;
    }
    showMessage('Слайд удалён');
    setConfirmModal(null);
    await loadSlides();
  }, [request, headers, showMessage, loadSlides]);

  // ===== ORDER ACTIONS =====
  const updateOrderStatus = useCallback(async (orderId, status) => {
    const { response, data } = await request(`${API_URL}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      showMessage(data.message || 'Не удалось изменить статус', 'error');
      return;
    }
    showMessage('Статус заказа изменён');
    await loadOrders();
  }, [request, headers, showMessage, loadOrders]);

  // ===== BLOCK/CONSTRUCTOR ACTIONS =====
  const createEmptyBlock = useCallback((type = 'text_image') => {
    const nextOrder = pageBlocks.length > 0
      ? Math.max(...pageBlocks.map((item) => Number(item.sort_order || 0))) + 1
      : 1;
    
    setActiveTab('builder');
    setBuilderMode('blocks');
    setSelectedBlockId(null);
    setBlockForm({
      ...EMPTY_BLOCK_FORM,
      type,
      title: getBlockTypeLabel(type),
      sort_order: nextOrder,
      content_json: getDefaultJsonByType(type),
    });

    setTimeout(() => builderEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [pageBlocks]);

  const selectBlock = useCallback((block) => {
    let prettyJson = block.content_json || '{}';
    try {
      prettyJson = JSON.stringify(JSON.parse(prettyJson), null, 2);
    } catch {
      prettyJson = block.content_json || '{}';
    }

    setBuilderMode('blocks');
    setSelectedBlockId(block.id);
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

    setTimeout(() => builderEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, []);

  const savePageBlock = useCallback(async (event) => {
    event.preventDefault();
    try {
      JSON.parse(blockForm.content_json || '{}');
    } catch {
      showMessage('JSON настройки блока заполнен неверно', 'error');
      return;
    }

    const url = selectedBlockId
      ? `${API_URL}/admin/page-blocks/${selectedBlockId}`
      : `${API_URL}/admin/page-blocks`;
    const method = selectedBlockId ? 'PATCH' : 'POST';

    const { response, data } = await request(url, {
      method,
      headers,
      body: JSON.stringify(blockForm),
    });

    if (!response.ok) {
      showMessage(data.message || 'Не удалось сохранить блок', 'error');
      return;
    }

    showMessage(selectedBlockId ? 'Блок сохранён' : 'Блок добавлен');
    setSelectedBlockId(data.block?.id || selectedBlockId);
    await loadPageBlocks();
  }, [request, headers, blockForm, selectedBlockId, showMessage, loadPageBlocks]);

  const askDeleteBlock = useCallback((block) => {
    setConfirmModal({
      title: 'Удалить блок?',
      text: block.title || getBlockTypeLabel(block.type),
      confirmText: 'Удалить',
      danger: true,
      onConfirm: () => deleteBlock(block.id),
    });
  }, []);

  const deleteBlock = useCallback(async (blockId) => {
    const { response, data } = await request(`${API_URL}/admin/page-blocks/${blockId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      showMessage(data.message || 'Не удалось удалить блок', 'error');
      return;
    }
    showMessage('Блок удалён');
    setConfirmModal(null);
    setSelectedBlockId(null);
    setBlockForm(EMPTY_BLOCK_FORM);
    await loadPageBlocks();
  }, [request, headers, showMessage, loadPageBlocks]);

  // ===== THEME ACTIONS =====
  const saveThemeSettings = useCallback(async () => {
    const { response, data } = await request(`${API_URL}/admin/settings`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ settings: themeForm }),
    });
    if (!response.ok) {
      showMessage(data.message || 'Не удалось сохранить оформление', 'error');
      return;
    }
    showMessage('Оформление сайта сохранено');
    await loadThemeSettings();
  }, [request, headers, themeForm, showMessage, loadThemeSettings]);

  // ===== AUTH =====
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  }, []);

  // ===== RENDER GUARD =====
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

  // ===== JSX =====
  return (
    <main className={sidebarCollapsed ? 'admin-page admin-sidebar-collapsed' : 'admin-page'}>
      {/* Toast Notification */}
      {message && (
        <div className={message.type === 'error' ? 'admin-toast error' : 'admin-toast'} role="alert">
          {message.text}
        </div>
      )}

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <button 
          type="button" 
          className="admin-sidebar-toggle" 
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          aria-label={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>

        <div className="admin-sidebar-brand">
          <strong>TETIM</strong>
          <span>Админ-панель</span>
        </div>

        <nav className="admin-nav" role="navigation">
          <button 
            className={activeTab === 'products' ? 'active' : ''} 
            onClick={() => setActiveTab('products')}
            aria-current={activeTab === 'products' ? 'page' : undefined}
          >
            Товары
          </button>
          <button 
            className={activeTab === 'orders' ? 'active' : ''} 
            onClick={() => setActiveTab('orders')}
            aria-current={activeTab === 'orders' ? 'page' : undefined}
          >
            Заказы
          </button>
          <button 
            className={activeTab === 'clients' ? 'active' : ''} 
            onClick={() => setActiveTab('clients')}
            aria-current={activeTab === 'clients' ? 'page' : undefined}
          >
            Клиенты
          </button>
          <button 
            className={activeTab === 'builder' ? 'active' : ''} 
            onClick={() => setActiveTab('builder')}
            aria-current={activeTab === 'builder' ? 'page' : undefined}
          >
            Конструктор сайта
          </button>
        </nav>

        <div className="admin-sidebar-bottom">
          <Link to="/">На сайт</Link>
          <Link to="/account">В кабинет</Link>
          <button type="button" onClick={logout}>Выйти</button>
        </div>
      </aside>

      {/* Main Content */}
      <section className="admin-main">
        <header className="admin-hero-card">
          <div>
            <h1>Панель управления</h1>
            <p>Товары, заказы, клиенты и конструктор сайта TETIM</p>
          </div>
          <button type="button" onClick={loadAll} disabled={loading}>
            {loading ? 'Обновление...' : 'Обновить'}
          </button>
        </header>

        <section className="admin-stats-grid" aria-label="Статистика">
          <article><span>Всего товаров</span><strong>{stats.totalProducts}</strong></article>
          <article><span>Опубликовано</span><strong>{stats.published}</strong></article>
          <article><span>Черновики / 1С</span><strong>{stats.drafts}</strong></article>
          <article><span>Новые заказы</span><strong>{stats.newOrders}</strong></article>
        </section>

        {/* ===== PRODUCTS TAB ===== */}
        {activeTab === 'products' && (
          <section className="admin-grid admin-products-grid">
            {/* Add Product Form */}
            <article className="admin-card">
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
                  aria-label="Импорт товаров из файла"
                />
              </label>

              <form className="admin-form" onSubmit={createProduct}>
                <input
                  value={productForm.external_id}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, external_id: e.target.value }))}
                  placeholder="ID из 1С"
                />
                <input
                  value={productForm.article}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, article: e.target.value }))}
                  placeholder="Артикул"
                />
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Название товара"
                  required
                />

                <select 
                  value={productForm.category} 
                  onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>

                <input
                  value={productForm.price}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="Цена"
                  type="number"
                  min="0"
                  step="0.01"
                />

                <div className="admin-size-stock-picker">
                  <span>Остатки по размерам</span>
                  <div className="admin-size-stock-grid">
                    {PRODUCT_SIZES.map((size) => (
                      <label key={size}>
                        <strong>{size}</strong>
                        <input 
                          type="number" 
                          min="0" 
                          value={productSizeStock[size]} 
                          onChange={(e) => updateProductSizeStock(size, e.target.value)} 
                          placeholder="0"
                          aria-label={`Остаток размера ${size}`}
                        />
                      </label>
                    ))}
                  </div>
                  <small>Формат: {productForm.sizes || 'например S:2, M:5, L:1'}</small>
                </div>

                <input
                  value={productForm.stock}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, stock: e.target.value }))}
                  placeholder="Общий остаток считается автоматически"
                  type="number"
                  readOnly
                  aria-label="Общий остаток"
                />

                <label className="admin-upload-field">
                  <span>Загрузить фото товара</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleProductPhoto(e, 'create')}
                    aria-label="Выбрать фото товара"
                  />
                </label>

                <input
                  value={productForm.image_url}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, image_url: e.target.value }))}
                  placeholder="Ссылка на фото"
                />
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Описание"
                  rows={3}
                />
                <button type="submit">Добавить товар</button>
              </form>
            </article>

            {/* Products List */}
            <article className="admin-card admin-wide-card">
              <div className="admin-card-head admin-card-head-row">
                <div>
                  <h2>Управление товарами</h2>
                  <p>Публикация, редактирование, удаление и товары из 1С</p>
                </div>
                <input 
                  className="admin-search" 
                  value={productSearch} 
                  onChange={(e) => setProductSearch(e.target.value)} 
                  placeholder="Поиск товара"
                  aria-label="Поиск по товарам"
                />
              </div>

              {filteredProducts.length === 0 ? (
                <div className="admin-empty">Товаров пока нет</div>
              ) : (
                <div className="admin-products-list" role="list">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="admin-product-row" role="listitem">
                      <div className="admin-product-main">
                        <div className="admin-product-image">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} loading="lazy" />
                          ) : (
                            <span>Нет фото</span>
                          )}
                        </div>
                        <div>
                          <strong>{product.name}</strong>
                          <small>Артикул: {product.article || '—'} · ID 1С: {product.external_id || '—'}</small>
                          <small>Размеры: {product.sizes || '—'}</small>
                        </div>
                      </div>

                      <span>{getCategoryLabel(product.category)}</span>
                      <span>{formatPrice(product.price)}</span>
                      <span>{Number(product.stock || 0)}</span>

                      <span className={Number(product.is_published) === 1 ? 'status published' : 'status draft'}>
                        {Number(product.is_published) === 1 ? 'Опубликован' : 'Черновик'}
                      </span>

                      <div className="admin-row-actions">
                        {Number(product.is_published) === 1 ? (
                          <button type="button" onClick={() => unpublishProduct(product.id)}>Снять</button>
                        ) : (
                          <button type="button" onClick={() => publishProduct(product.id)}>Опубликовать</button>
                        )}
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

        {/* ===== ORDERS TAB ===== */}
        {activeTab === 'orders' && (
          <section className="admin-card">
            <h2>Заказы</h2>
            {orders.length === 0 ? (
              <div className="admin-empty">Заказов пока нет</div>
            ) : (
              <div className="admin-orders-list" role="list">
                {orders.map((order) => (
                  <div key={order.id} className="admin-order-row" role="listitem">
                    <div>
                      <strong>Заказ №{order.id}</strong>
                      <small>{order.customer_name} · {order.phone}</small>
                      <small>{order.email || 'email не указан'}</small>
                    </div>
                    <span>{formatPrice(order.total_amount)}</span>
                    <select 
                      value={order.status} 
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      aria-label={`Изменить статус заказа №${order.id}`}
                    >
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

        {/* ===== CLIENTS TAB ===== */}
        {activeTab === 'clients' && (
          <section className="admin-card">
            <h2>Клиенты</h2>
            {clients.length === 0 ? (
              <div className="admin-empty">Клиентов пока нет</div>
            ) : (
              <div className="admin-clients-list" role="list">
                {clients.map((client) => (
                  <div key={client.id} className="admin-client-row" role="listitem">
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

        {/* ===== BUILDER TAB ===== */}
        {activeTab === 'builder' && (
          <section className="admin-card builder-panel">
            <div className="builder-top">
              <div>
                <h2>Конструктор сайта</h2>
                <p>Собирайте главную страницу из блоков: как в Tilda</p>
              </div>

              <div className="builder-add-actions" role="toolbar" aria-label="Добавить элемент">
                <button 
                  type="button" 
                  className="builder-preview-open-btn" 
                  onClick={() => setBuilderPreviewOpen(true)}
                >
                  Предпросмотр сайта
                </button>
                <button 
                  type="button" 
                  className={builderMode === 'blocks' ? 'active' : ''} 
                  onClick={() => setBuilderMode('blocks')}
                >
                  Блоки
                </button>
                <button type="button" onClick={() => createEmptyBlock('hero')}>+ Главный экран</button>
                <button type="button" onClick={() => createEmptyBlock('slider')}>+ Слайдер</button>
                <button type="button" onClick={() => createEmptyBlock('categories')}>+ Категории</button>
                <button type="button" onClick={() => createEmptyBlock('products')}>+ Товары</button>
                <button type="button" onClick={() => createEmptyBlock('text_image')}>+ Текст + фото</button>
                <button 
                  type="button" 
                  className={builderMode === 'slides' ? 'active' : ''} 
                  onClick={() => setBuilderMode('slides')}
                >
                  Слайды
                </button>
                <button 
                  type="button" 
                  className={builderMode === 'appearance' ? 'active' : ''} 
                  onClick={() => setBuilderMode('appearance')}
                >
                  Оформление сайта
                </button>
              </div>
            </div>

            {/* Blocks Mode */}
            {builderMode === 'blocks' && (
              <div className="builder-layout">
                <div className="builder-blocks-list">
                  <h3>Блоки страницы</h3>
                  {pageBlocks.length === 0 ? (
                    <div className="admin-empty">Блоков пока нет</div>
                  ) : (
                    pageBlocks.map((block) => (
                      <button 
                        key={block.id} 
                        type="button" 
                        className={selectedBlockId === block.id ? 'builder-block-item active' : 'builder-block-item'} 
                        onClick={() => selectBlock(block)}
                        aria-pressed={selectedBlockId === block.id}
                      >
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
                      <select
                        value={blockForm.type}
                        onChange={(e) =>
                          setBlockForm((prev) => ({
                            ...prev,
                            type: e.target.value,
                            title: prev.title || getBlockTypeLabel(e.target.value),
                            content_json: getDefaultJsonByType(e.target.value),
                          }))
                        }
                      >
                        <option value="hero">Главный экран</option>
                        <option value="slider">Слайдер</option>
                        <option value="categories">Категории</option>
                        <option value="products">Товары</option>
                        <option value="text_image">Текст + фото</option>
                      </select>
                    </label>

                    <label>
                      <span>Порядок</span>
                      <input 
                        type="number" 
                        value={blockForm.sort_order} 
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, sort_order: e.target.value }))}
                        min="0"
                      />
                    </label>
                    <label>
                      <span>Заголовок</span>
                      <input 
                        value={blockForm.title} 
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, title: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Подзаголовок</span>
                      <input 
                        value={blockForm.subtitle} 
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Фон</span>
                      <input 
                        type="color" 
                        value={blockForm.background_color} 
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, background_color: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Цвет текста</span>
                      <input 
                        type="color" 
                        value={blockForm.text_color} 
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, text_color: e.target.value }))}
                      />
                    </label>

                    <label className="wide">
                      <span>Картинка блока</span>
                      <input 
                        value={blockForm.image_url} 
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, image_url: e.target.value }))} 
                        placeholder="Ссылка на изображение"
                      />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleBlockImage}
                        aria-label="Загрузить изображение блока"
                      />
                    </label>

                    <label className="wide">
                      <span>JSON настройки блока</span>
                      <textarea 
                        value={blockForm.content_json} 
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, content_json: e.target.value }))} 
                        rows={8}
                        aria-label="JSON конфигурация блока"
                      />
                    </label>

                    <label className="builder-check wide">
                      <input 
                        type="checkbox" 
                        checked={blockForm.is_active} 
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      />
                      <span>Блок активен</span>
                    </label>
                  </div>

                  <div className="builder-preview">
                    <div 
                      className="builder-preview-block" 
                      style={{ backgroundColor: blockForm.background_color, color: blockForm.text_color }}
                    >
                      {blockForm.image_url && <img src={blockForm.image_url} alt="" loading="lazy" />}
                      <span>{getBlockTypeLabel(blockForm.type)}</span>
                      <h2>{blockForm.title || 'Заголовок блока'}</h2>
                      <p>{blockForm.subtitle || 'Описание блока'}</p>
                    </div>
                  </div>

                  <div className="builder-editor-actions">
                    <button type="submit">{selectedBlockId ? 'Сохранить блок' : 'Добавить блок'}</button>
                    {selectedBlockId && (
                      <button 
                        type="button" 
                        className="danger" 
                        onClick={() => askDeleteBlock({ id: selectedBlockId, title: blockForm.title, type: blockForm.type })}
                      >
                        Удалить блок
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Slides Mode */}
            {builderMode === 'slides' && (
              <div className="builder-inside-section">
                <div className="builder-inside-head">
                  <div>
                    <h2>Слайды главного экрана</h2>
                    <p>Добавляйте фото или видео для главного экрана</p>
                  </div>
                  <span>{slides.length} / 10</span>
                </div>

                <form className="admin-form builder-inside-form" onSubmit={createSlide}>
                  <input 
                    value={slideForm.title} 
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, title: e.target.value }))} 
                    placeholder="Заголовок слайда"
                  />
                  <input 
                    value={slideForm.subtitle} 
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, subtitle: e.target.value }))} 
                    placeholder="Подзаголовок слайда"
                  />

                  <label className="admin-upload-field wide">
                    <span>Загрузить фото или видео</span>
                    <input 
                      type="file" 
                      accept="image/*,video/*" 
                      onChange={handleSlideFile}
                      aria-label="Загрузить медиа для слайда"
                    />
                  </label>

                  <input 
                    value={slideForm.image_url} 
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, image_url: e.target.value }))} 
                    placeholder="Ссылка на файл" 
                    required
                  />
                  <select 
                    value={slideForm.media_type} 
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, media_type: e.target.value }))}
                  >
                    <option value="image">Фото</option>
                    <option value="video">Видео</option>
                  </select>
                  <input 
                    value={slideForm.background_color} 
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, background_color: e.target.value }))} 
                    placeholder="#111111"
                  />
                  <input 
                    value={slideForm.sort_order} 
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, sort_order: e.target.value }))} 
                    placeholder="Порядок" 
                    type="number"
                    min="0"
                  />
                  <button type="submit">Добавить слайд</button>
                </form>

                <div className="builder-slide-grid">
                  {slides.length === 0 ? (
                    <div className="admin-empty">Слайдов пока нет</div>
                  ) : (
                    slides.map((slide) => (
                      <article key={slide.id} className="builder-slide-card">
                        <div>
                          {slide.media_type === 'video' ? (
                            <video src={slide.image_url} muted controls={false} />
                          ) : (
                            <img src={slide.image_url} alt={slide.title || 'Слайд'} loading="lazy" />
                          )}
                        </div>
                        <strong>{slide.title || 'Без заголовка'}</strong>
                        <span>{slide.subtitle || 'Без подзаголовка'}</span>
                        <small>Порядок: {slide.sort_order}</small>
                        <button 
                          type="button" 
                          className="danger" 
                          onClick={() => askDeleteSlide(slide)}
                        >
                          Удалить
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Appearance Mode */}
            {builderMode === 'appearance' && (
              <div className="builder-inside-section">
                <div className="builder-inside-head">
                  <div>
                    <h2>Оформление сайта</h2>
                    <p>Тема, узоры, цвета, контакты, соцсети и праздничное оформление</p>
                  </div>
                  <button type="button" onClick={saveThemeSettings}>
                    Сохранить оформление
                  </button>
                </div>

                <div className="builder-theme-grid">
                  <label>
                    <span>Название сайта</span>
                    <input 
                      value={themeForm.site_title} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, site_title: e.target.value }))}
                    />
                  </label>

                  <label>
                    <span>Тема сайта</span>
                    <select 
                      value={themeForm.site_theme} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, site_theme: e.target.value }))}
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
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, holiday_theme_enabled: e.target.value }))}
                    >
                      <option value="1">Включены</option>
                      <option value="0">Выключены</option>
                    </select>
                  </label>

                  <label>
                    <span>Снег</span>
                    <select 
                      value={themeForm.snow_enabled} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, snow_enabled: e.target.value }))}
                    >
                      <option value="0">Выключен</option>
                      <option value="1">Включен</option>
                    </select>
                  </label>

                  <label className="wide">
                    <span>Логотип</span>
                    <input 
                      value={themeForm.logo_url} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, logo_url: e.target.value }))} 
                      placeholder="/assets/logo-full.png"
                    />
                  </label>

                  <label className="wide">
                    <span>Белый логотип</span>
                    <input 
                      value={themeForm.logo_white_url} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, logo_white_url: e.target.value }))} 
                      placeholder="/assets/logo-full-white.png"
                    />
                  </label>

                  <label className="wide">
                    <span>Орнамент header</span>
                    <input 
                      value={themeForm.header_ornament_url} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, header_ornament_url: e.target.value }))} 
                      placeholder="Ссылка на узор"
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => uploadThemeImage(e, 'header_ornament_url')}
                      aria-label="Загрузить орнамент хедера"
                    />
                  </label>

                  <label className="wide">
                    <span>Фоновый рисунок сайта</span>
                    <input 
                      value={themeForm.background_pattern_url} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, background_pattern_url: e.target.value }))} 
                      placeholder="Ссылка на фон"
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => uploadThemeImage(e, 'background_pattern_url')}
                      aria-label="Загрузить фоновый рисунок"
                    />
                  </label>

                  <label className="wide">
                    <span>Декоративный рисунок</span>
                    <input 
                      value={themeForm.decor_image_url} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, decor_image_url: e.target.value }))} 
                      placeholder="Ссылка на декор"
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => uploadThemeImage(e, 'decor_image_url')}
                      aria-label="Загрузить декоративный рисунок"
                    />
                  </label>

                  <label>
                    <span>Телефон</span>
                    <input 
                      value={themeForm.phone} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input 
                      value={themeForm.email} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Адрес</span>
                    <input 
                      value={themeForm.address} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Цвет акцента</span>
                    <input 
                      type="color" 
                      value={themeForm.accent_color || '#111111'} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, accent_color: e.target.value }))}
                    />
                  </label>

                  <label className="wide">
                    <span>Текст footer</span>
                    <input 
                      value={themeForm.footer_text} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, footer_text: e.target.value }))}
                    />
                  </label>
                  <label className="wide">
                    <span>Ссылка Instagram</span>
                    <input 
                      value={themeForm.instagram_url || ''} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, instagram_url: e.target.value }))} 
                      placeholder="https://instagram.com/tetim"
                    />
                  </label>
                  <label className="wide">
                    <span>Ссылка WhatsApp</span>
                    <input 
                      value={themeForm.whatsapp_url || ''} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, whatsapp_url: e.target.value }))} 
                      placeholder="https://wa.me/79990600075"
                    />
                  </label>
                  <label className="wide">
                    <span>Ссылка третьей иконки</span>
                    <input 
                      value={themeForm.social_extra_url || ''} 
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, social_extra_url: e.target.value }))} 
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <div className={`builder-theme-preview theme-${themeForm.site_theme}`}>
                  {themeForm.header_ornament_url && (
                    <img src={themeForm.header_ornament_url} alt="" loading="lazy" />
                  )}
                  <h2>
                    {themeForm.site_theme === 'newyear' ? 'Новогодняя тема TETIM' : 'Тема сайта TETIM'}
                  </h2>
                  <p>Здесь администратор видит, как будет выглядеть оформление сайта.</p>
                </div>
              </div>
            )}
          </section>
        )}
      </section>

      {/* ===== MODALS ===== */}
      
      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="admin-modal-overlay" onClick={closeEditModal} role="dialog" aria-modal="true">
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="admin-modal-close" 
              onClick={closeEditModal}
              aria-label="Закрыть"
            >
              ×
            </button>
            <form className="admin-product-edit-form" onSubmit={saveProductEdit}>
              <h3>Редактировать товар</h3>
              <div className="admin-form two-columns">
                <input
                  value={editProductForm.external_id}
                  onChange={(e) => setEditProductForm({ ...editProductForm, external_id: e.target.value })}
                  placeholder="ID из 1С"
                />
                <input
                  value={editProductForm.article}
                  onChange={(e) => setEditProductForm({ ...editProductForm, article: e.target.value })}
                  placeholder="Артикул"
                />
                <input
                  value={editProductForm.name}
                  onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                  placeholder="Название товара"
                  required
                />
                <select
                  value={editProductForm.category}
                  onChange={(e) => setEditProductForm({ ...editProductForm, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <input
                  value={editProductForm.price}
                  onChange={(e) => setEditProductForm({ ...editProductForm, price: e.target.value })}
                  placeholder="Цена"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <div className="admin-size-stock-picker wide">
                  <span>Остатки по размерам</span>
                  <div className="admin-size-stock-grid">
                    {PRODUCT_SIZES.map((size) => (
                      <label key={size}>
                        <strong>{size}</strong>
                        <input
                          type="number"
                          min="0"
                          value={editProductSizeStock[size]}
                          onChange={(e) => updateEditProductSizeStock(size, e.target.value)}
                          placeholder="0"
                          aria-label={`Остаток размера ${size}`}
                        />
                      </label>
                    ))}
                  </div>
                  <small>Формат: {editProductForm.sizes || 'например S:2, M:5, L:1'}</small>
                </div>
                <input
                  value={editProductForm.stock}
                  placeholder="Общий остаток считается автоматически"
                  type="number"
                  readOnly
                  aria-label="Общий остаток"
                />
                <input
                  value={editProductForm.image_url}
                  onChange={(e) => setEditProductForm({ ...editProductForm, image_url: e.target.value })}
                  placeholder="Ссылка на фото"
                />
                <label className="admin-upload-field wide">
                  <span>Загрузить новое фото</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleProductPhoto(e, 'edit')}
                    aria-label="Выбрать новое фото"
                  />
                </label>
                <textarea
                  className="wide"
                  value={editProductForm.description}
                  onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
                  placeholder="Описание"
                  rows={3}
                />
              </div>
              <div className="admin-edit-actions">
                <button type="submit">Сохранить товар</button>
                <button type="button" onClick={closeEditModal}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Builder Preview Modal */}
      {builderPreviewOpen && (
        <div className="admin-modal-backdrop" onClick={() => setBuilderPreviewOpen(false)}>
          <div className="builder-site-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="builder-site-preview-head">
              <div>
                <h3>Предпросмотр сайта</h3>
                <p>Открыто из конструктора сайта</p>
              </div>
              <button 
                type="button" 
                onClick={() => setBuilderPreviewOpen(false)}
                aria-label="Закрыть предпросмотр"
              >
                ×
              </button>
            </div>
            <iframe 
              title="Предпросмотр сайта из конструктора" 
              src="/"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="admin-modal-backdrop" onClick={() => setConfirmModal(null)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()} role="alertdialog">
            <h3>{confirmModal.title}</h3>
            {confirmModal.text && <p>{confirmModal.text}</p>}
            <div>
              <button 
                type="button" 
                className={confirmModal.danger ? 'danger' : ''} 
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmText || 'OK'}
              </button>
              <button type="button" onClick={() => setConfirmModal(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}