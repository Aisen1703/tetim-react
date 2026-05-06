require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { sendOrderToAmo } = require('./amocrm');

const app = express();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'tetim_secret_key';

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error('Можно загружать только изображения или видео'), false);
    return;
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 80 * 1024 * 1024,
  },
});

const db = new sqlite3.Database('./data.db');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (error, row) {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (error, rows) {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      lastname TEXT,
      birthday TEXT,
      gender TEXT,
      city TEXT,
      street TEXT,
      house TEXT,
      flat TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      article TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      sizes TEXT,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      description TEXT,
      is_published INTEGER DEFAULT 0,
      moderation_status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      delivery_type TEXT DEFAULT 'delivery',
      comment TEXT,
      items_json TEXT,
      total_amount INTEGER DEFAULT 0,
      status TEXT DEFAULT 'new',
      amo_lead_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      subtitle TEXT,
      image_url TEXT NOT NULL,
      media_type TEXT DEFAULT 'image',
      background_color TEXT DEFAULT '#d8c900',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`ALTER TABLE products ADD COLUMN external_id TEXT`).catch(() => {});
  await run(`ALTER TABLE products ADD COLUMN article TEXT`).catch(() => {});
  await run(`ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0`).catch(() => {});
  await run(`ALTER TABLE products ADD COLUMN is_published INTEGER DEFAULT 0`).catch(() => {});
  await run(`ALTER TABLE products ADD COLUMN moderation_status TEXT DEFAULT 'draft'`).catch(() => {});

  await run(`ALTER TABLE orders ADD COLUMN email TEXT`).catch(() => {});
  await run(`ALTER TABLE orders ADD COLUMN address TEXT`).catch(() => {});
  await run(`ALTER TABLE orders ADD COLUMN delivery_type TEXT DEFAULT 'delivery'`).catch(() => {});
  await run(`ALTER TABLE orders ADD COLUMN comment TEXT`).catch(() => {});
  await run(`ALTER TABLE orders ADD COLUMN items_json TEXT`).catch(() => {});
  await run(`ALTER TABLE orders ADD COLUMN amo_lead_id INTEGER`).catch(() => {});

  await run(`ALTER TABLE slides ADD COLUMN media_type TEXT DEFAULT 'image'`).catch(() => {});

  const admin = await get(`SELECT * FROM users WHERE email = ?`, [
    'admin@tetim.ru',
  ]);

  if (!admin) {
    const passwordHash = await bcrypt.hash('1234', 10);

    await run(
      `
      INSERT INTO users (name, email, phone, password, role)
      VALUES (?, ?, ?, ?, ?)
      `,
      ['Админ', 'admin@tetim.ru', '+79990600075', passwordHash, 'admin']
    );

    console.log('Админ создан: admin@tetim.ru / 1234');
  }

  const products = await all(`SELECT * FROM products`);

  if (!products.length) {
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
        moderation_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'LOCAL-001',
        'HD-001',
        'Худи TETIM',
        'hoodies',
        3493,
        'S, M, L, XL',
        10,
        'https://placehold.co/600x720?text=Hoodie',
        'Удобное худи для города и спорта.',
        1,
        'approved',
      ]
    );

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
        moderation_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'LOCAL-002',
        'TS-001',
        'Футболка TETIM',
        'tshirts',
        1990,
        'S, M, L',
        20,
        'https://placehold.co/600x720?text=T-Shirt',
        'Базовая футболка на каждый день.',
        1,
        'approved',
      ]
    );

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
        moderation_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'LOCAL-003',
        'JK-001',
        'Куртка Outdoor',
        'jackets',
        5990,
        'M, L, XL',
        5,
        'https://placehold.co/600x720?text=Jacket',
        'Куртка для города и активного отдыха.',
        1,
        'approved',
      ]
    );

    console.log('Стартовые товары добавлены');
  }

  const slides = await all(`SELECT * FROM slides`);

  if (slides.length < 3) {
    await run(`DELETE FROM slides`);

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
      ['TETIM', 'Новая коллекция', '/assets/afisha1.jpg', 'image', '#d8c900', 1, 1]
    );

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
      ['TETIM', 'Outdoor', '/assets/afisha2.jpg', 'image', '#4aa7d8', 2, 1]
    );

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
      ['TETIM', 'Командная форма', '/assets/afisha3.jpg', 'image', '#d88422', 3, 1]
    );

    console.log('Стартовые слайды добавлены: 3 шт.');
  }
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: 'Нет токена',
    });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      message: 'Неверный токен',
    });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Доступ только для админа',
    });
  }

  next();
}

function onecMiddleware(req, res, next) {
  const apiKey = req.headers['x-1c-api-key'];

  if (!apiKey || apiKey !== process.env.ONEC_API_KEY) {
    return res.status(401).json({
      message: 'Нет доступа для 1С',
    });
  }

  next();
}

async function getSlidesCount() {
  const row = await get(`SELECT COUNT(*) as count FROM slides`);
  return Number(row?.count || 0);
}

/* AUTH */

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Заполните имя, email и пароль',
      });
    }

    const existingUser = await get(`SELECT * FROM users WHERE email = ?`, [
      email,
    ]);

    if (existingUser) {
      return res.status(400).json({
        message: 'Пользователь с таким email уже существует',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await run(
      `
      INSERT INTO users (name, email, phone, password, role)
      VALUES (?, ?, ?, ?, ?)
      `,
      [name, email, phone || '', passwordHash, 'user']
    );

    return res.json({
      message: 'Аккаунт создан',
    });
  } catch (error) {
    console.error(error);

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
      return res.status(400).json({
        message: 'Неверный email или пароль',
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: 'Неверный email или пароль',
      });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Ошибка входа',
    });
  }
});

/* ACCOUNT */

app.get('/api/account/me', authMiddleware, async (req, res) => {
  try {
    const user = await get(
      `
      SELECT id, name, lastname, email, phone, role, birthday, gender, city, street, house, flat
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

    return res.json({ user });
  } catch {
    return res.status(500).json({
      message: 'Ошибка загрузки профиля',
    });
  }
});

app.get('/api/account/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await all(
      `
      SELECT *
      FROM orders
      WHERE user_id = ?
      ORDER BY id DESC
      `,
      [req.user.id]
    );

    const normalizedOrders = orders.map((order) => ({
      ...order,
      items: JSON.parse(order.items_json || '[]'),
    }));

    return res.json({ orders: normalizedOrders });
  } catch {
    return res.status(500).json({
      message: 'Ошибка загрузки заказов',
    });
  }
});

/* PUBLIC */

app.get('/api/public/products', async (req, res) => {
  try {
    const search = String(req.query.search || '').toLowerCase();

    let products = await all(`
      SELECT *
      FROM products
      WHERE is_published = 1
      ORDER BY id DESC
    `);

    if (search) {
      products = products.filter((product) => {
        return (
          String(product.name || '').toLowerCase().includes(search) ||
          String(product.description || '').toLowerCase().includes(search) ||
          String(product.category || '').toLowerCase().includes(search) ||
          String(product.article || '').toLowerCase().includes(search)
        );
      });
    }

    return res.json({ products });
  } catch {
    return res.status(500).json({
      message: 'Ошибка загрузки товаров',
    });
  }
});

app.get('/api/public/slides', async (req, res) => {
  try {
    const slides = await all(`
      SELECT *
      FROM slides
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      LIMIT 10
    `);

    return res.json({ slides });
  } catch {
    return res.status(500).json({
      message: 'Ошибка загрузки слайдов',
    });
  }
});

/* ORDERS */

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, total, deliveryType, address, comment } = req.body;

    if (!customer?.name || !customer?.phone) {
      return res.status(400).json({
        message: 'Введите имя и телефон',
      });
    }

    if (!items || !items.length) {
      return res.status(400).json({
        message: 'Корзина пуста',
      });
    }

    if (deliveryType === 'delivery' && !address) {
      return res.status(400).json({
        message: 'Введите адрес доставки',
      });
    }

    let userId = null;

    const authHeader = req.headers.authorization;

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch {
        userId = null;
      }
    }

    const result = await run(
      `
      INSERT INTO orders (
        user_id,
        customer_name,
        phone,
        email,
        address,
        delivery_type,
        comment,
        items_json,
        total_amount,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        customer.name,
        customer.phone,
        customer.email || '',
        address || '',
        deliveryType || 'delivery',
        comment || '',
        JSON.stringify(items),
        Number(total || 0),
        'new',
      ]
    );

    const order = {
      id: result.lastID,
      customer,
      items,
      total,
      deliveryType,
      address,
      comment,
    };

    let amo = null;

    try {
      amo = await sendOrderToAmo(order);

      if (amo?.leadId) {
        await run(`UPDATE orders SET amo_lead_id = ? WHERE id = ?`, [
          amo.leadId,
          result.lastID,
        ]);
      }
    } catch (amoError) {
      console.error(
        'Заказ сохранён, но amoCRM не приняла заявку:',
        amoError.message
      );
    }

    return res.json({
      message: 'Заказ оформлен',
      orderId: result.lastID,
      amo,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Ошибка оформления заказа',
    });
  }
});

/* ADMIN UPLOAD */

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

      const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;

      const mediaType = req.file.mimetype.startsWith('video/')
        ? 'video'
        : 'image';

      return res.json({
        message: 'Файл загружен',
        url: fileUrl,
        media_type: mediaType,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: 'Ошибка загрузки файла',
      });
    }
  }
);

/* ADMIN USERS */

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await all(`
      SELECT id, name, email, phone, role, created_at
      FROM users
      ORDER BY id DESC
    `);

    return res.json({ users });
  } catch {
    return res.status(500).json({
      message: 'Ошибка загрузки пользователей',
    });
  }
});

/* ADMIN PRODUCTS */

app.get('/api/admin/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const products = await all(`
      SELECT *
      FROM products
      ORDER BY id DESC
    `);

    return res.json({ products });
  } catch {
    return res.status(500).json({
      message: 'Ошибка загрузки товаров',
    });
  }
});

app.post('/api/admin/products', authMiddleware, adminMiddleware, async (req, res) => {
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
        message: 'Введите название, категорию и цену',
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
        moderation_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      productId: result.lastID,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Ошибка добавления товара',
    });
  }
});

app.patch('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
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

    const existing = await get(`SELECT * FROM products WHERE id = ?`, [
      req.params.id,
    ]);

    if (!existing) {
      return res.status(404).json({
        message: 'Товар не найден',
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
        description = ?
      WHERE id = ?
      `,
      [
        external_id ?? existing.external_id,
        article ?? existing.article,
        name ?? existing.name,
        category ?? existing.category,
        price !== undefined ? Number(price) : existing.price,
        sizes ?? existing.sizes,
        stock !== undefined ? Number(stock) : existing.stock,
        image_url ?? existing.image_url,
        description ?? existing.description,
        req.params.id,
      ]
    );

    return res.json({
      message: 'Товар изменён',
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка изменения товара',
    });
  }
});

app.patch('/api/admin/products/:id/photo', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({
        message: 'Передайте ссылку на фото',
      });
    }

    await run(
      `
      UPDATE products
      SET image_url = ?
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
});

app.patch('/api/admin/products/:id/publish', authMiddleware, adminMiddleware, async (req, res) => {
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
      SET is_published = 1, moderation_status = 'approved'
      WHERE id = ?
      `,
      [req.params.id]
    );

    return res.json({
      message: 'Товар опубликован',
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка публикации товара',
    });
  }
});

app.patch('/api/admin/products/:id/unpublish', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await run(
      `
      UPDATE products
      SET is_published = 0, moderation_status = 'draft'
      WHERE id = ?
      `,
      [req.params.id]
    );

    return res.json({
      message: 'Товар снят с публикации',
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка снятия товара с публикации',
    });
  }
});

app.delete('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
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
});

/* ADMIN ORDERS */

app.get('/api/admin/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await all(`
      SELECT *
      FROM orders
      ORDER BY id DESC
    `);

    const normalizedOrders = orders.map((order) => ({
      ...order,
      items: JSON.parse(order.items_json || '[]'),
    }));

    return res.json({ orders: normalizedOrders });
  } catch {
    return res.status(500).json({
      message: 'Ошибка загрузки заказов',
    });
  }
});

app.patch('/api/admin/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    await run(`UPDATE orders SET status = ? WHERE id = ?`, [
      status,
      req.params.id,
    ]);

    return res.json({
      message: 'Статус изменён',
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка изменения статуса',
    });
  }
});

/* ADMIN SLIDES */

app.get('/api/admin/slides', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const slides = await all(`
      SELECT *
      FROM slides
      ORDER BY sort_order ASC, id ASC
    `);

    return res.json({
      slides,
      rules: {
        min: 3,
        max: 10,
        maxVideoSeconds: 60,
      },
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка загрузки слайдов',
    });
  }
});

app.post('/api/admin/slides', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const slidesCount = await getSlidesCount();

    if (slidesCount >= 10) {
      return res.status(400).json({
        message: 'Нельзя добавить больше 10 слайдов',
      });
    }

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
        message: 'Добавьте ссылку на изображение или видео',
      });
    }

    if (!['image', 'video'].includes(media_type || 'image')) {
      return res.status(400).json({
        message: 'Тип слайда должен быть image или video',
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
        background_color || '#d8c900',
        Number(sort_order || 0),
        is_active ? 1 : 0,
      ]
    );

    return res.json({
      message: 'Слайд добавлен',
      slideId: result.lastID,
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка добавления слайда',
    });
  }
});

app.patch('/api/admin/slides/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const existing = await get(`SELECT * FROM slides WHERE id = ?`, [
      req.params.id,
    ]);

    if (!existing) {
      return res.status(404).json({
        message: 'Слайд не найден',
      });
    }

    const {
      title,
      subtitle,
      image_url,
      media_type,
      background_color,
      sort_order,
      is_active,
    } = req.body;

    await run(
      `
      UPDATE slides
      SET
        title = ?,
        subtitle = ?,
        image_url = ?,
        media_type = ?,
        background_color = ?,
        sort_order = ?,
        is_active = ?
      WHERE id = ?
      `,
      [
        title ?? existing.title,
        subtitle ?? existing.subtitle,
        image_url ?? existing.image_url,
        media_type ?? existing.media_type,
        background_color ?? existing.background_color,
        sort_order !== undefined ? Number(sort_order) : existing.sort_order,
        is_active !== undefined ? Number(is_active) : existing.is_active,
        req.params.id,
      ]
    );

    return res.json({
      message: 'Слайд обновлён',
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка обновления слайда',
    });
  }
});

app.delete('/api/admin/slides/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const slidesCount = await getSlidesCount();

    if (slidesCount <= 3) {
      return res.status(400).json({
        message: 'Нельзя оставить меньше 3 слайдов',
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
});

/* 1C INTEGRATION */

app.get('/api/1c/ping', onecMiddleware, (req, res) => {
  res.json({
    message: 'Связь с backend TETIM работает',
    time: new Date().toISOString(),
  });
});

app.post('/api/1c/products/sync', onecMiddleware, async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({
        message: 'Поле products должно быть массивом',
      });
    }

    let created = 0;
    let updated = 0;

    for (const product of products) {
      const externalId = String(product.external_id || '').trim();

      if (!externalId) continue;

      const existing = await get(
        `SELECT * FROM products WHERE external_id = ?`,
        [externalId]
      );

      const payload = {
        external_id: externalId,
        article: product.article || '',
        name: product.name || 'Товар',
        category: product.category || 'catalog',
        price: Number(product.price || 0),
        sizes: product.sizes || '',
        image_url: product.image_url || '',
        description: product.description || '',
        stock: Number(product.stock || 0),
      };

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
            image_url = ?,
            description = ?,
            stock = ?
          WHERE external_id = ?
          `,
          [
            payload.article,
            payload.name,
            payload.category,
            payload.price,
            payload.sizes,
            payload.image_url,
            payload.description,
            payload.stock,
            payload.external_id,
          ]
        );

        updated++;
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
            image_url,
            description,
            stock,
            is_published,
            moderation_status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            payload.external_id,
            payload.article,
            payload.name,
            payload.category,
            payload.price,
            payload.sizes,
            payload.image_url,
            payload.description,
            payload.stock,
            0,
            'pending',
          ]
        );

        created++;
      }
    }

    return res.json({
      message: 'Синхронизация товаров завершена',
      created,
      updated,
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка синхронизации товаров с 1С',
    });
  }
});

app.post('/api/1c/products/stocks', onecMiddleware, async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({
        message: 'Поле products должно быть массивом',
      });
    }

    let updated = 0;

    for (const product of products) {
      const externalId = String(product.external_id || '').trim();

      if (!externalId) continue;

      await run(
        `
        UPDATE products
        SET price = ?, stock = ?
        WHERE external_id = ?
        `,
        [Number(product.price || 0), Number(product.stock || 0), externalId]
      );

      updated++;
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

app.get('/api/1c/orders', onecMiddleware, async (req, res) => {
  try {
    const orders = await all(`
      SELECT *
      FROM orders
      WHERE status = 'new'
      ORDER BY id ASC
    `);

    const normalizedOrders = orders.map((order) => ({
      id: order.id,
      user_id: order.user_id,
      customer_name: order.customer_name,
      phone: order.phone,
      email: order.email,
      address: order.address,
      delivery_type: order.delivery_type,
      comment: order.comment,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at,
      items: JSON.parse(order.items_json || '[]'),
    }));

    return res.json({
      orders: normalizedOrders,
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка получения заказов для 1С',
    });
  }
});

app.patch('/api/1c/orders/:id/status', onecMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      'new',
      'processing',
      'shipped',
      'done',
      'cancelled',
      'exported_to_1c',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Недопустимый статус заказа',
      });
    }

    await run(
      `
      UPDATE orders
      SET status = ?
      WHERE id = ?
      `,
      [status, req.params.id]
    );

    return res.json({
      message: 'Статус заказа обновлён',
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка обновления статуса заказа',
    });
  }
});

app.post('/api/1c/orders/:id/exported', onecMiddleware, async (req, res) => {
  try {
    await run(
      `
      UPDATE orders
      SET status = 'exported_to_1c'
      WHERE id = ?
      `,
      [req.params.id]
    );

    return res.json({
      message: 'Заказ отмечен как выгруженный в 1С',
    });
  } catch {
    return res.status(500).json({
      message: 'Ошибка отметки выгрузки',
    });
  }
});

/* START */

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend запущен: http://localhost:${PORT}/api`);
    console.log(`Uploads: http://localhost:${PORT}/uploads`);
    console.log(`1C ping: http://localhost:${PORT}/api/1c/ping`);
    console.log('Правила слайдов: минимум 3, максимум 10, видео до 60 секунд');
  });
});