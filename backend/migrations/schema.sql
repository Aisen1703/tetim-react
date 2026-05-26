CREATE DATABASE IF NOT EXISTS tetim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tetim;

-- Пользователи
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    lastname VARCHAR(255),
    birthday DATE,
    gender ENUM('male', 'female'),
    city VARCHAR(255),
    street VARCHAR(255),
    house VARCHAR(50),
    flat VARCHAR(50),
    reset_code VARCHAR(10),
    reset_code_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Товары
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(100),
    article VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    sizes TEXT,
    stock INT DEFAULT 0,
    image_url TEXT,
    description TEXT,
    is_published TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Заказы
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    comment TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('new', 'processing', 'done', 'cancelled') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Товары в заказе
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255),
    price DECIMAL(10,2),
    quantity INT,
    size VARCHAR(20),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Слайды
CREATE TABLE slides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    subtitle VARCHAR(255),
    image_url TEXT NOT NULL,
    media_type ENUM('image', 'video') DEFAULT 'image',
    background_color VARCHAR(20) DEFAULT '#111111',
    sort_order INT DEFAULT 0,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Блоки конструктора
CREATE TABLE page_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page VARCHAR(50) DEFAULT 'home',
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    subtitle VARCHAR(255),
    image_url TEXT,
    background_color VARCHAR(20) DEFAULT '#ffffff',
    text_color VARCHAR(20) DEFAULT '#111111',
    sort_order INT DEFAULT 0,
    is_active TINYINT DEFAULT 1,
    content_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Настройки сайта
CREATE TABLE settings (
    key_name VARCHAR(100) PRIMARY KEY,
    value TEXT
);

-- Вставка настроек по умолчанию
INSERT INTO settings (key_name, value) VALUES
('site_title', 'TETIM'),
('logo_url', '/assets/logo-full.png'),
('logo_white_url', '/assets/logo-full-white.png'),
('site_theme', 'auto'),
('holiday_theme_enabled', '1'),
('instagram_url', ''),
('whatsapp_url', ''),
('social_extra_url', ''),
('phone', '+7 999 060 00 75'),
('email', 'info@tetim.ru'),
('address', 'Якутск'),
('footer_text', '© 2026 TETIM. Все права защищены.'),
('hero_badge', 'Новая коллекция'),
('hero_title', 'Одежда с характером Севера'),
('hero_text', 'Создаём одежду для города, спорта и активной жизни — с вниманием к деталям, комфорту и северному характеру.'),
('hero_button_primary', 'Каталог'),
('hero_button_secondary', 'Индивидуальный заказ'),
('accent_color', '#111111'),
('background_color', '#f4f0e8'),
('newyear_theme_start', '2026-01-01'),
('newyear_theme_end', '2026-01-08'),
('defender_theme_start', '2026-02-23'),
('defender_theme_end', '2026-02-23'),
('womens_theme_start', '2026-03-08'),
('womens_theme_end', '2026-03-08'),
('republic_theme_start', '2026-04-27'),
('republic_theme_end', '2026-04-27'),
('ysyakh_theme_start', '2026-06-21'),
('ysyakh_theme_end', '2026-06-21'),
('statehood_theme_start', '2026-09-27'),
('statehood_theme_end', '2026-09-27'),
('header_ornament_url', ''),
('background_pattern_url', ''),
('decor_image_url', ''),
('snow_enabled', '0');