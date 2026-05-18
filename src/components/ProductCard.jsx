import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  addCartItem,
  decreaseCartItem,
  getCartItems,
} from '../utils/cartStorage.js';

const allowedSizes = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'];

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function getProductImage(product) {
  if (product.image_url) return product.image_url;
  if (product.image) return product.image;

  return '';
}

function normalizeSize(size) {
  return String(size || '').trim().toUpperCase();
}

function parseProductSizes(product) {
  const rawSizes = product.sizes || product.size || '';
  const totalStock = Number(product.stock || 0);

  if (!rawSizes) {
    return allowedSizes.map((size) => ({
      size,
      stock: totalStock,
      available: totalStock > 0,
    }));
  }

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
      const [rawSize, rawStock] = text.split(':').map((item) => item.trim());
      const size = normalizeSize(rawSize);
      const stock = Math.max(0, Number(rawStock || 0));

      if (allowedSizes.includes(size)) {
        parsed.push({
          size,
          stock,
          available: stock > 0,
        });
      }
    } else {
      const size = normalizeSize(text);

      if (allowedSizes.includes(size)) {
        parsed.push({
          size,
          stock: totalStock,
          available: totalStock > 0,
        });
      }
    }
  }

  const sorted = allowedSizes
    .map((size) => parsed.find((item) => item.size === size))
    .filter(Boolean);

  return sorted.length > 0
    ? sorted
    : allowedSizes.map((size) => ({
        size,
        stock: totalStock,
        available: totalStock > 0,
      }));
}

function getItemQuantity(productId, size = '') {
  const items = getCartItems();

  const found = items.find((item) => {
    return (
      String(item.id || item.product_id) === String(productId) &&
      String(item.size || '') === String(size || '')
    );
  });

  return Number(found?.quantity || 0);
}

export default function ProductCard({ product }) {
  const productId = product?.id || product?.product_id;

  const sizeItems = useMemo(() => parseProductSizes(product || {}), [product]);

  const firstAvailableSize =
    sizeItems.find((item) => item.available)?.size || sizeItems[0]?.size || 'M';

  const [selectedSize, setSelectedSize] = useState(firstAvailableSize);
  const [quantity, setQuantity] = useState(0);

  const imageUrl = getProductImage(product || {});

  const selectedSizeData =
    sizeItems.find((item) => item.size === selectedSize) || sizeItems[0];

  const selectedSizeStock = Number(selectedSizeData?.stock || 0);
  const totalStock = sizeItems.reduce((sum, item) => sum + Number(item.stock || 0), 0);

  useEffect(() => {
    setSelectedSize(firstAvailableSize);
  }, [firstAvailableSize]);

  useEffect(() => {
    function syncQuantity() {
      setQuantity(getItemQuantity(productId, selectedSize));
    }

    syncQuantity();

    window.addEventListener('storage', syncQuantity);
    window.addEventListener('tetim-cart-updated', syncQuantity);
    window.addEventListener('focus', syncQuantity);

    return () => {
      window.removeEventListener('storage', syncQuantity);
      window.removeEventListener('tetim-cart-updated', syncQuantity);
      window.removeEventListener('focus', syncQuantity);
    };
  }, [productId, selectedSize]);

  if (!product) {
    return null;
  }

  function handleAdd(event) {
    event.preventDefault();
    event.stopPropagation();

    if (selectedSizeStock <= 0) {
      return;
    }

    addCartItem(product, selectedSize);
    setQuantity(getItemQuantity(productId, selectedSize));
  }

  function handleIncrease(event) {
    event.preventDefault();
    event.stopPropagation();

    if (quantity >= selectedSizeStock) {
      return;
    }

    addCartItem(product, selectedSize);
    setQuantity(getItemQuantity(productId, selectedSize));
  }

  function handleDecrease(event) {
    event.preventDefault();
    event.stopPropagation();

    decreaseCartItem(productId, selectedSize);
    setQuantity(getItemQuantity(productId, selectedSize));
  }

  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-card-link">
        <div className="product-image">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name || 'Товар'} />
          ) : (
            <span>{product.name ? product.name.split(' ')[0] : 'TETIM'}</span>
          )}
        </div>

        <div className="product-info">
          <span className="product-category">
            {product.category_label || product.category || 'Категория'}
          </span>

          <h3>{product.name || 'Товар TETIM'}</h3>

          <div className="product-size-box">
            <div className="product-size-title">
              <span>Размер</span>

              <strong>
                {selectedSize}
              </strong>
            </div>

            <div className="product-size-list">
              {allowedSizes.map((size) => {
                const sizeData = sizeItems.find((item) => item.size === size);
                const isAvailable = Number(sizeData?.stock || 0) > 0;
                const stock = Number(sizeData?.stock || 0);

                return (
                  <button
                    key={size}
                    type="button"
                    className={selectedSize === size ? 'active' : ''}
                    disabled={!isAvailable}
                    title={isAvailable ? `Остаток: ${stock}` : 'Нет в наличии'}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      if (!isAvailable) return;

                      setSelectedSize(size);
                      setQuantity(getItemQuantity(productId, size));
                    }}
                  >
                    <span>{size}</span>
                    <small>{stock}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="product-stock">
            Остаток размера {selectedSize}: {selectedSizeStock}
          </p>

          <p className="product-stock total">
            Всего: {totalStock}
          </p>
        </div>
      </Link>

      <div className="product-card-bottom">
        <strong>{formatPrice(product.price)}</strong>

        {selectedSizeStock <= 0 ? (
          <button type="button" disabled>
            Нет в наличии
          </button>
        ) : quantity > 0 ? (
          <div className="product-card-quantity">
            <button type="button" onClick={handleDecrease}>
              −
            </button>

            <span>{quantity}</span>

            <button
              type="button"
              onClick={handleIncrease}
              disabled={quantity >= selectedSizeStock}
            >
              +
            </button>
          </div>
        ) : (
          <button type="button" onClick={handleAdd}>
            В корзину
          </button>
        )}
      </div>
    </article>
  );
}