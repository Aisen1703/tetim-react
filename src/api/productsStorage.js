const PRODUCTS_KEY = 'tetim_products';

export function getProducts() {
  return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
}

export function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function addProduct(product) {
  const products = getProducts();

  const newProduct = {
    ...product,
    id: Date.now(),
    price: Number(product.price || 0),
  };

  const nextProducts = [newProduct, ...products];
  saveProducts(nextProducts);

  return newProduct;
}

export function deleteProduct(productId) {
  const products = getProducts();

  const nextProducts = products.filter(
    product => Number(product.id) !== Number(productId)
  );

  saveProducts(nextProducts);
}