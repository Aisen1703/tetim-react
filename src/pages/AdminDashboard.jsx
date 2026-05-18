import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:4000/api";
const SIZE_OPTIONS = ["2XS", "XS", "S", "M", "L", "XL", "2XL"];

const emptySizeStock = () =>
  SIZE_OPTIONS.reduce((acc, size) => {
    acc[size] = "";
    return acc;
  }, {});

const emptyProductForm = () => ({
  id_1c: "",
  article: "",
  name: "",
  category: "Аксессуары",
  price: "",
  stock: "",
  sizes: "",
  description: "",
  image_url: "",
  is_published: 0,
  sizeStocks: emptySizeStock(),
  imageFile: null,
});

function normalizeImage(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `http://localhost:4000${url}`;
  return `http://localhost:4000/${url}`;
}

function parseSizeStocks(value = "") {
  const result = emptySizeStock();

  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const [sizeRaw, qtyRaw] = item.split(":");
      const size = String(sizeRaw || "").trim();
      const qty = String(qtyRaw || "").trim();

      if (SIZE_OPTIONS.includes(size)) {
        result[size] = qty;
      }
    });

  return result;
}

function formatSizeStocks(sizeStocks = {}) {
  return SIZE_OPTIONS.filter((size) => String(sizeStocks[size] || "").trim() !== "")
    .map((size) => `${size}:${sizeStocks[size]}`)
    .join(", ");
}

function calcTotalStock(sizeStocks = {}) {
  return SIZE_OPTIONS.reduce((sum, size) => {
    const value = parseInt(sizeStocks[size] || 0, 10);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);
}

function mapProductToForm(product) {
  const sizeStocks = parseSizeStocks(product.sizes || "");
  return {
    id: product.id,
    id_1c: product.id_1c || "",
    article: product.article || "",
    name: product.name || "",
    category: product.category || "Аксессуары",
    price: product.price ?? "",
    stock: product.stock ?? calcTotalStock(sizeStocks),
    sizes: product.sizes || "",
    description: product.description || "",
    image_url: product.image_url || "",
    is_published: product.is_published ? 1 : 0,
    sizeStocks,
    imageFile: null,
  };
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [createForm, setCreateForm] = useState(emptyProductForm());
  const [editingProduct, setEditingProduct] = useState(null);

  const [importFile, setImportFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const categories = [
    "Аксессуары",
    "Акционные товары",
    "Брюки и Шорты",
    "Головные уборы",
    "Джемпера, свитшоты, толстовки",
    "Жилеты",
    "Костюмы, комплекты",
    "Пуховики, куртки, ветровки",
    "Рубашки",
    "Футболки и Лонгсливы",
  ];

  const loadAll = async () => {
    try {
      setLoading(true);

      const [productsRes, ordersRes, customersRes] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/orders`),
        fetch(`${API_BASE}/customers`),
      ]);

      const productsData = productsRes.ok ? await productsRes.json() : [];
      const ordersData = ordersRes.ok ? await ordersRes.json() : [];
      const customersData = customersRes.ok ? await customersRes.json() : [];

      setProducts(Array.isArray(productsData) ? productsData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      setMessage("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const stats = useMemo(() => {
    const published = products.filter((item) => Number(item.is_published) === 1).length;
    const drafts = products.filter((item) => Number(item.is_published) !== 1).length;
    const newOrders = orders.filter(
      (item) => String(item.status || "").toLowerCase() === "новый"
    ).length;

    return {
      totalProducts: products.length,
      published,
      drafts,
      newOrders,
    };
  }, [products, orders]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => {
      const haystack = [
        product.name,
        product.article,
        product.id_1c,
        product.category,
        product.description,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [products, search]);

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateSizeChange = (size, value) => {
    setCreateForm((prev) => {
      const sizeStocks = { ...prev.sizeStocks, [size]: value };
      return {
        ...prev,
        sizeStocks,
        sizes: formatSizeStocks(sizeStocks),
        stock: calcTotalStock(sizeStocks),
      };
    });
  };

  const handleEditChange = (field, value) => {
    setEditingProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSizeChange = (size, value) => {
    setEditingProduct((prev) => {
      const sizeStocks = { ...prev.sizeStocks, [size]: value };
      return {
        ...prev,
        sizeStocks,
        sizes: formatSizeStocks(sizeStocks),
        stock: calcTotalStock(sizeStocks),
      };
    });
  };

  const buildProductFormData = (form) => {
    const data = new FormData();

    data.append("id_1c", form.id_1c || "");
    data.append("article", form.article || "");
    data.append("name", form.name || "");
    data.append("category", form.category || "");
    data.append("price", String(form.price || 0));
    data.append("stock", String(calcTotalStock(form.sizeStocks)));
    data.append("sizes", formatSizeStocks(form.sizeStocks));
    data.append("description", form.description || "");
    data.append("image_url", form.image_url || "");
    data.append("is_published", String(form.is_published ? 1 : 0));

    if (form.imageFile) {
      data.append("image", form.imageFile);
    }

    return data;
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(`${API_BASE}/products`, {
        method: "POST",
        body: buildProductFormData(createForm),
      });

      if (!response.ok) {
        throw new Error("Ошибка создания товара");
      }

      setCreateForm(emptyProductForm());
      setMessage("Товар успешно добавлен");
      await loadAll();
    } catch (error) {
      console.error(error);
      setMessage("Не удалось добавить товар");
    } finally {
      setSaving(false);
    }
  };

  const openEditProduct = (product) => {
    setEditingProduct(mapProductToForm(product));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditProduct = () => {
    setEditingProduct(null);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct?.id) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(`${API_BASE}/products/${editingProduct.id}`, {
        method: "PUT",
        body: buildProductFormData(editingProduct),
      });

      if (!response.ok) {
        throw new Error("Ошибка сохранения товара");
      }

      setMessage("Товар сохранён");
      setEditingProduct(null);
      await loadAll();
    } catch (error) {
      console.error(error);
      setMessage("Не удалось сохранить товар");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    const ok = window.confirm("Удалить товар?");
    if (!ok) return;

    try {
      const response = await fetch(`${API_BASE}/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Ошибка удаления");
      }

      if (editingProduct?.id === id) {
        setEditingProduct(null);
      }

      await loadAll();
      setMessage("Товар удалён");
    } catch (error) {
      console.error(error);
      setMessage("Не удалось удалить товар");
    }
  };

  const togglePublishProduct = async (product) => {
    try {
      const nextStatus = Number(product.is_published) === 1 ? 0 : 1;

      const response = await fetch(`${API_BASE}/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...product,
          is_published: nextStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка публикации");
      }

      await loadAll();
    } catch (error) {
      console.error(error);
      setMessage("Не удалось изменить публикацию");
    }
  };

  const handleImportProducts = async () => {
    if (!importFile) {
      setMessage("Сначала выберите Excel / CSV / ODS файл");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const data = new FormData();
      data.append("file", importFile);

      const response = await fetch(`${API_BASE}/products/import`, {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        throw new Error("Ошибка импорта");
      }

      const result = await response.json().catch(() => null);
      if (result?.message) {
        setMessage(result.message);
      } else {
        setMessage("Импорт завершён");
      }

      setImportFile(null);
      await loadAll();
    } catch (error) {
      console.error(error);
      setMessage("Не удалось импортировать товары");
    } finally {
      setSaving(false);
    }
  };

  const renderSizeStockEditor = (form, onChange) => (
    <div className="admin-size-stock-box">
      <div className="admin-label">Остатки по размерам</div>

      <div className="admin-size-stock-grid">
        {SIZE_OPTIONS.map((size) => (
          <label key={size} className="admin-size-stock-item">
            <span>{size}</span>
            <input
              type="number"
              min="0"
              value={form.sizeStocks[size]}
              onChange={(e) => onChange(size, e.target.value)}
              placeholder="0"
            />
          </label>
        ))}
      </div>

      <div className="admin-size-stock-format">
        Формат: {formatSizeStocks(form.sizeStocks) || "2XS:5, XS:3, XL:1"}
      </div>
    </div>
  );

  const renderProductsList = () => (
    <div className="admin-products-list-card">
      <div className="admin-panel-head">
        <div>
          <h2>Управление товарами</h2>
          <p>Публикация, редактирование, удаление и товары из 1С</p>
        </div>

        <input
          className="admin-search"
          type="text"
          placeholder="Поиск товара"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="admin-empty">Загрузка товаров...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="admin-empty">Товаров пока нет</div>
      ) : (
        <div className="admin-products-table">
          {filteredProducts.map((product) => (
            <div className="admin-product-row" key={product.id}>
              <div className="admin-product-main">
                <div className="admin-product-thumb">
                  {product.image_url ? (
                    <img src={normalizeImage(product.image_url)} alt={product.name} />
                  ) : (
                    <span>Нет фото</span>
                  )}
                </div>

                <div className="admin-product-info">
                  <h4>{product.name}</h4>
                  <p>
                    Артикул: {product.article || "—"} · ID 1C: {product.id_1c || "—"}
                  </p>
                  <p>Размеры: {product.sizes || "—"}</p>
                </div>
              </div>

              <div className="admin-product-cell">{product.category || "—"}</div>
              <div className="admin-product-cell">
                {Number(product.price || 0).toLocaleString("ru-RU")} ₽
              </div>
              <div className="admin-product-cell">{product.stock || 0}</div>

              <div className="admin-product-status">
                {Number(product.is_published) === 1 ? "Опубликован" : "Черновик"}
              </div>

              <div className="admin-product-actions">
                <button
                  className={`admin-btn ${
                    Number(product.is_published) === 1 ? "admin-btn-dark" : "admin-btn-green"
                  }`}
                  onClick={() => togglePublishProduct(product)}
                >
                  {Number(product.is_published) === 1 ? "Снять" : "Опубликовать"}
                </button>

                <button className="admin-btn admin-btn-light" onClick={() => openEditProduct(product)}>
                  Изменить
                </button>

                <button
                  className="admin-btn admin-btn-danger"
                  onClick={() => handleDeleteProduct(product.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderEditProduct = () => {
    if (!editingProduct) return null;

    return (
      <div className="admin-edit-card">
        <div className="admin-edit-header">
          <div>
            <h2>Редактировать товар</h2>
            <p>Редактор открыт вместо списка товаров</p>
          </div>

          <button className="admin-btn admin-btn-light" onClick={cancelEditProduct}>
            Назад к списку
          </button>
        </div>

        <form className="admin-edit-layout" onSubmit={handleSaveProduct}>
          <div className="admin-edit-preview">
            <div className="admin-edit-image">
              {editingProduct.imageFile ? (
                <img
                  src={URL.createObjectURL(editingProduct.imageFile)}
                  alt="preview"
                />
              ) : editingProduct.image_url ? (
                <img
                  src={normalizeImage(editingProduct.image_url)}
                  alt={editingProduct.name}
                />
              ) : (
                <div className="admin-no-photo">Нет фото</div>
              )}
            </div>

            <div className="admin-edit-summary">
              <h3>{editingProduct.name || "Без названия"}</h3>
              <p>{editingProduct.category || "Категория"}</p>
              <div className="admin-edit-price">
                {Number(editingProduct.price || 0).toLocaleString("ru-RU")} ₽
              </div>
              <div className="admin-edit-stock-total">
                Общий остаток: {calcTotalStock(editingProduct.sizeStocks)}
              </div>
            </div>
          </div>

          <div className="admin-edit-fields">
            <div className="admin-form-grid">
              <input
                type="text"
                placeholder="ID из 1C"
                value={editingProduct.id_1c}
                onChange={(e) => handleEditChange("id_1c", e.target.value)}
              />

              <input
                type="text"
                placeholder="Артикул"
                value={editingProduct.article}
                onChange={(e) => handleEditChange("article", e.target.value)}
              />

              <input
                type="text"
                placeholder="Название товара"
                value={editingProduct.name}
                onChange={(e) => handleEditChange("name", e.target.value)}
              />

              <select
                value={editingProduct.category}
                onChange={(e) => handleEditChange("category", e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Цена"
                value={editingProduct.price}
                onChange={(e) => handleEditChange("price", e.target.value)}
              />

              <input
                type="text"
                placeholder="Ссылка на фото"
                value={editingProduct.image_url}
                onChange={(e) => handleEditChange("image_url", e.target.value)}
              />

              <div className="admin-upload-box admin-upload-box--full">
                <div className="admin-upload-title">Загрузить новое фото</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditingProduct((prev) => ({
                      ...prev,
                      imageFile: e.target.files?.[0] || null,
                    }))
                  }
                />
              </div>

              <div className="admin-form-wide">
                {renderSizeStockEditor(editingProduct, handleEditSizeChange)}
              </div>

              <textarea
                className="admin-form-wide"
                rows="7"
                placeholder="Описание товара"
                value={editingProduct.description}
                onChange={(e) => handleEditChange("description", e.target.value)}
              />
            </div>

            <div className="admin-edit-actions">
              <button type="submit" className="admin-btn admin-btn-dark" disabled={saving}>
                {saving ? "Сохранение..." : "Сохранить товар"}
              </button>

              <button
                type="button"
                className="admin-btn admin-btn-light"
                onClick={cancelEditProduct}
              >
                Отмена
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="admin-dashboard-page">
      <div className="admin-hero-card">
        <div>
          <h1>Панель управления</h1>
          <p>Товары, заказы, клиенты и конструктор сайта TETIM</p>
        </div>

        <button className="admin-btn admin-btn-dark" onClick={loadAll}>
          Обновить
        </button>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span>Всего товаров</span>
          <strong>{stats.totalProducts}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Опубликовано</span>
          <strong>{stats.published}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Черновики / 1С</span>
          <strong>{stats.drafts}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Новые заказы</span>
          <strong>{stats.newOrders}</strong>
        </div>
      </div>

      {message ? <div className="admin-message">{message}</div> : null}

      <div className="admin-products-layout">
        <div className="admin-add-card">
          <h2>Добавить товар</h2>
          <p>Новые товары вручную, из 1С или импортом из Excel</p>

          <div className="admin-import-card">
            <h3>Загрузить товары из Excel / CSV / ODS</h3>
            <p>Поддержка: .xlsx, .xls, .csv, .ods, .tsv, .txt</p>

            <input
              type="file"
              accept=".xlsx,.xls,.csv,.ods,.tsv,.txt"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />

            <button
              className="admin-btn admin-btn-dark admin-btn-block"
              type="button"
              onClick={handleImportProducts}
              disabled={saving}
            >
              Импортировать
            </button>
          </div>

          <form className="admin-add-form" onSubmit={handleCreateProduct}>
            <input
              type="text"
              placeholder="ID из 1С"
              value={createForm.id_1c}
              onChange={(e) => handleCreateChange("id_1c", e.target.value)}
            />

            <input
              type="text"
              placeholder="Артикул"
              value={createForm.article}
              onChange={(e) => handleCreateChange("article", e.target.value)}
            />

            <input
              type="text"
              placeholder="Название товара"
              value={createForm.name}
              onChange={(e) => handleCreateChange("name", e.target.value)}
            />

            <select
              value={createForm.category}
              onChange={(e) => handleCreateChange("category", e.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Цена"
              value={createForm.price}
              onChange={(e) => handleCreateChange("price", e.target.value)}
            />

            <input
              type="text"
              placeholder="Ссылка на фото"
              value={createForm.image_url}
              onChange={(e) => handleCreateChange("image_url", e.target.value)}
            />

            <div className="admin-upload-box">
              <div className="admin-upload-title">Загрузить фото</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    imageFile: e.target.files?.[0] || null,
                  }))
                }
              />
            </div>

            {renderSizeStockEditor(createForm, handleCreateSizeChange)}

            <textarea
              rows="5"
              placeholder="Описание товара"
              value={createForm.description}
              onChange={(e) => handleCreateChange("description", e.target.value)}
            />

            <button className="admin-btn admin-btn-dark admin-btn-block" type="submit" disabled={saving}>
              {saving ? "Сохранение..." : "Добавить товар"}
            </button>
          </form>
        </div>

        <div className="admin-work-card">
          {editingProduct ? renderEditProduct() : renderProductsList()}
        </div>
      </div>
    </div>
  );
}