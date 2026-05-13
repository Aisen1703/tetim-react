const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = 4000;
const JWT_SECRET = 'tetim_secret_key_change_later';
const ONE_C_API_KEY = 'tetim_1c_secret_key';

const FRONTEND_URL = 'http://localhost:5175';
const SERVER_URL = `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        id: this.lastID,
        changes: this.changes,
      });
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

async function addColumnIfNotExists(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
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
      role TEXT DEFAULT 'user',
      birth_date TEXT,
      gender TEXT,
      city TEXT,
      street TEXT,
      house TEXT,
      apartment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      article TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
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
      delivery_type TEXT DEFAULT 'pickup',
      total_amount REAL DEFAULT 0,
      items_json TEXT,
      status TEXT DEFAULT 'new',
      amo_status TEXT DEFAULT 'not_sent',
      one_c_status TEXT DEFAULT 'not_exported',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS custom_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      customer_name TEXT,
      phone TEXT,
      email TEXT,
      selected_items TEXT,
      total_amount REAL DEFAULT 0,
      comment TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    content_json TEXT,
    image_url TEXT,
    background_color TEXT DEFAULT '#ffffff',
    text_color TEXT DEFAULT '#111111',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

  await addColumnIfNotExists('products', 'external_id', 'TEXT');
  await addColumnIfNotExists('products', 'article', 'TEXT');
  await addColumnIfNotExists('products', 'sizes', 'TEXT');
  await addColumnIfNotExists('products', 'stock', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('products', 'image_url', 'TEXT');
  await addColumnIfNotExists('products', 'description', 'TEXT');
  await addColumnIfNotExists('products', 'is_published', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists(
    'products',
    'moderation_status',
    "TEXT DEFAULT 'draft'"
  );
  await addColumnIfNotExists('products', 'updated_at', 'TEXT');

  await addColumnIfNotExists('orders', 'delivery_type', "TEXT DEFAULT 'pickup'");
  await addColumnIfNotExists('orders', 'amo_status', "TEXT DEFAULT 'not_sent'");
  await addColumnIfNotExists(
    'orders',
    'one_c_status',
    "TEXT DEFAULT 'not_exported'"
  );

  await seedAdmin();
  await seedProducts();
  await seedSlides();
  await seedSiteSettings();
  await seedPageBlocks();

}

async function seedAdmin() {
  const admin = await get(`SELECT * FROM users WHERE email = ?`, [
    'admin@tetim.ru',
  ]);

  if (!admin) {
    const hash = await bcrypt.hash('1234', 10);

    await run(
      `
      INSERT INTO users (name, email, phone, password, role)
      VALUES (?, ?, ?, ?, ?)
      `,
      ['Админ', 'admin@tetim.ru', '+79990600075', hash, 'admin']
    );
  }
}

async function seedProducts() {
  const countRow = await get(`SELECT COUNT(*) as count FROM products`);

  if (countRow.count > 0) {
    return;
  }

  const products = [
    {
      external_id: 'LOCAL-001',
      article: 'HD-001',
      name: 'Худи TETIM',
      category: 'sweatshirts',
      price: 3493,
      sizes: 'S, M, L, XL',
      stock: 10,
      image_url: 'https://placehold.co/600x720?text=TETIM+HOODIE',
      description: 'Удобное худи TETIM для города и спорта.',
    },
    {
      external_id: 'LOCAL-002',
      article: 'TS-001',
      name: 'Футболка TETIM',
      category: 'tshirts-longsleeves',
      price: 1990,
      sizes: 'S, M, L, XL',
      stock: 20,
      image_url: 'https://placehold.co/600x720?text=TETIM+TSHIRT',
      description: 'Базовая футболка TETIM.',
    },
    {
      external_id: 'LOCAL-003',
      article: 'JK-001',
      name: 'Куртка Outdoor',
      category: 'jackets',
      price: 5990,
      sizes: 'S, M, L, XL',
      stock: 5,
      image_url: 'https://placehold.co/600x720?text=TETIM+JACKET',
      description: 'Куртка для города и outdoor.',
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
        1,
        'approved',
      ]
    );
  }
}

async function seedSlides() {
  const countRow = await get(`SELECT COUNT(*) as count FROM slides`);

  if (countRow.count > 0) {
    return;
  }

  const slides = [
    {
      title: 'Товар дня',
      subtitle: 'Скидки на коллекцию TETIM',
      image_url:
        'https://placehold.co/800x1000/e5de00/111111?text=TETIM+SLIDE+1',
      media_type: 'image',
      sort_order: 1,
    },
    {
      title: 'Новая коллекция',
      subtitle: 'Одежда для города и спорта',
      image_url:
        'https://placehold.co/800x1000/111111/ffffff?text=TETIM+SLIDE+2',
      media_type: 'image',
      sort_order: 2,
    },
    {
      title: 'Outdoor',
      subtitle: 'Форма, куртки и комплекты',
      image_url:
        'https://placehold.co/800x1000/d29a34/111111?text=TETIM+SLIDE+3',
      media_type: 'image',
      sort_order: 3,
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
        '#111111',
        slide.sort_order,
        1,
      ]
    );
  }
}

async function seedSiteSettings() {
  const defaults = {
    site_title: 'TETIM',
    logo_url: '/assets/logo-full.png',
    logo_white_url: '/assets/logo-full-white.png',

    hero_badge: 'Новая коллекция',
    hero_title: 'Функциональная одежда для города, спорта и outdoor',
    hero_text:
      'Структура сайта как у большого интернет-магазина: удобный каталог, отдельная корзина, подборки и категории.',
    hero_button_primary: 'Каталог',
    hero_button_secondary: 'Индивидуальный заказ',

    footer_text: '© 2026 TETIM. Все права защищены.',
    phone: '+7 999 060 00 75',
    email: 'info@tetim.ru',
    address: 'Якутск',

    telegram_url: '',
    whatsapp_url: '',
    instagram_url: '',

    accent_color: '#111111',
    background_color: '#f4f0e8',
  };

  for (const [key, value] of Object.entries(defaults)) {
    const existing = await get(`SELECT key FROM site_settings WHERE key = ?`, [
      key,
    ]);

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

async function seedPageBlocks() {
  const countRow = await get(
    `SELECT COUNT(*) as count FROM page_blocks WHERE page = ?`,
    ['home']
  );

  if (countRow.count > 0) {
    return;
  }

  const blocks = [
    {
      page: 'home',
      type: 'hero',
      title: 'Одежда с характером Севера',
      subtitle:
        'Создаём одежду для города, спорта и активной жизни — с вниманием к деталям, комфорту и северному характеру.',
      image_url: '',
      background_color: '#ffffff',
      text_color: '#111111',
      sort_order: 1,
      content_json: JSON.stringify({
        badge: 'Новая коллекция',
        buttonText: 'Каталог',
        buttonLink: '/catalog',
        secondButtonText: 'Индивидуальный заказ',
        secondButtonLink: '/custom-order',
      }),
    },
    {
      page: 'home',
      type: 'categories',
      title: 'Популярные категории',
      subtitle: '',
      image_url: '',
      background_color: '#f4f0e8',
      text_color: '#111111',
      sort_order: 2,
      content_json: JSON.stringify({
        items: [
          { title: 'Худи', link: '/catalog?category=sweatshirts' },
          { title: 'Футболки', link: '/catalog?category=tshirts-longsleeves' },
          { title: 'Куртки', link: '/catalog?category=jackets' },
          { title: 'Рубашки', link: '/catalog?category=shirts' },
        ],
      }),
    },
    {
      page: 'home',
      type: 'products',
      title: 'Хиты продаж',
      subtitle: '',
      image_url: '',
      background_color: '#f4f0e8',
      text_color: '#111111',
      sort_order: 3,
      content_json: JSON.stringify({
        limit: 8,
        buttonText: 'Смотреть все',
        buttonLink: '/catalog',
      }),
    },
    {
      page: 'home',
      type: 'text_image',
      title: 'TETIM',
      subtitle: 'О бренде',
      image_url: '/assets/custom-team-banner.jpg',
      background_color: '#ffffff',
      text_color: '#111111',
      sort_order: 4,
      content_json: JSON.stringify({
        text:
          'TETIM — бренд одежды для города, спорта и активной жизни. Мы соединяем комфорт, практичность и северный характер.',
        buttonText: 'В каталог',
        buttonLink: '/catalog',
      }),
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
        content_json,
        image_url,
        background_color,
        text_color,
        sort_order,
        is_active,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        block.page,
        block.type,
        block.title,
        block.subtitle,
        block.content_json,
        block.image_url,
        block.background_color,
        block.text_color,
        block.sort_order,
        1,
      ]
    );
  }
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Нет токена авторизации',
    });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({
      message: 'Неверный токен',
    });
  }
}

function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
  }

  return next();
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Доступ только для администратора',
    });
  }

  return next();
}

function oneCMiddleware(req, res, next) {
  const apiKey = req.headers['x-1c-api-key'];

  if (apiKey !== ONE_C_API_KEY) {
    return res.status(401).json({
      message: 'Неверный ключ 1С',
    });
  }

  return next();
}

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadsDir);
  },

  filename(req, file, callback) {
    const safeOriginalName = Buffer.from(file.originalname, 'latin1')
      .toString('utf8')
      .replace(/[^\wа-яА-ЯёЁ.\-]/g, '_');

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}-${safeOriginalName}`;

    callback(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
});

/* =========================
   HEALTH
========================= */

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Backend TETIM работает',
    time: new Date().toISOString(),
  });
});

/* =========================
   AUTH
========================= */

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Имя, email и пароль обязательны',
      });
    }

    const existing = await get(`SELECT * FROM users WHERE email = ?`, [email]);

    if (existing) {
      return res.status(400).json({
        message: 'Пользователь с таким email уже существует',
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await run(
      `
      INSERT INTO users (name, email, phone, password, role)
      VALUES (?, ?, ?, ?, ?)
      `,
      [name, email, phone || '', hash, 'user']
    );

    const user = await get(
      `SELECT id, name, email, phone, role FROM users WHERE id = ?`,
      [result.id]
    );

    const token = createToken(user);

    return res.json({
      message: 'Регистрация успешна',
      token,
      user,
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);

    return res.status(500).json({
      message: 'Ошибка регистрации',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);

    if (!user) {
      return res.status(401).json({
        message: 'Неверный email или пароль',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Неверный email или пароль',
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      birth_date: user.birth_date,
      gender: user.gender,
      city: user.city,
      street: user.street,
      house: user.house,
      apartment: user.apartment,
    };

    const token = createToken(safeUser);

    return res.json({
      message: 'Вход выполнен',
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('Ошибка входа:', error);

    return res.status(500).json({
      message: 'Ошибка входа',
    });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await get(
      `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        birth_date,
        gender,
        city,
        street,
        house,
        apartment
      FROM users
      WHERE id = ?
      `,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден',
      });
    }

    return res.json({
      user,
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка получения профиля',
    });
  }
});

app.patch('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      phone,
      birth_date,
      gender,
      city,
      street,
      house,
      apartment,
    } = req.body;

    await run(
      `
      UPDATE users
      SET
        name = ?,
        phone = ?,
        birth_date = ?,
        gender = ?,
        city = ?,
        street = ?,
        house = ?,
        apartment = ?
      WHERE id = ?
      `,
      [
        name || '',
        phone || '',
        birth_date || '',
        gender || '',
        city || '',
        street || '',
        house || '',
        apartment || '',
        req.user.id,
      ]
    );

    const user = await get(
      `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        birth_date,
        gender,
        city,
        street,
        house,
        apartment
      FROM users
      WHERE id = ?
      `,
      [req.user.id]
    );

    return res.json({
      message: 'Профиль сохранён',
      user,
    });
  } catch (error) {
    console.error('Ошибка сохранения профиля:', error);

    return res.status(500).json({
      message: 'Ошибка сохранения профиля',
    });
  }
});

/* =========================
   PUBLIC
========================= */

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

    return res.json({
      products,
    });
  } catch (error) {
    console.error('Ошибка получения товаров:', error);

    return res.status(500).json({
      message: 'Ошибка получения товаров',
    });
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
      return res.status(404).json({
        message: 'Товар не найден',
      });
    }

    return res.json({
      product,
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка получения товара',
    });
  }
});

app.get('/api/public/slides', async (req, res) => {
  try {
    const slides = await all(
      `
      SELECT *
      FROM slides
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    return res.json({
      slides,
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка получения слайдов',
    });
  }
});

/* =========================
   SITE SETTINGS
========================= */

app.get('/api/public/settings', async (req, res) => {
  try {
    const rows = await all(`SELECT key, value FROM site_settings`);

    const settings = {};

    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return res.json({
      settings,
    });
  } catch (error) {
    console.error('Ошибка получения настроек сайта:', error);

    return res.status(500).json({
      message: 'Ошибка получения настроек сайта',
    });
  }
});

app.get(
  '/api/admin/settings',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const rows = await all(`SELECT key, value FROM site_settings`);

      const settings = {};

      for (const row of rows) {
        settings[row.key] = row.value;
      }

      return res.json({
        settings,
      });
    } catch (error) {
      console.error('Ошибка получения настроек сайта админом:', error);

      return res.status(500).json({
        message: 'Ошибка получения настроек сайта',
      });
    }
  }
);

app.patch(
  '/api/admin/settings',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const settings = req.body.settings || {};

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

      return res.json({
        message: 'Настройки сайта сохранены',
      });
    } catch (error) {
      console.error('Ошибка сохранения настроек сайта:', error);

      return res.status(500).json({
        message: 'Ошибка сохранения настроек сайта',
      });
    }
  }
);

/* =========================
   ORDERS
========================= */

app.post('/api/orders', optionalAuthMiddleware, async (req, res) => {
  try {
    const {
      customer_name,
      phone,
      email,
      address,
      comment,
      delivery_type,
      total_amount,
      items,
    } = req.body;

    if (!customer_name || !phone) {
      return res.status(400).json({
        message: 'Имя и телефон обязательны',
      });
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
        delivery_type,
        total_amount,
        items_json,
        status,
        amo_status,
        one_c_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user?.id || null,
        customer_name,
        phone,
        email || '',
        address || '',
        comment || '',
        delivery_type || 'pickup',
        Number(total_amount || 0),
        JSON.stringify(items || []),
        'new',
        'not_sent',
        'not_exported',
      ]
    );

    return res.json({
      message: 'Заказ оформлен',
      order_id: result.id,
    });
  } catch (error) {
    console.error('Ошибка создания заказа:', error);

    return res.status(500).json({
      message: 'Ошибка создания заказа',
    });
  }
});

app.post('/api/custom-orders', optionalAuthMiddleware, async (req, res) => {
  try {
    const {
      customer_name,
      phone,
      email,
      selected_items,
      total_amount,
      comment,
    } = req.body;

    if (!customer_name || !phone) {
      return res.status(400).json({
        message: 'Имя и телефон обязательны',
      });
    }

    const result = await run(
      `
      INSERT INTO custom_orders (
        user_id,
        customer_name,
        phone,
        email,
        selected_items,
        total_amount,
        comment,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user?.id || null,
        customer_name,
        phone,
        email || '',
        JSON.stringify(selected_items || []),
        Number(total_amount || 0),
        comment || '',
        'new',
      ]
    );

    return res.json({
      message: 'Заявка отправлена',
      custom_order_id: result.id,
    });
  } catch (error) {
    console.error('Ошибка создания заявки:', error);

    return res.status(500).json({
      message: 'Ошибка создания заявки',
    });
  }
});

/* =========================
   ADMIN COMMON
========================= */

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await all(
      `
      SELECT id, name, email, phone, role, created_at
      FROM users
      ORDER BY id DESC
      `
    );

    return res.json({
      users,
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка получения пользователей',
    });
  }
});

app.post(
  '/api/admin/upload',
  authMiddleware,
  adminMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Файл не загружен',
        });
      }

      const isVideo = req.file.mimetype.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';
      const url = `${SERVER_URL}/uploads/${req.file.filename}`;

      return res.json({
        message: 'Файл загружен',
        url,
        media_type: mediaType,
        filename: req.file.filename,
      });
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);

      return res.status(500).json({
        message: 'Ошибка загрузки файла',
      });
    }
  }
);

/* =========================
   ADMIN PRODUCTS
========================= */

app.get(
  '/api/admin/products',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const products = await all(
        `
        SELECT *
        FROM products
        ORDER BY id DESC
        `
      );

      return res.json({
        products,
      });
    } catch (error) {
      console.error('Ошибка получения товаров админом:', error);

      return res.status(500).json({
        message: 'Ошибка получения товаров',
      });
    }
  }
);

app.post(
  '/api/admin/products',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        external_id,
        article,
        name,
        category,
        price,
        sizes,
        stock,
        image_url,
        description,
      } = req.body;

      if (!name || !category || !price) {
        return res.status(400).json({
          message: 'Название, категория и цена обязательны',
        });
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [
          external_id || '',
          article || '',
          name,
          category,
          Number(price),
          sizes || '',
          Number(stock || 0),
          image_url || '',
          description || '',
          0,
          'draft',
        ]
      );

      return res.json({
        message: 'Товар добавлен',
        id: result.id,
      });
    } catch (error) {
      console.error('Ошибка добавления товара:', error);

      return res.status(500).json({
        message: 'Ошибка добавления товара',
      });
    }
  }
);

app.patch(
  '/api/admin/products/:id',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const productId = req.params.id;

      const existing = await get(`SELECT * FROM products WHERE id = ?`, [
        productId,
      ]);

      if (!existing) {
        return res.status(404).json({
          message: 'Товар не найден',
        });
      }

      const {
        external_id,
        article,
        name,
        category,
        price,
        sizes,
        stock,
        image_url,
        description,
      } = req.body;

      if (!name || !category || !price) {
        return res.status(400).json({
          message: 'Название, категория и цена обязательны',
        });
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
        [
          external_id || '',
          article || '',
          name,
          category,
          Number(price),
          sizes || '',
          Number(stock || 0),
          image_url || '',
          description || '',
          productId,
        ]
      );

      return res.json({
        message: 'Товар сохранён',
      });
    } catch (error) {
      console.error('Ошибка изменения товара:', error);

      return res.status(500).json({
        message: 'Ошибка изменения товара',
      });
    }
  }
);

app.patch(
  '/api/admin/products/:id/photo',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { image_url } = req.body;

      if (!image_url) {
        return res.status(400).json({
          message: 'Ссылка на фото обязательна',
        });
      }

      await run(
        `
        UPDATE products
        SET image_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [image_url, req.params.id]
      );

      return res.json({
        message: 'Фото товара обновлено',
      });
    } catch {
      return res.status(500).json({
        message: 'Ошибка обновления фото',
      });
    }
  }
);

app.patch(
  '/api/admin/products/:id/publish',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const product = await get(`SELECT * FROM products WHERE id = ?`, [
        req.params.id,
      ]);

      if (!product) {
        return res.status(404).json({
          message: 'Товар не найден',
        });
      }

      if (!product.image_url) {
        return res.status(400).json({
          message: 'Перед публикацией нужно добавить фото товара',
        });
      }

      await run(
        `
        UPDATE products
        SET
          is_published = 1,
          moderation_status = 'approved',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [req.params.id]
      );

      return res.json({
        message: 'Товар опубликован',
      });
    } catch (error) {
      console.error('Ошибка публикации товара:', error);

      return res.status(500).json({
        message: 'Ошибка публикации товара',
      });
    }
  }
);

app.patch(
  '/api/admin/products/:id/unpublish',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      await run(
        `
        UPDATE products
        SET
          is_published = 0,
          moderation_status = 'draft',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [req.params.id]
      );

      return res.json({
        message: 'Товар снят с публикации',
      });
    } catch {
      return res.status(500).json({
        message: 'Ошибка снятия товара',
      });
    }
  }
);

app.delete(
  '/api/admin/products/:id',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      await run(`DELETE FROM products WHERE id = ?`, [req.params.id]);

      return res.json({
        message: 'Товар удалён',
      });
    } catch {
      return res.status(500).json({
        message: 'Ошибка удаления товара',
      });
    }
  }
);

/* =========================
   ADMIN SLIDES
========================= */

app.get(
  '/api/admin/slides',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const slides = await all(
        `
        SELECT *
        FROM slides
        ORDER BY sort_order ASC, id ASC
        `
      );

      return res.json({
        slides,
      });
    } catch {
      return res.status(500).json({
        message: 'Ошибка получения слайдов',
      });
    }
  }
);

app.post(
  '/api/admin/slides',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        title,
        subtitle,
        image_url,
        media_type,
        background_color,
        sort_order,
        is_active,
      } = req.body;

      if (!image_url) {
        return res.status(400).json({
          message: 'Нужно загрузить фото или видео',
        });
      }

      const countRow = await get(`SELECT COUNT(*) as count FROM slides`);

      if (countRow.count >= 10) {
        return res.status(400).json({
          message: 'Нельзя добавить больше 10 слайдов',
        });
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
        [
          title || '',
          subtitle || '',
          image_url,
          media_type || 'image',
          background_color || '#111111',
          Number(sort_order || 0),
          is_active === false ? 0 : 1,
        ]
      );

      return res.json({
        message: 'Слайд добавлен',
        id: result.id,
      });
    } catch (error) {
      console.error('Ошибка добавления слайда:', error);

      return res.status(500).json({
        message: 'Ошибка добавления слайда',
      });
    }
  }
);

app.delete(
  '/api/admin/slides/:id',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const countRow = await get(`SELECT COUNT(*) as count FROM slides`);

      if (countRow.count <= 0) {
        return res.status(400).json({
          message: 'Слайдов уже нет',
        });
      }

      await run(`DELETE FROM slides WHERE id = ?`, [req.params.id]);

      return res.json({
        message: 'Слайд удалён',
      });
    } catch {
      return res.status(500).json({
        message: 'Ошибка удаления слайда',
      });
    }
  }
);

/* =========================
   ADMIN ORDERS
========================= */

app.get(
  '/api/admin/orders',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const orders = await all(
        `
        SELECT *
        FROM orders
        ORDER BY id DESC
        `
      );

      return res.json({
        orders,
      });
    } catch {
      return res.status(500).json({
        message: 'Ошибка получения заказов',
      });
    }
  }
);

app.patch(
  '/api/admin/orders/:id/status',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status } = req.body;

      await run(`UPDATE orders SET status = ? WHERE id = ?`, [
        status,
        req.params.id,
      ]);

      return res.json({
        message: 'Статус заказа изменён',
      });
    } catch {
      return res.status(500).json({
        message: 'Ошибка изменения статуса',
      });
    }
  }
);

/* =========================
   1C API
========================= */

app.get('/api/1c/ping', oneCMiddleware, (req, res) => {
  res.json({
    message: 'Связь с backend TETIM работает',
    time: new Date().toISOString(),
  });
});

app.post('/api/1c/products/sync', oneCMiddleware, async (req, res) => {
  try {
    const products = req.body.products || [];

    let created = 0;
    let updated = 0;

    for (const item of products) {
      const externalId = item.external_id || item.id || item.guid || '';

      if (!externalId) {
        continue;
      }

      const existing = await get(
        `SELECT * FROM products WHERE external_id = ?`,
        [externalId]
      );

      if (existing) {
        await run(
          `
          UPDATE products
          SET
            article = ?,
            name = ?,
            category = ?,
            price = ?,
            sizes = ?,
            stock = ?,
            description = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE external_id = ?
          `,
          [
            item.article || existing.article || '',
            item.name || existing.name,
            item.category || existing.category,
            Number(item.price ?? existing.price),
            item.sizes || existing.sizes || '',
            Number(item.stock ?? existing.stock ?? 0),
            item.description || existing.description || '',
            externalId,
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
            externalId,
            item.article || '',
            item.name || 'Товар из 1С',
            item.category || 'accessories',
            Number(item.price || 0),
            item.sizes || '',
            Number(item.stock || 0),
            item.image_url || '',
            item.description || '',
            0,
            'draft',
          ]
        );

        created += 1;
      }
    }

    return res.json({
      message: 'Синхронизация товаров завершена',
      created,
      updated,
    });
  } catch (error) {
    console.error('Ошибка синхронизации 1С:', error);

    return res.status(500).json({
      message: 'Ошибка синхронизации товаров из 1С',
    });
  }
});

app.post('/api/1c/products/stocks', oneCMiddleware, async (req, res) => {
  try {
    const products = req.body.products || [];

    let updated = 0;

    for (const item of products) {
      const externalId = item.external_id || item.id || item.guid || '';

      if (!externalId) {
        continue;
      }

      await run(
        `
        UPDATE products
        SET
          price = ?,
          stock = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE external_id = ?
        `,
        [Number(item.price || 0), Number(item.stock || 0), externalId]
      );

      updated += 1;
    }

    return res.json({
      message: 'Остатки и цены обновлены',
      updated,
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка обновления остатков',
    });
  }
});

app.get('/api/1c/orders', oneCMiddleware, async (req, res) => {
  try {
    const orders = await all(
      `
      SELECT *
      FROM orders
      WHERE one_c_status != 'exported'
      ORDER BY id ASC
      `
    );

    return res.json({
      orders,
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка получения заказов для 1С',
    });
  }
});

app.patch('/api/1c/orders/:id/exported', oneCMiddleware, async (req, res) => {
  try {
    await run(
      `
      UPDATE orders
      SET one_c_status = 'exported'
      WHERE id = ?
      `,
      [req.params.id]
    );

    return res.json({
      message: 'Заказ отмечен как выгруженный в 1С',
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка обновления статуса 1С',
    });
  }
});

/* =========================
   START
========================= */

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend TETIM работает: ${SERVER_URL}`);
      console.log(`1C ping: ${SERVER_URL}/api/1c/ping`);
      console.log('Админ: admin@tetim.ru / 1234');
    });
  })
  .catch((error) => {
    console.error('Ошибка запуска backend:', error);
  });