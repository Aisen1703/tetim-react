// src/components/ProductCard.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  addCartItem,
  decreaseCartItem,
  getCartItems,
} from '../utils/cartStorage.js';

// ===== КОНСТАНТЫ =====
const ALLOWED_SIZES = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'];
const DEFAULT_SIZE = 'M';

// ===== УТИЛИТЫ =====
/**
 * Форматирует цену в рублях с разделителями тысяч
 */
export function formatPrice(value) {
  const num = Number(value || 0);
  return `${num.toLocaleString('ru-RU')} ₽`;
}

/**
 * Возвращает URL изображения товара с приоритетами
 */
export function getProductImage(product) {
  if (!product) return '';
  return product.image_url || product.image || '';
}

/**
 * Нормализует размер: удаляет пробелы, приводит к верхнему регистру
 */
export function normalizeSize(size) {
  return String(size || '').trim().toUpperCase();
}

/**
 * Парсит строку размеров в массив объектов { size, stock, available }
 * Поддерживает форматы: "S:2, M:5" или просто ["S", "M"]
 */
export function parseProductSizes(product) {
  const rawSizes = product?.sizes || product?.size || '';
  const totalStock = Number(product?.stock || 0);

  // Если размеры не указаны — возвращаем все разрешённые с общим остатком
  if (!rawSizes) {
    return ALLOWED_SIZES.map((size) => ({
      size,
      stock: totalStock,
      available: totalStock > 0,
    }));
  }

  // Преобразуем входные данные в массив строк
  const parts = Array.isArray(rawSizes)
    ? rawSizes
    : String(rawSizes)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  const parsed = [];

  for (const part of parts) {
    const text = String(part || '').trim();
    if (!text) continue;

    if (text.includes(':')) {
      // Формат "S:2" — размер с индивидуальным остатком
      const [rawSize, rawStock] = text.split(':').map((item) => item.trim());
      const size = normalizeSize(rawSize);
      const stock = Math.max(0, Number(rawStock || 0));

      if (ALLOWED_SIZES.includes(size)) {
        parsed.push({ size, stock, available: stock > 0 });
      }
    } else {
      // Формат "S" — размер с общим остатком товара
      const size = normalizeSize(text);
      if (ALLOWED_SIZES.includes(size)) {
        parsed.push({ size, stock: totalStock, available: totalStock > 0 });
      }
    }
  }

  // Сортируем по предопределённому порядку ALLOWED_SIZES
  const sorted = ALLOWED_SIZES
    .map((size) => parsed.find((item) => item.size === size))
    .filter(Boolean);

  // Если ничего не распарсилось — возвращаем дефолтный набор
  return sorted.length > 0
    ? sorted
    : ALLOWED_SIZES.map((size) => ({
        size,
        stock: totalStock,
        available: totalStock > 0,
      }));
}

/**
 * Возвращает количество товара в корзине для указанного productId и размера
 */
export function getItemQuantity(productId, size = '') {
  const items = getCartItems();
  const found = items.find((item) => {
    const idMatch = String(item.id || item.product_id) === String(productId);
    const sizeMatch = String(item.size || '') === String(size || '');
    return idMatch && sizeMatch;
  });
  return Number(found?.quantity || 0);
}

// ===== КОМПОНЕНТ =====
export default function ProductCard({ product }) {
  // ===== STATE =====
  const productId = product?.id || product?.product_id;
  const sizeItems = useMemo(() => parseProductSizes(product), [product]);
  
  const firstAvailableSize = useMemo(() => {
    return (
      sizeItems.find((item) => item.available)?.size ||
      sizeItems[0]?.size ||
      DEFAULT_SIZE
    );
  }, [sizeItems]);

  const [selectedSize, setSelectedSize] = useState(firstAvailableSize);
  const [quantity, setQuantity] = useState(0);

  // ===== DERIVED VALUES =====
  const imageUrl = getProductImage(product);
  const imageUrlWithCache = imageUrl || '';
  
  const selectedSizeData = useMemo(() => {
    return (
      sizeItems.find((item) => item.size === selectedSize) || sizeItems[0]
    );
  }, [sizeItems, selectedSize]);
  
  const selectedSizeStock = Number(selectedSizeData?.stock || 0);
  const totalStock = useMemo(() => {
    return sizeItems.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  }, [sizeItems]);

  // ===== EFFECTS =====
  useEffect(() => {
    setSelectedSize(firstAvailableSize);
  }, [firstAvailableSize]);

  useEffect(() => {
    function syncQuantity() {
      setQuantity(getItemQuantity(productId, selectedSize));
    }
    
    syncQuantity();

    // Синхронизация при изменениях корзины в других вкладках/окнах
    const handlers = ['storage', 'tetim-cart-updated', 'focus'];
    handlers.forEach((event) => {
      window.addEventListener(event, syncQuantity);
    });

    return () => {
      handlers.forEach((event) => {
        window.removeEventListener(event, syncQuantity);
      });
    };
  }, [productId, selectedSize]);

  // ===== HANDLERS =====
  const handleAdd = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (selectedSizeStock <= 0) return;
    
    addCartItem(product, selectedSize);
    setQuantity(getItemQuantity(productId, selectedSize));
  }, [product, selectedSize, selectedSizeStock, productId]);

  const handleIncrease = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (quantity >= selectedSizeStock) return;
    
    addCartItem(product, selectedSize);
    setQuantity(getItemQuantity(productId, selectedSize));
  }, [product, selectedSize, selectedSizeStock, quantity, productId]);

  const handleDecrease = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    decreaseCartItem(productId, selectedSize);
    setQuantity(getItemQuantity(productId, selectedSize));
  }, [productId, selectedSize]);

  const handleSizeSelect = useCallback((size, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const sizeData = sizeItems.find((item) => item.size === size);
    const isAvailable = Number(sizeData?.stock || 0) > 0;
    
    if (!isAvailable) return;
    
    setSelectedSize(size);
    setQuantity(getItemQuantity(productId, size));
  }, [sizeItems, productId]);

  // ===== RENDER GUARD =====
  if (!product) {
    return null;
  }

  // ===== JSX =====
  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-card-link">
        {/* Изображение товара */}
        <div className="product-image">
          {imageUrl ? (
            <img
              src={imageUrlWithCache}
              alt={product.name || 'Товар'}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <span className={`product-image-placeholder ${imageUrl ? '' : 'visible'}`}>
            {product.name ? product.name.split(' ')[0] : 'TETIM'}
          </span>
        </div>

        {/* Информация о товаре */}
        <div className="product-info">
          <span className="product-category">
            {product.category_label || product.category || 'Категория'}
          </span>

          <h3 className="product-name">
            {product.name || 'Товар TETIM'}
          </h3>

          {/* Выбор размера */}
          <div className="product-size-box">
            <div className="product-size-title">
              <span>Размер</span>
              <strong>{selectedSize}</strong>
            </div>

            <div className="product-size-list" role="group" aria-label="Выбор размера">
              {ALLOWED_SIZES.map((size) => {
                const sizeData = sizeItems.find((item) => item.size === size);
                const stock = Number(sizeData?.stock || 0);
                const isAvailable = stock > 0;
                const isSelected = selectedSize === size;

                if (!isAvailable) return null;

                return (
                  <button
                    key={size}
                    type="button"
                    className={`size-btn ${isSelected ? 'active' : ''}`}
                    title={`Остаток: ${stock}`}
                    aria-pressed={isSelected}
                    onClick={(e) => handleSizeSelect(size, e)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Link>

      {/* Нижняя панель: цена и действия */}
      <div className="product-card-bottom">
        <strong className="product-price">{formatPrice(product.price)}</strong>

        {selectedSizeStock <= 0 ? (
          <button type="button" className="btn-out-of-stock" disabled>
            Нет в наличии
          </button>
        ) : quantity > 0 ? (
          <div className="product-card-quantity-wrap">
            <div className="product-card-quantity" role="group" aria-label="Количество">
              <button
                type="button"
                className="quantity-btn decrease"
                onClick={handleDecrease}
                aria-label="Уменьшить количество"
              >
                −
              </button>

              <span className="quantity-value" aria-live="polite">
                {quantity}
              </span>

              <button
                type="button"
                className="quantity-btn increase"
                onClick={handleIncrease}
                disabled={quantity >= selectedSizeStock}
                title={quantity >= selectedSizeStock ? `Максимум: ${selectedSizeStock} шт.` : ''}
              >
                +
              </button>
            </div>
            {quantity >= selectedSizeStock && (
              <span className="product-stock-limit">
                Максимум {selectedSizeStock} шт.
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="btn-add-to-cart"
            onClick={handleAdd}
            aria-label={`Добавить ${product.name || 'товар'} в корзину`}
          >
            В корзину
          </button>
        )}
      </div>
    </article>
  );
}