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

function getProductSizes(product) {
  const rawSizes = product.sizes || product.size || '';

  const productSizes = Array.isArray(rawSizes)
    ? rawSizes.map(normalizeSize)
    : String(rawSizes || '')
        .split(',')
        .map(normalizeSize)
        .filter(Boolean);

  const filteredSizes = allowedSizes.filter((size) =>
    productSizes.includes(size)
  );

  return filteredSizes.length > 0 ? filteredSizes : allowedSizes;
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
  const sizes = useMemo(() => getProductSizes(product || {}), [product]);

  const [selectedSize, setSelectedSize] = useState(sizes[0] || 'M');
  const [quantity, setQuantity] = useState(0);

  const imageUrl = getProductImage(product || {});
  const stock = Number(product?.stock || 0);

  useEffect(() => {
    setSelectedSize(sizes[0] || 'M');
  }, [sizes]);

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

    addCartItem(product, selectedSize);
    setQuantity(getItemQuantity(productId, selectedSize));
  }

  function handleIncrease(event) {
    event.preventDefault();
    event.stopPropagation();

    if (quantity >= stock) {
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
              <strong>{selectedSize}</strong>
            </div>

            <div className="product-size-list">
              {allowedSizes.map((size) => {
                const isAvailable = sizes.includes(size);

                return (
                  <button
                    key={size}
                    type="button"
                    className={selectedSize === size ? 'active' : ''}
                    disabled={!isAvailable}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      if (!isAvailable) return;

                      setSelectedSize(size);
                      setQuantity(getItemQuantity(productId, size));
                    }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="product-stock">
            Остаток: {stock}
          </p>
        </div>
      </Link>

      <div className="product-card-bottom">
        <strong>{formatPrice(product.price)}</strong>

        {stock <= 0 ? (
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
              disabled={quantity >= stock}
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