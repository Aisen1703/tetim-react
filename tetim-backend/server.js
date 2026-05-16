require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'tetim_secret_key_change_later';
const ONE_C_API_KEY = process.env.ONE_C_API_KEY || 'tetim_1c_secret_key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5175';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

const dbPath = path.join(__dirname, 'data.db');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      FRONTEND_URL,
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext || '';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 250 * 1024 * 1024,
  },
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function getFileUrl(file) {
  return `${SERVER_URL}/uploads/${file.filename}`;
}

function getMediaType(file) {
  if (String(file.mimetype || '').startsWith('video/')) {
    return 'video';
  }

  return 'image';
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    created_at: user.created_at,
  };
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : '';

    if (!token) {
      return res.status(401).json({ message: 'Нет токена' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get(`SELECT * FROM users WHERE id = ?`, [payload.id]);

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Неверный токен' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Нет прав администратора' });
  }

  return next();
}

function oneCApiMiddleware(req, res, next) {
  const key = req.headers['x-1c-api-key'];

  if (key !== ONE_C_API_KEY) {
    return res.status(401).json({ message: 'Неверный ключ 1С API' });
  }

  return next();
}

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function maskTarget(value, method) {
  const text = String(value || '');

  if (method === 'email') {
    const [name, domain] = text.split('@');

    if (!domain) {
      return text;
    }

    return `${name.slice(0, 2)}***@${domain}`;
  }

  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function normalizeImportKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[\s\-]+/g, '_');
}

function getImportValue(row, keys) {
  const normalizedRow = {};

  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeImportKey(key)] = value;
  }

  for (const key of keys) {
    const normalizedKey = normalizeImportKey(key);

    if (
      normalizedRow[normalizedKey] !== undefined &&
      normalizedRow[normalizedKey] !== null &&
      normalizedRow[normalizedKey] !== ''
    ) {
      return normalizedRow[normalizedKey];
    }
  }

  return '';
}

function parseImportNumber(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const cleaned = String(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

function parseImportBoolean(value) {
  const text = String(value || '').trim().toLowerCase();

  return ['1', 'true', 'yes', 'да', 'опубликован', 'published'].includes(text);
}

function normalizeImportedProduct(row) {
  const externalId = getImportValue(row, [
    'external_id',
    'id',
    'guid',
    'код',
    'код_1с',
    'id_1с',
    'ид',
    'внешний_id',
  ]);

  const article = getImportValue(row, [
    'article',
    'артикул',
    'sku',
    'код_товара',
    'код',
    'штрихкод',
    'barcode',
  ]);

  const name = getImportValue(row, [
    'name',
    'название',
    'наименование',
    'товар',
    'product',
    'номенклатура',
    'наименование_номенклатуры',
    'товар_услуга',
    'товар/услуга',
    'позиция',
    'наименование_товара',
  ]);

  const category = getImportValue(row, [
    'category',
    'категория',
    'раздел',
    'тип',
  ]);

  const price = parseImportNumber(
    getImportValue(row, [
      'price',
      'цена',
      'стоимость',
      'розничная_цена',
      'цена_продажи',
      'сумма',
    ])
  );

  const stock = parseImportNumber(
    getImportValue(row, [
      'stock',
      'остаток',
      'количество',
      'qty',
      'остатки',
      'доступно',
      'на_складе',
      'свободно',
    ])
  );

  const sizes = getImportValue(row, [
    'sizes',
    'размеры',
    'размер',
    'size',
    'характеристика',
  ]);

  const imageUrl = getImportValue(row, [
    'image_url',
    'image',
    'фото',
    'картинка',
    'изображение',
    'ссылка_на_фото',
  ]);

  const description = getImportValue(row, [
    'description',
    'описание',
    'комментарий',
  ]);

  const isPublished = parseImportBoolean(
    getImportValue(row, [
      'is_published',
      'published',
      'опубликован',
      'публикация',
    ])
  );

  return {
    external_id: String(externalId || '').trim(),
    article: String(article || '').trim(),
    name: String(name || '').trim(),
    category: String(category || 'accessories').trim(),
    price,
    stock,
    sizes: String(sizes || '').trim(),
    image_url: String(imageUrl || '').trim(),
    description: String(description || '').trim(),
    is_published: isPublished ? 1 : 0,
    moderation_status: isPublished ? 'approved' : 'draft',
  };
}

async function seedSiteSettings() {
  const defaults = {
    site_title: 'TETIM',
    logo_url: '/assets/logo-full.png',
    logo_white_url: '/assets/logo-full-white.png',

    site_theme: 'auto',
    holiday_theme_enabled: '1',

    header_ornament_url: '',
    background_pattern_url: '',
    decor_image_url: '',
    snow_enabled: '0',

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

    hero_badge: 'Новая коллекция',
    hero_title: 'Одежда с характером Севера',
    hero_text:
      'Создаём одежду для города, спорта и активной жизни — с вниманием к деталям, комфорту и северному характеру.',
    hero_button_primary: 'Каталог',
    hero_button_secondary: 'Индивидуальный заказ',

    footer_text: '© 2026 TETIM. Все права защищены.',
    phone: '+7 999 060 00 75',
    email: 'info@tetim.ru',
    address: 'Якутск',

    telegram_url: '',
    whatsapp_url: '',
    instagram_url: '',
    social_extra_url: '',

    accent_color: '#111111',
    background_color: '#f4f0e8',
  };

  for (const [key, value] of Object.entries(defaults)) {
    const existing = await get(`SELECT key FROM site_settings WHERE key = ?`, [key]);

    if (!existing) {
      await run(
        `
        INSERT INTO site_settings (key, value)
        VALUES (?, ?)
        `,
        [key, value]
      );
    }
  }
}

async function seedAdminUser() {
  const existing = await get(`SELECT * FROM users WHERE role = 'admin' LIMIT 1`);

  if (existing) {
    return;
  }

  const hash = await bcrypt.hash('admin123', 10);

  await run(
    `
    INSERT INTO users (name, email, phone, password, role)
    VALUES (?, ?, ?, ?, ?)
    `,
    ['Админ', 'admin@tetim.ru', '+79990600075', hash, 'admin']
  );
}

async function seedProducts() {
  const count = await get(`SELECT COUNT(*) AS total FROM products`);

  if (count.total > 0) {
    return;
  }

  const products = [
    {
      external_id: 'LOCAL-001',
      article: '',
      name: 'Рубашка Вельвет (Молочный)',
      category: 'shirts',
      price: 2990,
      sizes: 'S, L, M',
      stock: 5,
      image_url: '/assets/afisha1.jpg',
      description: 'Молочная вельветовая рубашка TETIM.',
      is_published: 1,
      moderation_status: 'approved',
    },
    {
      external_id: 'LOCAL-003',
      article: 'JK-001',
      name: 'Куртка Outdoor',
      category: 'jackets',
      price: 5990,
      sizes: 'M, L, XL',
      stock: 5,
      image_url: '',
      description: 'Куртка для города и outdoor.',
      is_published: 1,
      moderation_status: 'approved',
    },
    {
      external_id: 'LOCAL-004',
      article: 'TS-001',
      name: 'Футболка TETIM',
      category: 'tshirts-longsleeves',
      price: 1990,
      sizes: 'S, M, L',
      stock: 20,
      image_url: '',
      description: 'Базовая футболка TETIM.',
      is_published: 1,
      moderation_status: 'approved',
    },
    {
      external_id: 'LOCAL-005',
      article: 'HD-001',
      name: 'Худи TETIM',
      category: 'sweatshirts',
      price: 3493,
      sizes: 'S, M, L, XL',
      stock: 10,
      image_url: '',
      description: 'Тёплое худи TETIM.',
      is_published: 1,
      moderation_status: 'approved',
    },
  ];

  for (const product of products) {
    await run(
      `
      INSERT INTO products (
        external_id,
        article,
        name,
        category,
        price,
        sizes,
        stock,
        image_url,
        description,
        is_published,
        moderation_status,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        product.external_id,
        product.article,
        product.name,
        product.category,
        product.price,
        product.sizes,
        product.stock,
        product.image_url,
        product.description,
        product.is_published,
        product.moderation_status,
      ]
    );
  }
}

async function seedSlides() {
  const count = await get(`SELECT COUNT(*) AS total FROM slides`);

  if (count.total > 0) {
    return;
  }

  const slides = [
    {
      title: 'TETIM',
      subtitle: 'Новая коллекция',
      image_url: '/assets/afisha1.jpg',
      media_type: 'image',
      background_color: '#d8c900',
      sort_order: 1,
      is_active: 1,
    },
    {
      title: 'TETIM',
      subtitle: 'Outdoor',
      image_url: '/assets/afisha2.jpg',
      media_type: 'image',
      background_color: '#4aa7d8',
      sort_order: 2,
      is_active: 1,
    },
  ];

  for (const slide of slides) {
    await run(
      `
      INSERT INTO slides (
        title,
        subtitle,
        image_url,
        media_type,
        background_color,
        sort_order,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        slide.title,
        slide.subtitle,
        slide.image_url,
        slide.media_type,
        slide.background_color,
        slide.sort_order,
        slide.is_active,
      ]
    );
  }
}

async function seedPageBlocks() {
  const count = await get(`SELECT COUNT(*) AS total FROM page_blocks WHERE page = 'home'`);

  if (count.total > 0) {
    return;
  }

  const blocks = [
    {
      page: 'home',
      type: 'slider',
      title: 'Слайдер главного экрана',
      subtitle: 'Слайды берутся из админ-панели',
      image_url: '',
      background_color: '#fffaf2',
      text_color: '#111111',
      sort_order: 1,
      is_active: 1,
      content_json: JSON.stringify({
        source: 'admin_slides',
        autoplay: true,
        interval: 4000,
        showDots: true,
      }),
    },
    {
      page: 'home',
      type: 'categories',
      title: 'Популярные категории',
      subtitle: '',
      image_url: '',
      background_color: '#fffaf2',
      text_color: '#111111',
      sort_order: 2,
      is_active: 1,
      content_json: JSON.stringify({}),
    },
    {
      page: 'home',
      type: 'products',
      title: 'Хиты продаж',
      subtitle: '',
      image_url: '',
      background_color: '#fffaf2',
      text_color: '#111111',
      sort_order: 3,
      is_active: 1,
      content_json: JSON.stringify({ limit: 8 }),
    },
  ];

  for (const block of blocks) {
    await run(
      `
      INSERT INTO page_blocks (
        page,
        type,
        title,
        subtitle,
        image_url,
        background_color,
        text_color,
        sort_order,
        is_active,
        content_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        block.page,
        block.type,
        block.title,
        block.subtitle,
        block.image_url,
        block.background_color,
        block.text_color,
        block.sort_order,
        block.is_active,
        block.content_json,
      ]
    );
  }
}

async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'client',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      article TEXT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'accessories',
      price REAL DEFAULT 0,
      sizes TEXT,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      description TEXT,
      is_published INTEGER DEFAULT 0,
      moderation_status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      subtitle TEXT,
      image_url TEXT NOT NULL,
      media_type TEXT DEFAULT 'image',
      background_color TEXT DEFAULT '#111111',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      customer_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      comment TEXT,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT,
      price REAL DEFAULT 0,
      quantity INTEGER DEFAULT 1,
      size TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS page_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT DEFAULT 'home',
      type TEXT NOT NULL,
      title TEXT,
      subtitle TEXT,
      image_url TEXT,
      background_color TEXT DEFAULT '#ffffff',
      text_color TEXT DEFAULT '#111111',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      content_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      target TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await seedSiteSettings();
  await seedAdminUser();
  await seedProducts();
  await seedSlides();
  await seedPageBlocks();
}

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Backend TETIM работает',
    server_url: SERVER_URL,
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Заполните имя, email и пароль' });
    }

    const existing = await get(`SELECT * FROM users WHERE email = ?`, [email]);

    if (existing) {
      return res.status(409).json({ message: 'Пользователь уже существует' });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await run(
      `
      INSERT INTO users (name, email, phone, password, role)
      VALUES (?, ?, ?, ?, 'client')
      `,
      [name, email, phone || '', hash]
    );

    const user = await get(`SELECT * FROM users WHERE id = ?`, [result.id]);
    const token = signToken(user);

    return res.json({ token, user: normalizeUser(user) });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return res.status(500).json({ message: 'Ошибка регистрации' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Укажите email и пароль' });
    }

    const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);

    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = signToken(user);

    return res.json({ token, user: normalizeUser(user) });
  } catch (error) {
    console.error('Ошибка входа:', error);
    return res.status(500).json({ message: 'Ошибка входа' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { login, method } = req.body;

    if (!login || !method) {
      return res.status(400).json({
        message: 'Укажите email/телефон и способ восстановления',
      });
    }

    if (!['email', 'sms'].includes(method)) {
      return res.status(400).json({ message: 'Неверный способ восстановления' });
    }

    const user = await get(
      `
      SELECT *
      FROM users
      WHERE email = ? OR phone = ?
      `,
      [login, login]
    );

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const target = method === 'email' ? user.email : user.phone;

    if (!target) {
      return res.status(400).json({
        message:
          method === 'email'
            ? 'У пользователя не указан email'
            : 'У пользователя не указан телефон',
      });
    }

    const code = generateResetCode();
    const expiresAt = addMinutes(new Date(), 10);

    await run(
      `
      UPDATE password_reset_codes
      SET is_used = 1
      WHERE user_id = ? AND is_used = 0
      `,
      [user.id]
    );

    await run(
      `
      INSERT INTO password_reset_codes (
        user_id,
        method,
        target,
        code,
        expires_at,
        is_used
      )
      VALUES (?, ?, ?, ?, ?, 0)
      `,
      [user.id, method, target, code, expiresAt]
    );

    return res.json({
      message: method === 'email' ? 'Код отправлен на email' : 'Код отправлен по SMS',
      target: maskTarget(target, method),
      dev_code: code,
    });
  } catch (error) {
    console.error('Ошибка восстановления пароля:', error);
    return res.status(500).json({ message: 'Ошибка восстановления пароля' });
  }
});

app.post('/api/auth/verify-reset-code', async (req, res) => {
  try {
    const { login, code } = req.body;

    if (!login || !code) {
      return res.status(400).json({ message: 'Укажите логин и код' });
    }

    const user = await get(
      `
      SELECT *
      FROM users
      WHERE email = ? OR phone = ?
      `,
      [login, login]
    );

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const resetCode = await get(
      `
      SELECT *
      FROM password_reset_codes
      WHERE user_id = ?
        AND code = ?
        AND is_used = 0
      ORDER BY id DESC
      LIMIT 1
      `,
      [user.id, code]
    );

    if (!resetCode) {
      return res.status(400).json({ message: 'Неверный код' });
    }

    if (new Date(resetCode.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Код истёк. Запросите новый код' });
    }

    return res.json({ message: 'Код подтверждён' });
  } catch (error) {
    console.error('Ошибка проверки кода:', error);
    return res.status(500).json({ message: 'Ошибка проверки кода' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { login, code, newPassword } = req.body;

    if (!login || !code || !newPassword) {
      return res.status(400).json({ message: 'Заполните все поля' });
    }

    if (String(newPassword).length < 4) {
      return res.status(400).json({ message: 'Пароль должен быть не короче 4 символов' });
    }

    const user = await get(
      `
      SELECT *
      FROM users
      WHERE email = ? OR phone = ?
      `,
      [login, login]
    );

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const resetCode = await get(
      `
      SELECT *
      FROM password_reset_codes
      WHERE user_id = ?
        AND code = ?
        AND is_used = 0
      ORDER BY id DESC
      LIMIT 1
      `,
      [user.id, code]
    );

    if (!resetCode) {
      return res.status(400).json({ message: 'Неверный код' });
    }

    if (new Date(resetCode.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Код истёк. Запросите новый код' });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await run(`UPDATE users SET password = ? WHERE id = ?`, [hash, user.id]);
    await run(`UPDATE password_reset_codes SET is_used = 1 WHERE id = ?`, [resetCode.id]);

    return res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Ошибка сброса пароля:', error);
    return res.status(500).json({ message: 'Ошибка сброса пароля' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: normalizeUser(req.user) });
});

app.get('/api/public/settings', async (req, res) => {
  try {
    const rows = await all(`SELECT key, value FROM site_settings`);
    const settings = {};

    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({ settings });
  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    res.status(500).json({ message: 'Ошибка получения настроек' });
  }
});

app.get('/api/public/products', async (req, res) => {
  try {
    const products = await all(
      `
      SELECT *
      FROM products
      WHERE is_published = 1
      ORDER BY id DESC
      `
    );

    res.json({ products });
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ message: 'Ошибка получения товаров' });
  }
});

app.get('/api/public/products/:id', async (req, res) => {
  try {
    const product = await get(
      `
      SELECT *
      FROM products
      WHERE id = ? AND is_published = 1
      `,
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    return res.json({ product });
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    return res.status(500).json({ message: 'Ошибка получения товара' });
  }
});

app.get('/api/public/slides', async (req, res) => {
  try {
    const slides = await all(
      `
      SELECT *
      FROM slides
      WHERE is_active = 1
      ORDER BY sort_order ASC, id DESC
      `
    );

    res.json({ slides });
  } catch (error) {
    console.error('Ошибка получения слайдов:', error);
    res.status(500).json({ message: 'Ошибка получения слайдов' });
  }
});

app.get('/api/public/page-blocks/:page', async (req, res) => {
  try {
    const blocks = await all(
      `
      SELECT *
      FROM page_blocks
      WHERE page = ? AND is_active = 1
      ORDER BY sort_order ASC, id ASC
      `,
      [req.params.page]
    );

    res.json({ blocks });
  } catch (error) {
    console.error('Ошибка получения блоков:', error);
    res.status(500).json({ message: 'Ошибка получения блоков' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const {
      user_id,
      customer_name,
      phone,
      email,
      address,
      comment,
      items = [],
    } = req.body;

    if (!customer_name || !phone || !items.length) {
      return res.status(400).json({ message: 'Заполните имя, телефон и товары' });
    }

    let total = 0;

    for (const item of items) {
      total += Number(item.price || 0) * Number(item.quantity || 1);
    }

    const result = await run(
      `
      INSERT INTO orders (
        user_id,
        customer_name,
        phone,
        email,
        address,
        comment,
        total_amount,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
      `,
      [user_id || null, customer_name, phone, email || '', address || '', comment || '', total]
    );

    for (const item of items) {
      await run(
        `
        INSERT INTO order_items (
          order_id,
          product_id,
          product_name,
          price,
          quantity,
          size
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          result.id,
          item.product_id || item.id || null,
          item.name || item.product_name || '',
          Number(item.price || 0),
          Number(item.quantity || 1),
          item.size || '',
        ]
      );
    }

    return res.json({ message: 'Заказ создан', order_id: result.id });
  } catch (error) {
    console.error('Ошибка создания заказа:', error);
    return res.status(500).json({ message: 'Ошибка создания заказа' });
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await all(
      `
      SELECT id, name, email, phone, role, created_at
      FROM users
      ORDER BY id DESC
      `
    );

    res.json({ users });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ message: 'Ошибка получения пользователей' });
  }
});

app.get('/api/admin/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const products = await all(`SELECT * FROM products ORDER BY id DESC`);
    res.json({ products });
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ message: 'Ошибка получения товаров' });
  }
});

app.post('/api/admin/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      external_id = '',
      article = '',
      name,
      category = 'accessories',
      price = 0,
      sizes = '',
      stock = 0,
      image_url = '',
      description = '',
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Укажите название товара' });
    }

    const result = await run(
      `
      INSERT INTO products (
        external_id,
        article,
        name,
        category,
        price,
        sizes,
        stock,
        image_url,
        description,
        is_published,
        moderation_status,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved', CURRENT_TIMESTAMP)
      `,
      [external_id, article, name, category, Number(price || 0), sizes, Number(stock || 0), image_url, description]
    );

    const product = await get(`SELECT * FROM products WHERE id = ?`, [result.id]);

    return res.json({ message: 'Товар добавлен', product });
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    return res.status(500).json({ message: 'Ошибка создания товара' });
  }
});

app.post(
  '/api/admin/products/import',
  authMiddleware,
  adminMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Файл не загружен' });
      }

      const workbook = XLSX.readFile(req.file.path, {
        cellDates: false,
        raw: false,
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        return res.status(400).json({ message: 'В файле нет листов' });
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      });

      if (!rows.length) {
        return res.status(400).json({ message: 'Файл пустой или таблица не найдена' });
      }

      const productsToImport = [];
      const headerRowIndex = rows.findIndex((row) =>
        row.some((cell) =>
          String(cell || '').trim().toLowerCase().includes('номенклатура')
        )
      );

      if (headerRowIndex !== -1) {
        for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
          const row = rows[i];
          const name = String(row[0] || '').trim();
          const characteristic = String(row[1] || '').trim();
          const stock = parseImportNumber(row[4]) || parseImportNumber(row[2]) || 0;

          if (!name) {
            continue;
          }

          const lowName = name.toLowerCase();

          if (
            lowName.includes('итого') ||
            lowName.includes('организация') ||
            lowName.includes('ип сивцев')
          ) {
            continue;
          }

          productsToImport.push({
            external_id: '',
            article: '',
            name,
            category: 'accessories',
            price: 0,
            stock,
            sizes: characteristic,
            image_url: '',
            description: '',
            is_published: 1,
            moderation_status: 'approved',
          });
        }
      } else {
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        for (const row of jsonRows) {
          const product = normalizeImportedProduct(row);

          if (!product.name) {
            continue;
          }

          productsToImport.push(product);
        }
      }

      if (!productsToImport.length) {
        return res.status(400).json({
          message: 'Не удалось найти товары. Проверьте, есть ли колонка Номенклатура или Название.',
        });
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors = [];

      for (let index = 0; index < productsToImport.length; index += 1) {
        const product = productsToImport[index];

        if (!product.name) {
          skipped += 1;
          errors.push(`Строка ${index + 1}: нет названия товара`);
          continue;
        }

        let existing = null;

        if (product.external_id) {
          existing = await get(`SELECT * FROM products WHERE external_id = ?`, [product.external_id]);
        }

        if (!existing && product.article) {
          existing = await get(`SELECT * FROM products WHERE article = ?`, [product.article]);
        }

        if (!existing) {
          existing = await get(`SELECT * FROM products WHERE name = ?`, [product.name]);
        }

        if (existing) {
          await run(
            `
            UPDATE products
            SET
              external_id = ?,
              article = ?,
              name = ?,
              category = ?,
              price = ?,
              sizes = ?,
              stock = ?,
              image_url = ?,
              description = ?,
              is_published = ?,
              moderation_status = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [
              product.external_id || existing.external_id || '',
              product.article || existing.article || '',
              product.name,
              product.category || existing.category || 'accessories',
              Number(product.price || existing.price || 0),
              product.sizes || existing.sizes || '',
              Number(product.stock || 0),
              product.image_url || existing.image_url || '',
              product.description || existing.description || '',
              Number(product.is_published || existing.is_published || 0),
              product.moderation_status || existing.moderation_status || 'draft',
              existing.id,
            ]
          );

          updated += 1;
        } else {
          await run(
            `
            INSERT INTO products (
              external_id,
              article,
              name,
              category,
              price,
              sizes,
              stock,
              image_url,
              description,
              is_published,
              moderation_status,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `,
            [
              product.external_id || '',
              product.article || '',
              product.name,
              product.category || 'accessories',
              Number(product.price || 0),
              product.sizes || '',
              Number(product.stock || 0),
              product.image_url || '',
              product.description || '',
              Number(product.is_published || 0),
              product.moderation_status || 'approved',
            ]
          );

          created += 1;
        }
      }

      return res.json({
        message: 'Импорт товаров завершён',
        total: productsToImport.length,
        created,
        updated,
        skipped,
        errors: errors.slice(0, 20),
      });
    } catch (error) {
      console.error('Ошибка импорта товаров:', error);
      return res.status(500).json({ message: 'Ошибка импорта товаров из Excel' });
    }
  }
);

app.patch('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      external_id = '',
      article = '',
      name,
      category = 'accessories',
      price = 0,
      sizes = '',
      stock = 0,
      image_url = '',
      description = '',
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Укажите название товара' });
    }

    await run(
      `
      UPDATE products
      SET
        external_id = ?,
        article = ?,
        name = ?,
        category = ?,
        price = ?,
        sizes = ?,
        stock = ?,
        image_url = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [external_id, article, name, category, Number(price || 0), sizes, Number(stock || 0), image_url, description, req.params.id]
    );

    const product = await get(`SELECT * FROM products WHERE id = ?`, [req.params.id]);

    return res.json({ message: 'Товар сохранён', product });
  } catch (error) {
    console.error('Ошибка сохранения товара:', error);
    return res.status(500).json({ message: 'Ошибка сохранения товара' });
  }
});

app.patch('/api/admin/products/:id/publish', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await run(
      `
      UPDATE products
      SET is_published = 1,
          moderation_status = 'approved',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [req.params.id]
    );

    return res.json({ message: 'Товар опубликован' });
  } catch (error) {
    console.error('Ошибка публикации товара:', error);
    return res.status(500).json({ message: 'Ошибка публикации товара' });
  }
});

app.patch('/api/admin/products/:id/unpublish', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await run(
      `
      UPDATE products
      SET is_published = 0,
          moderation_status = 'draft',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [req.params.id]
    );

    return res.json({ message: 'Товар снят с публикации' });
  } catch (error) {
    console.error('Ошибка снятия товара:', error);
    return res.status(500).json({ message: 'Ошибка снятия товара' });
  }
});

app.delete('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await run(`DELETE FROM products WHERE id = ?`, [req.params.id]);
    return res.json({ message: 'Товар удалён' });
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    return res.status(500).json({ message: 'Ошибка удаления товара' });
  }
});

app.post('/api/admin/upload', authMiddleware, adminMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Файл не загружен' });
  }

  return res.json({
    message: 'Файл загружен',
    url: getFileUrl(req.file),
    media_type: getMediaType(req.file),
  });
});

app.get('/api/admin/slides', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const slides = await all(`SELECT * FROM slides ORDER BY sort_order ASC, id DESC`);
    res.json({ slides });
  } catch (error) {
    console.error('Ошибка получения слайдов:', error);
    res.status(500).json({ message: 'Ошибка получения слайдов' });
  }
});

app.post('/api/admin/slides', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      title = '',
      subtitle = '',
      image_url,
      media_type = 'image',
      background_color = '#111111',
      sort_order = 0,
      is_active = true,
    } = req.body;

    if (!image_url) {
      return res.status(400).json({ message: 'Загрузите файл или укажите ссылку' });
    }

    const count = await get(`SELECT COUNT(*) AS total FROM slides`);

    if (count.total >= 10) {
      return res.status(400).json({ message: 'Нельзя добавить больше 10 слайдов' });
    }

    const result = await run(
      `
      INSERT INTO slides (
        title,
        subtitle,
        image_url,
        media_type,
        background_color,
        sort_order,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [title, subtitle, image_url, media_type, background_color, Number(sort_order || 0), is_active ? 1 : 0]
    );

    const slide = await get(`SELECT * FROM slides WHERE id = ?`, [result.id]);

    return res.json({ message: 'Слайд добавлен', slide });
  } catch (error) {
    console.error('Ошибка создания слайда:', error);
    return res.status(500).json({ message: 'Ошибка создания слайда' });
  }
});

app.delete('/api/admin/slides/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await run(`DELETE FROM slides WHERE id = ?`, [req.params.id]);
    return res.json({ message: 'Слайд удалён' });
  } catch (error) {
    console.error('Ошибка удаления слайда:', error);
    return res.status(500).json({ message: 'Ошибка удаления слайда' });
  }
});

app.get('/api/admin/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await all(`SELECT * FROM orders ORDER BY id DESC`);
    res.json({ orders });
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    res.status(500).json({ message: 'Ошибка получения заказов' });
  }
});

app.patch('/api/admin/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    await run(`UPDATE orders SET status = ? WHERE id = ?`, [status, req.params.id]);

    return res.json({ message: 'Статус заказа изменён' });
  } catch (error) {
    console.error('Ошибка изменения статуса заказа:', error);
    return res.status(500).json({ message: 'Ошибка изменения статуса заказа' });
  }
});

app.get('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await all(`SELECT key, value FROM site_settings`);
    const settings = {};

    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({ settings });
  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    res.status(500).json({ message: 'Ошибка получения настроек' });
  }
});

app.patch('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { settings = {} } = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await run(
        `
        INSERT INTO site_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `,
        [key, String(value ?? '')]
      );
    }

    return res.json({ message: 'Настройки сохранены' });
  } catch (error) {
    console.error('Ошибка сохранения настроек:', error);
    return res.status(500).json({ message: 'Ошибка сохранения настроек' });
  }
});

app.get('/api/admin/page-blocks', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = req.query.page || 'home';
    const blocks = await all(
      `
      SELECT *
      FROM page_blocks
      WHERE page = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [page]
    );

    res.json({ blocks });
  } catch (error) {
    console.error('Ошибка получения блоков:', error);
    res.status(500).json({ message: 'Ошибка получения блоков' });
  }
});

app.post('/api/admin/page-blocks', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      page = 'home',
      type,
      title = '',
      subtitle = '',
      image_url = '',
      background_color = '#ffffff',
      text_color = '#111111',
      sort_order = 0,
      is_active = true,
      content_json = '{}',
    } = req.body;

    if (!type) {
      return res.status(400).json({ message: 'Укажите тип блока' });
    }

    const result = await run(
      `
      INSERT INTO page_blocks (
        page,
        type,
        title,
        subtitle,
        image_url,
        background_color,
        text_color,
        sort_order,
        is_active,
        content_json,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        page,
        type,
        title,
        subtitle,
        image_url,
        background_color,
        text_color,
        Number(sort_order || 0),
        is_active ? 1 : 0,
        content_json,
      ]
    );

    const block = await get(`SELECT * FROM page_blocks WHERE id = ?`, [result.id]);

    return res.json({ message: 'Блок добавлен', block });
  } catch (error) {
    console.error('Ошибка создания блока:', error);
    return res.status(500).json({ message: 'Ошибка создания блока' });
  }
});

app.patch('/api/admin/page-blocks/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      page = 'home',
      type,
      title = '',
      subtitle = '',
      image_url = '',
      background_color = '#ffffff',
      text_color = '#111111',
      sort_order = 0,
      is_active = true,
      content_json = '{}',
    } = req.body;

    if (!type) {
      return res.status(400).json({ message: 'Укажите тип блока' });
    }

    await run(
      `
      UPDATE page_blocks
      SET
        page = ?,
        type = ?,
        title = ?,
        subtitle = ?,
        image_url = ?,
        background_color = ?,
        text_color = ?,
        sort_order = ?,
        is_active = ?,
        content_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        page,
        type,
        title,
        subtitle,
        image_url,
        background_color,
        text_color,
        Number(sort_order || 0),
        is_active ? 1 : 0,
        content_json,
        req.params.id,
      ]
    );

    const block = await get(`SELECT * FROM page_blocks WHERE id = ?`, [req.params.id]);

    return res.json({ message: 'Блок сохранён', block });
  } catch (error) {
    console.error('Ошибка сохранения блока:', error);
    return res.status(500).json({ message: 'Ошибка сохранения блока' });
  }
});

app.delete('/api/admin/page-blocks/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await run(`DELETE FROM page_blocks WHERE id = ?`, [req.params.id]);
    return res.json({ message: 'Блок удалён' });
  } catch (error) {
    console.error('Ошибка удаления блока:', error);
    return res.status(500).json({ message: 'Ошибка удаления блока' });
  }
});

app.get('/api/1c/ping', oneCApiMiddleware, (req, res) => {
  res.json({ message: 'Связь с TETIM API есть' });
});

app.post('/api/1c/products/sync', oneCApiMiddleware, async (req, res) => {
  try {
    const products = Array.isArray(req.body.products) ? req.body.products : [];

    if (!products.length) {
      return res.status(400).json({ message: 'Нет товаров для синхронизации' });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of products) {
      const product = {
        external_id: String(item.external_id || '').trim(),
        article: String(item.article || '').trim(),
        name: String(item.name || '').trim(),
        category: String(item.category || 'accessories').trim(),
        price: Number(item.price || 0),
        sizes: String(item.sizes || '').trim(),
        stock: Number(item.stock || 0),
        image_url: String(item.image_url || '').trim(),
        description: String(item.description || '').trim(),
      };

      if (!product.name) {
        skipped += 1;
        continue;
      }

      let existing = null;

      if (product.external_id) {
        existing = await get(`SELECT * FROM products WHERE external_id = ?`, [product.external_id]);
      }

      if (!existing && product.article) {
        existing = await get(`SELECT * FROM products WHERE article = ?`, [product.article]);
      }

      if (existing) {
        await run(
          `
          UPDATE products
          SET
            external_id = ?,
            article = ?,
            name = ?,
            category = ?,
            price = ?,
            sizes = ?,
            stock = ?,
            image_url = ?,
            description = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            product.external_id || existing.external_id || '',
            product.article || existing.article || '',
            product.name,
            product.category || existing.category || 'accessories',
            product.price,
            product.sizes,
            product.stock,
            product.image_url || existing.image_url || '',
            product.description || existing.description || '',
            existing.id,
          ]
        );

        updated += 1;
      } else {
        await run(
          `
          INSERT INTO products (
            external_id,
            article,
            name,
            category,
            price,
            sizes,
            stock,
            image_url,
            description,
            is_published,
            moderation_status,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'draft', CURRENT_TIMESTAMP)
          `,
          [
            product.external_id,
            product.article,
            product.name,
            product.category,
            product.price,
            product.sizes,
            product.stock,
            product.image_url,
            product.description,
          ]
        );

        created += 1;
      }
    }

    return res.json({
      message: 'Синхронизация товаров завершена',
      total: products.length,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    console.error('Ошибка синхронизации 1С:', error);
    return res.status(500).json({ message: 'Ошибка синхронизации 1С' });
  }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend TETIM запущен: http://localhost:${PORT}`);
      console.log(`SERVER_URL: ${SERVER_URL}`);
      console.log(`FRONTEND_URL: ${FRONTEND_URL}`);
    });
  })
  .catch((error) => {
    console.error('Ошибка запуска backend:', error);
    process.exit(1);
  });
