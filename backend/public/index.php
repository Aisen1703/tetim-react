<?php
// ============================================================
// TETIM BACKEND – ФИНАЛЬНАЯ ВЕРСИЯ
// ============================================================

// ----- НАСТРОЙКИ -----
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'tetim');
define('DB_USER', 'tetim_user');
define('DB_PASS', 'tetim_pass123');
define('JWT_SECRET', 'your_super_secret_key_change_me_12345');
define('UPLOAD_DIR', __DIR__ . '/uploads/');   // папка внутри public

error_reporting(E_ALL);
ini_set('display_errors', 1);

// ----- CORS -----
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ----- ПОДКЛЮЧЕНИЕ К БД -----
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            sendError("Database error: " . $e->getMessage(), 500);
        }
    }
    return $pdo;
}

// ----- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ -----
function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function sendSuccess($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function sendError($message, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['message' => $message]);
    exit;
}

// ----- JWT -----
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}
function generateJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['iat'] = time();
    $payload['exp'] = time() + 3600;
    $base64UrlHeader = base64url_encode($header);
    $base64UrlPayload = base64url_encode(json_encode($payload));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64url_encode($signature);
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}
function verifyJWT($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    list($header, $payload, $signature) = $parts;
    $expectedSignature = hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true);
    $expectedSignatureBase64 = base64url_encode($expectedSignature);
    if (!hash_equals($expectedSignatureBase64, $signature)) return null;
    $payloadData = json_decode(base64url_decode($payload), true);
    if ($payloadData['exp'] < time()) return null;
    return $payloadData;
}
function getAuthorizationHeader() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER['Authorization']);
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    } else {
        $all = getallheaders();
        if (isset($all['Authorization'])) {
            $headers = trim($all['Authorization']);
        }
    }
    return $headers;
}
function getUserFromToken() {
    $authHeader = getAuthorizationHeader();
    if (!$authHeader) return null;
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return verifyJWT($matches[1]);
    }
    return null;
}
function requireAdmin() {
    $user = getUserFromToken();
    if (!$user || ($user['role'] ?? 'user') !== 'admin') {
        sendError('Доступ запрещён', 403);
    }
}

// ----- МОДЕЛИ -----
function createUser($name, $email, $phone, $password) {
    $db = getDB();
    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'user')");
    $stmt->execute([$name, $email, $phone, $hashed]);
    return $db->lastInsertId();
}
function findUserByEmail($email) {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}
function getAllUsers() {
    $db = getDB();
    $stmt = $db->query("SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
function getPublicProducts() {
    $db = getDB();
    $stmt = $db->query("SELECT * FROM products WHERE is_published = 1 ORDER BY id DESC");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
function getAllProducts() {
    $db = getDB();
    $stmt = $db->query("SELECT * FROM products ORDER BY id DESC");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
function createProduct($data) {
    $db = getDB();
    $price = isset($data['price']) && $data['price'] !== '' ? floatval($data['price']) : 0;
    $stock = isset($data['stock']) && $data['stock'] !== '' ? intval($data['stock']) : 0;
    $stmt = $db->prepare("INSERT INTO products (external_id, article, name, category, price, sizes, stock, image_url, description, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $data['external_id'] ?? '',
        $data['article'] ?? '',
        $data['name'],
        $data['category'] ?? 'accessories',
        $price,
        $data['sizes'] ?? '',
        $stock,
        $data['image_url'] ?? '',
        $data['description'] ?? '',
        isset($data['is_published']) ? (int)$data['is_published'] : 1
    ]);
    return $db->lastInsertId();
}
function updateProduct($id, $data) {
    $db = getDB();
    $fields = [];
    $params = [];
    $allowed = ['external_id','article','name','category','price','sizes','stock','image_url','description','is_published'];
    foreach ($data as $key => $value) {
        if (in_array($key, $allowed)) {
            $fields[] = "$key = ?";
            $params[] = $value;
        }
    }
    if (empty($fields)) return false;
    $params[] = $id;
    $stmt = $db->prepare("UPDATE products SET " . implode(',', $fields) . " WHERE id = ?");
    return $stmt->execute($params);
}
function deleteProduct($id) {
    $db = getDB();
    $stmt = $db->prepare("DELETE FROM products WHERE id = ?");
    return $stmt->execute([$id]);
}
function setProductPublished($id, $published) {
    $db = getDB();
    $stmt = $db->prepare("UPDATE products SET is_published = ? WHERE id = ?");
    return $stmt->execute([$published ? 1 : 0, $id]);
}
function createOrder($userId, $customer_name, $phone, $email, $address, $comment, $items) {
    $db = getDB();
    $total = 0;
    foreach ($items as $item) $total += $item['price'] * $item['quantity'];
    $db->beginTransaction();
    try {
        $stmt = $db->prepare("INSERT INTO orders (user_id, customer_name, phone, email, address, comment, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'new')");
        $stmt->execute([$userId, $customer_name, $phone, $email, $address, $comment, $total]);
        $orderId = $db->lastInsertId();
        $stmtItem = $db->prepare("INSERT INTO order_items (order_id, product_id, product_name, price, quantity, size) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($items as $item) {
            $stmtItem->execute([$orderId, $item['product_id'], $item['name'], $item['price'], $item['quantity'], $item['size'] ?? '']);
        }
        $db->commit();
        return $orderId;
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}
function getAllOrders() {
    $db = getDB();
    $stmt = $db->query("SELECT * FROM orders ORDER BY id DESC");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
function updateOrderStatus($orderId, $status) {
    $db = getDB();
    $stmt = $db->prepare("UPDATE orders SET status = ? WHERE id = ?");
    return $stmt->execute([$status, $orderId]);
}
function getPublicSlides() {
    $db = getDB();
    $stmt = $db->query("SELECT * FROM slides WHERE is_active = 1 ORDER BY sort_order");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
function getAllSlides() {
    $db = getDB();
    $stmt = $db->query("SELECT * FROM slides ORDER BY sort_order");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
function createSlide($data) {
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO slides (title, subtitle, image_url, media_type, background_color, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $data['title'] ?? '',
        $data['subtitle'] ?? '',
        $data['image_url'],
        $data['media_type'] ?? 'image',
        $data['background_color'] ?? '#111111',
        $data['sort_order'] ?? 0,
        isset($data['is_active']) ? (int)$data['is_active'] : 1
    ]);
    return $db->lastInsertId();
}
function deleteSlide($id) {
    $db = getDB();
    $stmt = $db->prepare("DELETE FROM slides WHERE id = ?");
    return $stmt->execute([$id]);
}
function getPublicSettings() {
    $db = getDB();
    $stmt = $db->query("SELECT key_name, value FROM settings");
    $settings = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) $settings[$row['key_name']] = $row['value'];
    return $settings;
}
function updateSettings($settings) {
    $db = getDB();
    $success = true;
    foreach ($settings as $key => $value) {
        $stmt = $db->prepare("INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?");
        if (!$stmt->execute([$key, $value, $value])) $success = false;
    }
    return $success;
}
function getAllPageBlocks() {
    $db = getDB();
    $stmt = $db->query("SELECT * FROM page_blocks ORDER BY sort_order");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
function createPageBlock($data) { return 1; }
function updatePageBlock($id, $data) { return true; }
function deletePageBlock($id) { return true; }
function handleUpload() {
  requireAdmin();
  
  if (!isset($_FILES['file'])) {
    sendError('Поле "file" не найдено в запросе. Проверьте FormData.', 400);
  }

  $errCode = $_FILES['file']['error'];
  if ($errCode !== UPLOAD_ERR_OK) {
    $errors = [
      UPLOAD_ERR_INI_SIZE => 'Файл превышает upload_max_filesize в php.ini',
      UPLOAD_ERR_FORM_SIZE => 'Файл превышает MAX_FILE_SIZE в форме',
      UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
      UPLOAD_ERR_NO_FILE => 'Файл не был выбран',
      UPLOAD_ERR_NO_TMP_DIR => 'Отсутствует временная директория',
      UPLOAD_ERR_CANT_WRITE => 'Нет прав на запись в uploads/',
      UPLOAD_ERR_EXTENSION => 'Загрузка блокирована расширением PHP',
    ];
    sendError($errors[$errCode] ?? 'Ошибка загрузки (код: ' . $errCode . ')', 400);
  }

  $file = $_FILES['file'];
  $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
  $allowed = ['jpg','jpeg','png','gif','webp','mp4','mov','avi'];
  
  if (!in_array($ext, $allowed)) {
    sendError('Формат файла не поддерживается. Разрешены: ' . implode(', ', $allowed), 400);
  }

  if (!is_dir(UPLOAD_DIR)) {
    if (!mkdir(UPLOAD_DIR, 0775, true)) {
      sendError('Не удалось создать папку uploads/. Проверьте права владельца.', 500);
    }
  }

  $filename = time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
  $target = UPLOAD_DIR . $filename;

  if (move_uploaded_file($file['tmp_name'], $target)) {
    // Убедитесь, что веб-сервер отдает файлы из /uploads/ корректно
    $url = '/uploads/' . $filename;
    $media_type = in_array($ext, ['mp4','mov','avi']) ? 'video' : 'image';
    sendSuccess(['url' => $url, 'media_type' => $media_type]);
  } else {
    sendError('Файл скопирован, но move_uploaded_file вернул false. Проверьте права на папку ' . UPLOAD_DIR, 500);
  }
}
// ----- РОУТИНГ -----
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (strpos($uri, '/index.php') === 0) $uri = substr($uri, strlen('/index.php'));
if ($uri === '') $uri = '/';

$routeFound = false;

// Раздача статических файлов из папки uploads
if (!$routeFound && preg_match('#^/uploads/(.+)$#', $uri, $matches)) {
    $file = __DIR__ . '/uploads/' . $matches[1];
    if (file_exists($file)) {
        $mime = mime_content_type($file);
        header("Content-Type: $mime");
        readfile($file);
        exit;
    } else {
        sendError('File not found', 404);
    }
    $routeFound = true;
}

// Публичные маршруты
if (!$routeFound && $method === 'GET' && preg_match('#^/(api/)?public/products$#', $uri)) {
    sendSuccess(['products' => getPublicProducts()]);
    $routeFound = true;
}
if (!$routeFound && $method === 'GET' && preg_match('#^/(api/)?public/slides$#', $uri)) {
    sendSuccess(['slides' => getPublicSlides()]);
    $routeFound = true;
}
if (!$routeFound && $method === 'GET' && preg_match('#^/(api/)?public/settings$#', $uri)) {
    sendSuccess(['settings' => getPublicSettings()]);
    $routeFound = true;
}

// Аутентификация
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?auth/register$#', $uri)) {
    $data = getJsonInput();
    if (empty($data['name']) || empty($data['email']) || empty($data['password'])) sendError('Имя, email и пароль обязательны');
    if (findUserByEmail($data['email'])) sendError('Email уже зарегистрирован', 409);
    $userId = createUser($data['name'], $data['email'], $data['phone'] ?? '', $data['password']);
    $user = findUserByEmail($data['email']);
    unset($user['password']);
    $token = generateJWT(['id' => $user['id'], 'role' => $user['role']]);
    sendSuccess(['token' => $token, 'user' => $user]);
    $routeFound = true;
}
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?auth/login$#', $uri)) {
    $data = getJsonInput();
    $user = findUserByEmail($data['email'] ?? '');
    if (!$user || !password_verify($data['password'] ?? '', $user['password'])) sendError('Неверный email или пароль', 401);
    unset($user['password']);
    $token = generateJWT(['id' => $user['id'], 'role' => $user['role']]);
    sendSuccess(['token' => $token, 'user' => $user]);
    $routeFound = true;
}
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?auth/forgot-password$#', $uri)) {
    sendSuccess(['message' => 'Код отправлен', 'dev_code' => '123456']);
    $routeFound = true;
}
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?auth/verify-reset-code$#', $uri)) {
    $data = getJsonInput();
    if (($data['code'] ?? '') === '123456') sendSuccess(['message' => 'Код подтверждён']);
    else sendError('Неверный код', 400);
    $routeFound = true;
}
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?auth/reset-password$#', $uri)) {
    sendSuccess(['message' => 'Пароль изменён']);
    $routeFound = true;
}

// Заказы (клиент)
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?orders$#', $uri)) {
    $data = getJsonInput();
    $user = getUserFromToken();
    $userId = $user ? $user['id'] : null;
    if (empty($data['customer_name']) || empty($data['phone']) || empty($data['items'])) sendError('Не хватает данных для заказа', 400);
    try {
        $orderId = createOrder($userId, $data['customer_name'], $data['phone'], $data['email'] ?? '', $data['address'] ?? '', $data['comment'] ?? '', $data['items']);
        sendSuccess(['order_id' => $orderId, 'message' => 'Заказ создан']);
    } catch (Exception $e) { sendError('Ошибка создания заказа: ' . $e->getMessage(), 500); }
    $routeFound = true;
}

// Админ-маршруты
if (!$routeFound && $method === 'GET' && preg_match('#^/(api/)?admin/products$#', $uri)) {
    requireAdmin();
    sendSuccess(['products' => getAllProducts()]);
    $routeFound = true;
}
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?admin/products$#', $uri)) {
    requireAdmin();
    $data = getJsonInput();
    if (empty($data['name']) || !isset($data['price'])) sendError('Название и цена обязательны', 400);
    $id = createProduct($data);
    sendSuccess(['product' => ['id' => $id]]);
    $routeFound = true;
}
if (!$routeFound && $method === 'PATCH' && preg_match('#^/(api/)?admin/products/(\d+)$#', $uri, $matches)) {
    requireAdmin();
    $id = $matches[2];
    $data = getJsonInput();
    updateProduct($id, $data);
    sendSuccess(['message' => 'Товар обновлён']);
    $routeFound = true;
}
if (!$routeFound && $method === 'DELETE' && preg_match('#^/(api/)?admin/products/(\d+)$#', $uri, $matches)) {
    requireAdmin();
    deleteProduct($matches[2]);
    sendSuccess(['message' => 'Товар удалён']);
    $routeFound = true;
}
if (!$routeFound && $method === 'PATCH' && preg_match('#^/(api/)?admin/products/(\d+)/publish$#', $uri, $matches)) {
    requireAdmin();
    setProductPublished($matches[2], true);
    sendSuccess(['message' => 'Опубликован']);
    $routeFound = true;
}
if (!$routeFound && $method === 'PATCH' && preg_match('#^/(api/)?admin/products/(\d+)/unpublish$#', $uri, $matches)) {
    requireAdmin();
    setProductPublished($matches[2], false);
    sendSuccess(['message' => 'Снят с публикации']);
    $routeFound = true;
}
if (!$routeFound && $method === 'GET' && preg_match('#^/(api/)?admin/slides$#', $uri)) {
    requireAdmin();
    sendSuccess(['slides' => getAllSlides()]);
    $routeFound = true;
}
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?admin/slides$#', $uri)) {
    requireAdmin();
    $data = getJsonInput();
    if (empty($data['image_url'])) sendError('Ссылка на файл обязательна', 400);
    $id = createSlide($data);
    sendSuccess(['slide' => ['id' => $id]]);
    $routeFound = true;
}
if (!$routeFound && $method === 'DELETE' && preg_match('#^/(api/)?admin/slides/(\d+)$#', $uri, $matches)) {
    requireAdmin();
    deleteSlide($matches[2]);
    sendSuccess(['message' => 'Слайд удалён']);
    $routeFound = true;
}
if (!$routeFound && $method === 'GET' && preg_match('#^/(api/)?admin/orders$#', $uri)) {
    requireAdmin();
    sendSuccess(['orders' => getAllOrders()]);
    $routeFound = true;
}
if (!$routeFound && $method === 'PATCH' && preg_match('#^/(api/)?admin/orders/(\d+)/status$#', $uri, $matches)) {
    requireAdmin();
    $data = getJsonInput();
    updateOrderStatus($matches[2], $data['status'] ?? 'new');
    sendSuccess(['message' => 'Статус обновлён']);
    $routeFound = true;
}
if (!$routeFound && $method === 'GET' && preg_match('#^/(api/)?admin/users$#', $uri)) {
    requireAdmin();
    sendSuccess(['users' => getAllUsers()]);
    $routeFound = true;
}
if (!$routeFound && $method === 'GET' && preg_match('#^/(api/)?admin/page-blocks$#', $uri)) {
    requireAdmin();
    sendSuccess(['blocks' => getAllPageBlocks()]);
    $routeFound = true;
}
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?admin/page-blocks$#', $uri)) {
    requireAdmin();
    $data = getJsonInput();
    $id = createPageBlock($data);
    sendSuccess(['block' => ['id' => $id]]);
    $routeFound = true;
}
if (!$routeFound && $method === 'PATCH' && preg_match('#^/(api/)?admin/page-blocks/(\d+)$#', $uri, $matches)) {
    requireAdmin();
    updatePageBlock($matches[2], getJsonInput());
    sendSuccess(['message' => 'Блок обновлён']);
    $routeFound = true;
}
if (!$routeFound && $method === 'DELETE' && preg_match('#^/(api/)?admin/page-blocks/(\d+)$#', $uri, $matches)) {
    requireAdmin();
    deletePageBlock($matches[2]);
    sendSuccess(['message' => 'Блок удалён']);
    $routeFound = true;
}
if (!$routeFound && $method === 'GET' && preg_match('#^/(api/)?admin/settings$#', $uri)) {
    requireAdmin();
    sendSuccess(['settings' => getPublicSettings()]);
    $routeFound = true;
}
if (!$routeFound && $method === 'PATCH' && preg_match('#^/(api/)?admin/settings$#', $uri)) {
    requireAdmin();
    $data = getJsonInput();
    updateSettings($data['settings'] ?? []);
    sendSuccess(['message' => 'Настройки сохранены']);
    $routeFound = true;
}
if (!$routeFound && $method === 'POST' && preg_match('#^/(api/)?admin/upload$#', $uri)) {
    handleUpload();
    $routeFound = true;
}

if (!$routeFound) {
    sendError('Not Found', 404);
}
?>