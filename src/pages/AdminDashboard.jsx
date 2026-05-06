import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:4000/api';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [slides, setSlides] = useState([]);
  const [message, setMessage] = useState('');
  const [slideUploadText, setSlideUploadText] = useState('');

  const [form, setForm] = useState({
    external_id: '',
    article: '',
    name: '',
    category: '',
    price: '',
    sizes: '',
    stock: '',
    image_url: '',
    description: '',
  });

  const [slideForm, setSlideForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    media_type: 'image',
    background_color: '#d8c900',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    if (!token || !user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    loadUsers();
    loadProducts();
    loadOrders();
    loadSlides();
  }, []);

  async function loadUsers() {
    try {
      const response = await fetch(`${API_URL}/admin/users`, { headers });
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      }
    } catch {
      setUsers([]);
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch(`${API_URL}/admin/products`, { headers });
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products || []);
      }
    } catch {
      setProducts([]);
    }
  }

  async function loadOrders() {
    try {
      const response = await fetch(`${API_URL}/admin/orders`, { headers });
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders || []);
      }
    } catch {
      setOrders([]);
    }
  }

  async function loadSlides() {
    try {
      const response = await fetch(`${API_URL}/admin/slides`, { headers });
      const data = await response.json();

      if (response.ok) {
        setSlides(data.slides || []);
      }
    } catch {
      setSlides([]);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function addProduct(event) {
    event.preventDefault();

    const payload = {
      external_id: form.external_id.trim(),
      article: form.article.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      sizes: form.sizes.trim(),
      stock: Number(form.stock || 0),
      image_url: form.image_url.trim(),
      description: form.description.trim(),
    };

    const response = await fetch(`${API_URL}/admin/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || 'Ошибка добавления товара');
      return;
    }

    setMessage('Товар добавлен. Теперь его можно опубликовать.');

    setForm({
      external_id: '',
      article: '',
      name: '',
      category: '',
      price: '',
      sizes: '',
      stock: '',
      image_url: '',
      description: '',
    });

    loadProducts();
  }

  async function deleteProduct(id) {
    const response = await fetch(`${API_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (response.ok) {
      loadProducts();
    }
  }

  async function editProduct(id) {
    const name = prompt('Новое название товара');

    if (!name) return;

    const response = await fetch(`${API_URL}/admin/products/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name }),
    });

    if (response.ok) {
      loadProducts();
    }
  }

  async function updateProductPhoto(id) {
    const imageUrl = prompt('Вставьте ссылку на фото товара');

    if (!imageUrl) return;

    const response = await fetch(`${API_URL}/admin/products/${id}/photo`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        image_url: imageUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'Ошибка обновления фото');
      return;
    }

    loadProducts();
  }

  async function publishProduct(id) {
    const response = await fetch(`${API_URL}/admin/products/${id}/publish`, {
      method: 'PATCH',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'Ошибка публикации');
      return;
    }

    loadProducts();
  }

  async function unpublishProduct(id) {
    const response = await fetch(`${API_URL}/admin/products/${id}/unpublish`, {
      method: 'PATCH',
      headers,
    });

    if (response.ok) {
      loadProducts();
    }
  }

  async function changeOrderStatus(id, status) {
    await fetch(`${API_URL}/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });

    loadOrders();
  }

  async function uploadSlideFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setSlideUploadText('Загрузка файла...');

    try {
      const response = await fetch(`${API_URL}/admin/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setSlideUploadText(data.message || 'Ошибка загрузки файла');
        return;
      }

      setSlideForm((prev) => ({
        ...prev,
        image_url: data.url,
        media_type: data.media_type,
      }));

      setSlideUploadText('Файл загружен');
    } catch {
      setSlideUploadText('Не удалось загрузить файл');
    }
  }

  async function addSlide(event) {
    event.preventDefault();

    const response = await fetch(`${API_URL}/admin/slides`, {
      method: 'POST',
      headers,
      body: JSON.stringify(slideForm),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'Ошибка добавления слайда');
      return;
    }

    setSlideForm({
      title: '',
      subtitle: '',
      image_url: '',
      media_type: 'image',
      background_color: '#d8c900',
      sort_order: 0,
      is_active: true,
    });

    setSlideUploadText('');
    loadSlides();
  }

  async function deleteSlide(id) {
    const response = await fetch(`${API_URL}/admin/slides/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (response.ok) {
      loadSlides();
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  }

  return (
    <main className="container" style={{ padding: '40px 0' }}>
      <div className="section-title-row">
        <div>
          <h1>Админ-панель</h1>
          <p>
            Управление товарами, публикацией из 1С, слайдами, клиентами и
            заказами
          </p>
        </div>

        <div className="admin-actions-inline">
          <Link to="/account" className="btn btn-light">
            В кабинет
          </Link>

          <button className="btn btn-light" type="button" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>

      <div className="promo-banner-grid">
        <section className="card-lite">
          <h3>Добавить товар вручную</h3>

          <form className="form" onSubmit={addProduct}>
            <input
              name="external_id"
              value={form.external_id}
              onChange={handleChange}
              placeholder="ID из 1С, если есть"
            />

            <input
              name="article"
              value={form.article}
              onChange={handleChange}
              placeholder="Артикул"
            />

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Название товара"
              required
            />

            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="Категория: hoodies, tshirts..."
              required
            />

            <input
              name="price"
              type="number"
              value={form.price}
              onChange={handleChange}
              placeholder="Цена"
              required
            />

            <input
              name="sizes"
              value={form.sizes}
              onChange={handleChange}
              placeholder="Размеры"
            />

            <input
              name="stock"
              type="number"
              value={form.stock}
              onChange={handleChange}
              placeholder="Остаток"
            />

            <input
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              placeholder="Ссылка на фото"
            />

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Описание"
            />

            <button type="submit" className="btn btn-dark full-width">
              Добавить товар
            </button>
          </form>

          {message && <div className="message">{message}</div>}
        </section>

        <section className="card-lite">
          <h3>Список клиентов</h3>

          {users.length === 0 ? (
            <p>Клиентов пока нет</p>
          ) : (
            users.map((item) => (
              <div className="cart-item" key={item.id}>
                <div>
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-meta">{item.email}</div>
                  <div className="cart-item-meta">{item.phone || ''}</div>
                </div>

                <div>{item.role}</div>
              </div>
            ))
          )}
        </section>
      </div>

      <section className="card-lite" style={{ marginTop: 18 }}>
        <h3>Управление товарами</h3>

        <p style={{ color: '#6c6c6c' }}>
          Товары из 1С сначала попадают сюда как “не опубликованы”. После
          добавления фото админ нажимает “Опубликовать”.
        </p>

        {products.length === 0 ? (
          <p>Товаров пока нет</p>
        ) : (
          products.map((product) => (
            <div className="cart-item" key={product.id}>
              <div>
                <div className="cart-item-name">{product.name}</div>

                <div className="cart-item-meta">
                  {product.category} ·{' '}
                  {Number(product.price).toLocaleString('ru-RU')} ₽
                </div>

                <div className="cart-item-meta">
                  Артикул: {product.article || '—'} · Остаток:{' '}
                  {product.stock || 0}
                </div>

                <div className="cart-item-meta">
                  ID из 1С: {product.external_id || '—'}
                </div>

                <div className="cart-item-meta">
                  Фото: {product.image_url ? 'есть' : 'нет'}
                </div>

                <div className="cart-item-meta">
                  Статус:{' '}
                  {product.is_published ? 'Опубликован' : 'Не опубликован'} ·{' '}
                  {product.moderation_status || 'draft'}
                </div>
              </div>

              <div className="admin-actions-inline">
                <button
                  className="btn btn-light"
                  type="button"
                  onClick={() => updateProductPhoto(product.id)}
                >
                  Фото
                </button>

                {product.is_published ? (
                  <button
                    className="btn btn-light"
                    type="button"
                    onClick={() => unpublishProduct(product.id)}
                  >
                    Снять
                  </button>
                ) : (
                  <button
                    className="btn btn-dark"
                    type="button"
                    onClick={() => publishProduct(product.id)}
                  >
                    Опубликовать
                  </button>
                )}

                <button
                  className="btn btn-light"
                  type="button"
                  onClick={() => editProduct(product.id)}
                >
                  Изменить
                </button>

                <button
                  className="btn btn-light"
                  type="button"
                  onClick={() => deleteProduct(product.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="card-lite" style={{ marginTop: 18 }}>
        <h3>Слайды главного баннера</h3>

        <form className="form" onSubmit={addSlide}>
          <input
            value={slideForm.title}
            onChange={(e) =>
              setSlideForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Заголовок"
          />

          <input
            value={slideForm.subtitle}
            onChange={(e) =>
              setSlideForm((prev) => ({ ...prev, subtitle: e.target.value }))
            }
            placeholder="Подзаголовок"
          />

          <label className="admin-upload-field">
            <span>Загрузить фото или видео</span>
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={uploadSlideFile}
            />
          </label>

          {slideUploadText && <div className="message">{slideUploadText}</div>}

          {slideForm.image_url && (
            <div className="admin-slide-preview">
              {slideForm.media_type === 'video' ? (
                <video src={slideForm.image_url} controls />
              ) : (
                <img src={slideForm.image_url} alt="preview" />
              )}
            </div>
          )}

          <input
            value={slideForm.image_url}
            onChange={(e) =>
              setSlideForm((prev) => ({
                ...prev,
                image_url: e.target.value,
              }))
            }
            placeholder="Ссылка на картинку или видео"
            required
          />

          <select
            value={slideForm.media_type}
            onChange={(e) =>
              setSlideForm((prev) => ({
                ...prev,
                media_type: e.target.value,
              }))
            }
          >
            <option value="image">Фото</option>
            <option value="video">Видео</option>
          </select>

          <input
            value={slideForm.background_color}
            onChange={(e) =>
              setSlideForm((prev) => ({
                ...prev,
                background_color: e.target.value,
              }))
            }
            placeholder="#d8c900"
          />

          <input
            type="number"
            value={slideForm.sort_order}
            onChange={(e) =>
              setSlideForm((prev) => ({
                ...prev,
                sort_order: e.target.value,
              }))
            }
            placeholder="Порядок"
          />

          <button className="btn btn-dark full-width" type="submit">
            Добавить слайд
          </button>
        </form>

        <div style={{ marginTop: 18 }}>
          {slides.length === 0 ? (
            <p>Слайдов пока нет</p>
          ) : (
            slides.map((slide) => (
              <div className="cart-item" key={slide.id}>
                <div>
                  <div className="cart-item-name">
                    {slide.title || 'Слайд'}
                  </div>

                  <div className="cart-item-meta">{slide.image_url}</div>

                  <div className="cart-item-meta">
                    Тип: {slide.media_type || 'image'} · Цвет:{' '}
                    {slide.background_color} · Порядок: {slide.sort_order} ·{' '}
                    {slide.is_active ? 'Активен' : 'Выключен'}
                  </div>
                </div>

                <button
                  className="btn btn-light"
                  type="button"
                  onClick={() => deleteSlide(slide.id)}
                >
                  Удалить
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card-lite" style={{ marginTop: 18 }}>
        <h3>Смена статусов заказов</h3>

        {orders.length === 0 ? (
          <p>Заказов пока нет</p>
        ) : (
          orders.map((order) => (
            <div className="cart-item" key={order.id}>
              <div>
                <div className="cart-item-name">Заказ #{order.id}</div>

                <div className="cart-item-meta">
                  {order.customer_name} — {order.phone}
                </div>

                <div className="cart-item-meta">
                  {Number(order.total_amount).toLocaleString('ru-RU')} ₽
                </div>

                <div className="cart-item-meta">
                  {order.delivery_type === 'pickup'
                    ? 'Самовывоз'
                    : 'Доставка'}
                  {order.address ? ` · ${order.address}` : ''}
                </div>
              </div>

              <div>
                <select
                  value={order.status}
                  onChange={(event) =>
                    changeOrderStatus(order.id, event.target.value)
                  }
                >
                  <option value="new">Новый</option>
                  <option value="processing">В обработке</option>
                  <option value="shipped">Отправлен</option>
                  <option value="done">Завершён</option>
                  <option value="cancelled">Отменён</option>
                  <option value="exported_to_1c">Выгружен в 1С</option>
                </select>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}