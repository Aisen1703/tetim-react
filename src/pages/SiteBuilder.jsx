import { useEffect, useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Типы блоков
const BLOCK_TYPES = [
  {
    type: 'hero',
    label: 'Главный экран',
    icon: '🏠',
    desc: 'Заголовок, текст, кнопки',
    fields: [
      { key: 'hero_badge',            label: 'Бейдж',             type: 'text',     placeholder: 'Новая коллекция' },
      { key: 'hero_title',            label: 'Заголовок',          type: 'text',     placeholder: 'Одежда с характером Севера' },
      { key: 'hero_text',             label: 'Описание',           type: 'textarea', placeholder: 'Текст под заголовком' },
      { key: 'hero_button_primary',   label: 'Кнопка 1',           type: 'text',     placeholder: 'Каталог' },
      { key: 'hero_button_secondary', label: 'Кнопка 2',           type: 'text',     placeholder: 'Индивидуальный заказ' },
    ],
  },
  {
    type: 'contacts',
    label: 'Контакты',
    icon: '📞',
    desc: 'Телефон, email, адрес',
    fields: [
      { key: 'phone',   label: 'Телефон', type: 'text', placeholder: '+7 999 060 00 75' },
      { key: 'email',   label: 'Email',   type: 'text', placeholder: 'info@tetim.ru' },
      { key: 'address', label: 'Адрес',   type: 'text', placeholder: 'Якутск' },
    ],
  },
  {
    type: 'socials',
    label: 'Соцсети',
    icon: '🌐',
    desc: 'Instagram, WhatsApp, Telegram',
    fields: [
      { key: 'instagram_url',  label: 'Instagram',  type: 'text', placeholder: 'https://instagram.com/tetim' },
      { key: 'whatsapp_url',   label: 'WhatsApp',   type: 'text', placeholder: 'https://wa.me/79990600075' },
      { key: 'social_extra_url', label: 'Ссылка 3', type: 'text', placeholder: 'https://...' },
    ],
  },
  {
    type: 'appearance',
    label: 'Оформление',
    icon: '🎨',
    desc: 'Тема, цвета, логотип',
    fields: [
      { key: 'site_title',  label: 'Название сайта', type: 'text',  placeholder: 'TETIM' },
      { key: 'site_theme',  label: 'Тема',           type: 'select', options: [
        { value: 'auto',             label: 'Авто по праздникам' },
        { value: 'sakha',            label: 'Саха' },
        { value: 'newyear',          label: 'Новогодняя' },
        { value: 'defender',         label: '23 февраля' },
        { value: 'womens',           label: '8 марта' },
        { value: 'sakha-republic',   label: 'День Республики' },
        { value: 'ysyakh',           label: 'Ысыах' },
        { value: 'sakha-statehood',  label: 'День государственности' },
      ]},
      { key: 'accent_color',      label: 'Цвет акцента', type: 'color' },
      { key: 'background_color',  label: 'Фон сайта',    type: 'color' },
      { key: 'footer_text',       label: 'Текст footer', type: 'text', placeholder: '© 2026 TETIM' },
    ],
  },
  {
    type: 'logo',
    label: 'Логотип',
    icon: '🖼',
    desc: 'Логотип и орнамент',
    fields: [
      { key: 'logo_url',       label: 'Логотип (тёмный)',  type: 'upload' },
      { key: 'logo_white_url', label: 'Логотип (белый)',   type: 'upload' },
      { key: 'header_ornament_url', label: 'Орнамент шапки', type: 'upload' },
    ],
  },
  {
    type: 'footer',
    label: 'Подвал',
    icon: '📄',
    desc: 'Текст и ссылки внизу страницы',
    fields: [
      { key: 'footer_text', label: 'Текст подвала', type: 'text', placeholder: '© 2026 TETIM. Все права защищены.' },
    ],
  },
];

const defaultSettings = {
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
  hero_text: 'Создаём одежду для города, спорта и активной жизни.',
  hero_button_primary: 'Каталог',
  hero_button_secondary: 'Индивидуальный заказ',
  accent_color: '#111111',
  background_color: '#f4f0e8',
};

async function safeJson(r) { try { return await r.json(); } catch { return {}; } }

export default function SiteBuilder({ token }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeBlock, setActiveBlock] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slides, setSlides] = useState([]);
  const [slideForm, setSlideForm] = useState({ title: '', image_url: '', media_type: 'image', sort_order: 0 });
  const [uploadingSlide, setUploadingSlide] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { loadSettings(); loadSlides(); }, []);

  async function loadSettings() {
    const r = await fetch(`${API_URL}/admin/settings`, { headers });
    const d = await safeJson(r);
    if (r.ok) setSettings({ ...defaultSettings, ...(d.settings || {}) });
  }

  async function loadSlides() {
    const r = await fetch(`${API_URL}/admin/slides`, { headers });
    const d = await safeJson(r);
    if (r.ok) setSlides(d.slides || []);
  }

  async function saveSettings() {
    setSaving(true);
    const r = await fetch(`${API_URL}/admin/settings`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${API_URL}/admin/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const d = await safeJson(r);
    if (!r.ok) throw new Error(d.message || 'Ошибка загрузки');
    return d.url;
  }

  async function handleUpload(key, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setSettings(p => ({ ...p, [key]: url }));
    } catch {}
    setUploading(false);
    e.target.value = '';
  }

  async function handleSlideUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlide(true);
    try {
      const url = await uploadFile(file);
      const isVideo = file.type.startsWith('video/');
      setSlideForm(p => ({ ...p, image_url: url, media_type: isVideo ? 'video' : 'image' }));
    } catch {}
    setUploadingSlide(false);
    e.target.value = '';
  }

  async function addSlide(e) {
    e.preventDefault();
    if (!slideForm.image_url) return;
    const r = await fetch(`${API_URL}/admin/slides`, {
      method: 'POST', headers,
      body: JSON.stringify(slideForm),
    });
    if (r.ok) {
      setSlideForm({ title: '', image_url: '', media_type: 'image', sort_order: 0 });
      loadSlides();
    }
  }

  async function deleteSlide(id) {
    await fetch(`${API_URL}/admin/slides/${id}`, { method: 'DELETE', headers });
    loadSlides();
  }

  const set = useCallback((key, val) => setSettings(p => ({ ...p, [key]: val })), []);

  const activeBlockDef = BLOCK_TYPES.find(b => b.type === activeBlock);

  return (
    <div className="tilda-builder">

      {/* ── Топбар ── */}
      <div className="tilda-topbar">
        <div className="tilda-topbar-left">
          <span className="tilda-topbar-title">Конструктор сайта</span>
        </div>
        <div className="tilda-topbar-right">
          <a href="/" target="_blank" className="tilda-btn-ghost">Открыть сайт ↗</a>
          <button
            type="button"
            className={`tilda-btn-save${saved ? ' saved' : ''}`}
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? 'Сохраняем...' : saved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="tilda-body">

        {/* ── Левая панель: блоки ── */}
        <aside className="tilda-sidebar">
          <div className="tilda-sidebar-title">Разделы</div>
          {BLOCK_TYPES.map(block => (
            <button
              key={block.type}
              type="button"
              className={`tilda-block-btn${activeBlock === block.type ? ' active' : ''}`}
              onClick={() => setActiveBlock(activeBlock === block.type ? null : block.type)}
            >
              <span className="tilda-block-icon">{block.icon}</span>
              <div className="tilda-block-info">
                <strong>{block.label}</strong>
                <span>{block.desc}</span>
              </div>
              <span className="tilda-block-arrow">{activeBlock === block.type ? '▾' : '›'}</span>
            </button>
          ))}

          {/* Слайды — отдельный раздел */}
          <button
            type="button"
            className={`tilda-block-btn${activeBlock === 'slides' ? ' active' : ''}`}
            onClick={() => setActiveBlock(activeBlock === 'slides' ? null : 'slides')}
          >
            <span className="tilda-block-icon">🎞</span>
            <div className="tilda-block-info">
              <strong>Слайды</strong>
              <span>Фото и видео слайдера</span>
            </div>
            <span className="tilda-block-arrow">{activeBlock === 'slides' ? '▾' : '›'}</span>
          </button>
        </aside>

        {/* ── Правая часть: редактор + превью ── */}
        <main className="tilda-main">

          {/* Редактор блока */}
          {activeBlock && activeBlock !== 'slides' && activeBlockDef && (
            <div className="tilda-editor">
              <div className="tilda-editor-header">
                <span>{activeBlockDef.icon}</span>
                <h2>{activeBlockDef.label}</h2>
              </div>

              <div className="tilda-fields">
                {activeBlockDef.fields.map(field => (
                  <div key={field.key} className="tilda-field">
                    <label className="tilda-field-label">{field.label}</label>

                    {field.type === 'text' && (
                      <input
                        className="tilda-input"
                        value={settings[field.key] || ''}
                        onChange={e => set(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                      />
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        className="tilda-textarea"
                        value={settings[field.key] || ''}
                        onChange={e => set(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                        rows={3}
                      />
                    )}

                    {field.type === 'color' && (
                      <div className="tilda-color-row">
                        <input
                          type="color"
                          className="tilda-color-picker"
                          value={settings[field.key] || '#111111'}
                          onChange={e => set(field.key, e.target.value)}
                        />
                        <input
                          className="tilda-input tilda-input-color-text"
                          value={settings[field.key] || ''}
                          onChange={e => set(field.key, e.target.value)}
                          placeholder="#111111"
                        />
                      </div>
                    )}

                    {field.type === 'select' && (
                      <select
                        className="tilda-select"
                        value={settings[field.key] || ''}
                        onChange={e => set(field.key, e.target.value)}
                      >
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'upload' && (
                      <div className="tilda-upload-field">
                        {settings[field.key] && (
                          <img
                            src={settings[field.key]}
                            alt=""
                            className="tilda-upload-preview"
                          />
                        )}
                        <div className="tilda-upload-row">
                          <input
                            className="tilda-input tilda-input-flex"
                            value={settings[field.key] || ''}
                            onChange={e => set(field.key, e.target.value)}
                            placeholder="Ссылка или загрузите файл"
                          />
                          <label className={`tilda-upload-btn${uploading ? ' loading' : ''}`}>
                            {uploading ? '...' : '↑ Загрузить'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => handleUpload(field.key, e)}
                              disabled={uploading}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Инлайн-превью для hero */}
              {activeBlock === 'hero' && (
                <div className="tilda-preview-box">
                  <div className="tilda-preview-label">Предпросмотр</div>
                  <div className="tilda-hero-preview" style={{ background: settings.background_color || '#f4f0e8' }}>
                    {settings.hero_badge && (
                      <span className="tilda-preview-badge">{settings.hero_badge}</span>
                    )}
                    <h3 className="tilda-preview-title">{settings.hero_title || 'Заголовок'}</h3>
                    <p className="tilda-preview-text">{settings.hero_text || 'Описание'}</p>
                    <div className="tilda-preview-btns">
                      <span className="tilda-preview-btn-dark">{settings.hero_button_primary || 'Кнопка 1'}</span>
                      <span className="tilda-preview-btn-light">{settings.hero_button_secondary || 'Кнопка 2'}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="tilda-save-block-btn"
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? 'Сохраняем...' : '✓ Сохранить изменения'}
              </button>
            </div>
          )}

          {/* Редактор слайдов */}
          {activeBlock === 'slides' && (
            <div className="tilda-editor">
              <div className="tilda-editor-header">
                <span>🎞</span>
                <h2>Слайды главного экрана</h2>
                <span className="tilda-slides-count">{slides.length} / 10</span>
              </div>

              {/* Форма добавления */}
              <form className="tilda-slide-form" onSubmit={addSlide}>
                <div className="tilda-field">
                  <label className="tilda-field-label">Заголовок слайда (необязательно)</label>
                  <input
                    className="tilda-input"
                    value={slideForm.title}
                    onChange={e => setSlideForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Новая коллекция"
                  />
                </div>

                <div className="tilda-field">
                  <label className="tilda-field-label">Фото или видео</label>
                  <div className="tilda-upload-field">
                    {slideForm.image_url && (
                      slideForm.media_type === 'video'
                        ? <video src={slideForm.image_url} muted className="tilda-upload-preview" />
                        : <img src={slideForm.image_url} alt="" className="tilda-upload-preview" />
                    )}
                    <div className="tilda-upload-row">
                      <input
                        className="tilda-input tilda-input-flex"
                        value={slideForm.image_url}
                        onChange={e => setSlideForm(p => ({ ...p, image_url: e.target.value }))}
                        placeholder="Ссылка на файл"
                      />
                      <label className={`tilda-upload-btn${uploadingSlide ? ' loading' : ''}`}>
                        {uploadingSlide ? '...' : '↑ Загрузить'}
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleSlideUpload}
                          disabled={uploadingSlide}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="tilda-save-block-btn"
                  disabled={!slideForm.image_url || uploadingSlide}
                >
                  + Добавить слайд
                </button>
              </form>

              {/* Список слайдов */}
              {slides.length > 0 && (
                <div className="tilda-slides-list">
                  {slides.map((slide, i) => (
                    <div key={slide.id} className="tilda-slide-item">
                      <div className="tilda-slide-thumb">
                        {slide.media_type === 'video'
                          ? <video src={slide.image_url} muted />
                          : <img src={slide.image_url} alt={slide.title || `Слайд ${i + 1}`} />
                        }
                      </div>
                      <div className="tilda-slide-info">
                        <strong>{slide.title || `Слайд ${i + 1}`}</strong>
                        <span>Порядок: {slide.sort_order}</span>
                      </div>
                      <button
                        type="button"
                        className="tilda-slide-delete"
                        onClick={() => deleteSlide(slide.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Начальный экран когда ничего не выбрано */}
          {!activeBlock && (
            <div className="tilda-empty">
              <div className="tilda-empty-icon">✦</div>
              <h2>Выберите раздел слева</h2>
              <p>Нажмите на любой раздел чтобы редактировать содержимое сайта</p>
              <div className="tilda-empty-hints">
                {BLOCK_TYPES.slice(0, 3).map(b => (
                  <button
                    key={b.type}
                    type="button"
                    className="tilda-empty-hint-btn"
                    onClick={() => setActiveBlock(b.type)}
                  >
                    {b.icon} {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}