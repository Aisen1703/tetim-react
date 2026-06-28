// src/components/MockupGallery.jsx
// Галерея макетов — данные загружаются с бэкенда через /public/mockups
// Чтобы добавить новую категорию — добавьте объект в MOCKUP_CATS и загрузите
// изображения через AdminDashboard → Макеты

import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const MOCKUP_CATS = [
  { key: 'tshirts',   label: 'Футболки',          categoryKeys: ['tshirts'] },
  { key: 'suits',     label: 'Костюмы',            categoryKeys: ['sets'] },
  { key: 'bottoms',   label: 'Шорты / Брюки',      categoryKeys: ['bottoms'] },
  { key: 'outerwear', label: 'Верхняя одежда',      categoryKeys: ['outerwear'] },
  { key: 'vests',     label: 'Жилеты',             categoryKeys: ['vests'] },
  { key: 'acc',       label: 'Аксессуары',          categoryKeys: ['acc'] },
];

function getImg(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

export default function MockupGallery({ activeCategoryKey }) {
  const [allMockups, setAllMockups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  // Автовыбор вкладки по выбранной категории товара
  const autoTab = MOCKUP_CATS.find(c => c.categoryKeys.includes(activeCategoryKey));
  const [activeTab, setActiveTab] = useState(autoTab?.key || MOCKUP_CATS[0].key);

  useEffect(() => {
    fetch(`${API_URL}/public/mockups`)
      .then(r => r.json())
      .then(d => setAllMockups(d.mockups || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (autoTab) setActiveTab(autoTab.key);
  }, [activeCategoryKey]);

  const images = allMockups.filter(m => m.category === activeTab);

  // Показываем только если есть хоть одна категория с макетами
  const hasAny = allMockups.length > 0;
  if (!loading && !hasAny) return null;

  const openLightbox = useCallback((m, index) => {
    setLightbox({ m, index, images });
  }, [images]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const prevImage = useCallback(() => {
    if (!lightbox) return;
    const i = (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length;
    setLightbox({ ...lightbox, m: lightbox.images[i], index: i });
  }, [lightbox]);

  const nextImage = useCallback(() => {
    if (!lightbox) return;
    const i = (lightbox.index + 1) % lightbox.images.length;
    setLightbox({ ...lightbox, m: lightbox.images[i], index: i });
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, closeLightbox, prevImage, nextImage]);

  // Показываем только вкладки с макетами
  const visibleTabs = MOCKUP_CATS.filter(c =>
    allMockups.some(m => m.category === c.key)
  );

  return (
    <section className="mg-section">
      <div className="container">
        <h2 className="co-section-title">Примеры работ</h2>
        <p className="mg-subtitle">Нажмите на макет для увеличения.</p>

        <div className="mg-tabs">
          {visibleTabs.map(cat => {
            const count = allMockups.filter(m => m.category === cat.key).length;
            return (
              <button key={cat.key} type="button"
                className={`mg-tab${activeTab === cat.key ? ' active' : ''}`}
                onClick={() => setActiveTab(cat.key)}
              >
                {cat.label}
                <span className="mg-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="co-loading">Загрузка макетов...</div>
        ) : images.length === 0 ? (
          <div className="co-loading">Макетов в этой категории пока нет</div>
        ) : (
          <div className="mg-grid">
            {images.map((m, i) => (
              <button key={m.id} type="button" className="mg-card"
                onClick={() => openLightbox(m, i)}
                aria-label={`Макет ${i + 1}`}
              >
                <img src={getImg(m.image_url)} alt={`Макет ${i + 1}`} loading="lazy" />
                <span className="mg-card-overlay">
                  <span className="mg-card-zoom">🔍</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="mg-lightbox" onClick={closeLightbox}>
          <button type="button" className="mg-lb-close" onClick={closeLightbox}>×</button>
          <button type="button" className="mg-lb-arrow mg-lb-prev" onClick={e => { e.stopPropagation(); prevImage(); }}>‹</button>
          <div className="mg-lb-img-wrap" onClick={e => e.stopPropagation()}>
            <img src={getImg(lightbox.m.image_url)} alt="" />
            <div className="mg-lb-counter">{lightbox.index + 1} / {lightbox.images.length}</div>
          </div>
          <button type="button" className="mg-lb-arrow mg-lb-next" onClick={e => { e.stopPropagation(); nextImage(); }}>›</button>
        </div>
      )}
    </section>
  );
}