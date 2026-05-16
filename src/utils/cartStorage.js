export const CART_STORAGE_KEY = 'tetim_cart';

export function getCartItems() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const items = JSON.parse(raw || '[]');

    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function saveCartItems(items) {
  const safeItems = Array.isArray(items) ? items : [];

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(safeItems));

  window.dispatchEvent(
    new CustomEvent('tetim-cart-updated', {
      detail: {
        items: safeItems,
      },
    })
  );
}

export function getCartCount() {
  return getCartItems().reduce((total, item) => {
    return total + Number(item.quantity || 1);
  }, 0);
}

export function getCartTotal() {
  return getCartItems().reduce((total, item) => {
    return total + Number(item.price || 0) * Number(item.quantity || 1);
  }, 0);
}

export function addCartItem(product, size = '') {
  const items = getCartItems();

  const productId = product.id || product.product_id;
  const maxStock = Math.max(0, Number(product.stock || 0));

  if (!productId || maxStock <= 0) {
    return items;
  }

  const existingIndex = items.findIndex((item) => {
    return (
      String(item.id || item.product_id) === String(productId) &&
      String(item.size || '') === String(size || '')
    );
  });

  if (existingIndex >= 0) {
    const currentQuantity = Number(items[existingIndex].quantity || 1);

    items[existingIndex] = {
      ...items[existingIndex],
      quantity: Math.min(currentQuantity + 1, maxStock),
      max_stock: maxStock,
    };
  } else {
    items.push({
      id: productId,
      product_id: productId,
      name: product.name || 'Товар',
      category: product.category || '',
      price: Number(product.price || 0),
      image_url: product.image_url || product.image || '',
      size,
      quantity: 1,
      max_stock: maxStock,
    });
  }

  saveCartItems(items);

  return items;
}

export function decreaseCartItem(productId, size = '') {
  const items = getCartItems();

  const nextItems = items
    .map((item) => {
      const sameItem =
        String(item.id || item.product_id) === String(productId) &&
        String(item.size || '') === String(size || '');

      if (!sameItem) {
        return item;
      }

      return {
        ...item,
        quantity: Number(item.quantity || 1) - 1,
      };
    })
    .filter((item) => Number(item.quantity || 0) > 0);

  saveCartItems(nextItems);

  return nextItems;
}

export function updateCartItemQuantity(index, quantity) {
  const items = getCartItems();

  const nextItems = items.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }

    const maxStock = Math.max(1, Number(item.max_stock || item.stock || 999));
    const nextQuantity = Math.max(1, Math.min(Number(quantity || 1), maxStock));

    return {
      ...item,
      quantity: nextQuantity,
    };
  });

  saveCartItems(nextItems);

  return nextItems;
}

export function removeCartItem(index) {
  const items = getCartItems();
  const nextItems = items.filter((_, itemIndex) => itemIndex !== index);

  saveCartItems(nextItems);

  return nextItems;
}

export function clearCart() {
  saveCartItems([]);
}