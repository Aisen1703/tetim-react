<?php
// Авторизация для 1С (обычно используется HTTP Basic Auth)
function check1SAuth() {
    // Задайте логин и пароль для 1С (можно из .env)
    $valid_user = '1c_exchange';
    $valid_pass = 'tetim2026';
    
    if (!isset($_SERVER['PHP_AUTH_USER']) || 
        $_SERVER['PHP_AUTH_USER'] !== $valid_user || 
        $_SERVER['PHP_AUTH_PW'] !== $valid_pass) {
        header('WWW-Authenticate: Basic realm="1C Exchange"');
        header('HTTP/1.0 401 Unauthorized');
        echo 'Authorization required';
        exit;
    }
}

// Проверка авторизации при каждом запросе
check1SAuth();

// Настройки
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'tetim');
define('DB_USER', 'tetim_user');
define('DB_PASS', 'tetim_pass123');

// Функция подключения к БД
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            die(json_encode(['error' => $e->getMessage()]));
        }
    }
    return $pdo;
}

// Функция логирования
function log1C($message) {
    $logDir = __DIR__ . '/../logs/';
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    file_put_contents($logDir . '1c_exchange.log', 
        date('Y-m-d H:i:s') . ' - ' . $message . PHP_EOL, 
        FILE_APPEND);
}

// Парсинг XML файла (обработка каталога товаров)
function parseCatalogXML($xmlPath) {
    $xml = simplexml_load_file($xmlPath);
    if (!$xml) return false;
    
    $db = getDB();
    $productsCount = 0;
    
    // Пространства имён CommerceML
    $namespaces = $xml->getNamespaces(true);
    $ns = $namespaces[''] ?? null;
    
    // Получаем все товары
    $products = $xml->xpath('//Товар');
    
    foreach ($products as $product) {
        $id = (string)$product->Ид;
        $name = (string)$product->Наименование;
        $article = (string)$product->Артикул;
        $description = (string)$product->Описание;
        
        // Категория
        $category = '';
        if ($product->Группы && $product->Группы->Группа) {
            $category = (string)$product->Группы->Группа->Ид;
        }
        
        // Цена
        $price = 0;
        if ($product->Цены && $product->Цены->Цена) {
            $price = (float)$product->Цены->Цена->ЦенаЗаЕдиницу;
        }
        
        // Остатки (из offers.xml обработаем отдельно, здесь только базовые данные)
        
        // Проверяем, существует ли товар с таким external_id
        $stmt = $db->prepare("SELECT id FROM products WHERE external_id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // Обновляем существующий товар
            $stmt = $db->prepare("UPDATE products SET 
                name = ?, article = ?, description = ?, category = ?, price = ?, 
                updated_at = NOW() WHERE external_id = ?");
            $stmt->execute([$name, $article, $description, $category, $price, $id]);
        } else {
            // Создаём новый товар
            $stmt = $db->prepare("INSERT INTO products 
                (external_id, name, article, description, category, price, is_published, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, 0, NOW())");
            $stmt->execute([$id, $name, $article, $description, $category, $price]);
        }
        $productsCount++;
    }
    
    log1C("Обработано товаров: $productsCount");
    return true;
}

// Парсинг остатков и цен (offers.xml)
function parseOffersXML($xmlPath) {
    $xml = simplexml_load_file($xmlPath);
    if (!$xml) return false;
    
    $db = getDB();
    $offersCount = 0;
    
    // Получаем все предложения
    $offers = $xml->xpath('//Предложение');
    
    foreach ($offers as $offer) {
        $productId = (string)$offer->Ид;
        $price = (float)$offer->Цены->Цена->ЦенаЗаЕдиницу;
        $quantity = (int)$offer->Количество;
        
        // Собираем остатки по размерам
        $sizes = [];
        if ($offer->Склад && $offer->Склад->Остаток) {
            // Если в 1C есть остатки по складам с характеристиками
            foreach ($offer->Склад as $stock) {
                $size = (string)$stock->Характеристика;
                $qty = (int)$stock->Остаток;
                if ($size && $qty > 0) {
                    $sizes[] = "$size:$qty";
                }
            }
        }
        
        $sizesString = implode(', ', $sizes);
        $totalStock = $quantity;
        
        // Обновляем товар
        $stmt = $db->prepare("UPDATE products SET 
            price = ?, stock = ?, sizes = ?, updated_at = NOW() 
            WHERE external_id = ?");
        $stmt->execute([$price, $totalStock, $sizesString, $productId]);
        
        // Также публикуем товар при наличии остатков
        if ($totalStock > 0) {
            $stmt = $db->prepare("UPDATE products SET is_published = 1 WHERE external_id = ?");
            $stmt->execute([$productId]);
        }
        
        $offersCount++;
    }
    
    log1C("Обработано предложений: $offersCount");
    return true;
}

// Выгрузка заказов в 1С
function exportOrdersToXML() {
    $db = getDB();
    
    // Получаем заказы, которые ещё не выгружены в 1С
    $stmt = $db->query("SELECT * FROM orders WHERE exported_to_1c = 0 AND status != 'cancelled' ORDER BY id");
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($orders)) {
        log1C("Нет новых заказов для выгрузки");
        return null;
    }
    
    // Формируем XML
    $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><КоммерческаяИнформация></КоммерческаяИнформация>');
    $xml->addAttribute('ВерсияСхемы', '2.05');
    $xml->addAttribute('ДатаФормирования', date('Y-m-d H:i:s'));
    
    $docs = $xml->addChild('Документы');
    
    foreach ($orders as $order) {
        $doc = $docs->addChild('Документ');
        $doc->addChild('Ид', $order['id']);
        $doc->addChild('Номер', $order['id']);
        $doc->addChild('Дата', date('Y-m-d', strtotime($order['created_at'])));
        $doc->addChild('ХозОперация', 'Заказ товара');
        $doc->addChild('Роль', 'Продавец');
        $doc->addChild('Валюта', 'RUB');
        $doc->addChild('Курс', '1');
        
        // Контрагент
        $contractor = $doc->addChild('Контрагенты')->addChild('Контрагент');
        $contractor->addChild('Ид', 'КЛИЕНТ_' . $order['id']);
        $contractor->addChild('Наименование', $order['customer_name']);
        if ($order['email']) $contractor->addChild('Email', $order['email']);
        if ($order['phone']) $contractor->addChild('Телефон', $order['phone']);
        if ($order['address']) $contractor->addChild('АдресРегистрации', $order['address']);
        
        // Адрес доставки
        if ($order['address']) {
            $address = $doc->addChild('АдресДоставки');
            $address->addChild('Представление', $order['address']);
        }
        
        // Комментарий
        if ($order['comment']) {
            $doc->addChild('Комментарий', $order['comment']);
        }
        
        // Товары в заказе
        $itemsStmt = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $itemsStmt->execute([$order['id']]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $table = $doc->addChild('Товары');
        $sum = 0;
        
        foreach ($items as $item) {
            $row = $table->addChild('Товар');
            $row->addChild('Ид', $item['product_id']);
            $row->addChild('Наименование', $item['product_name']);
            $row->addChild('ЦенаЗаЕдиницу', $item['price']);
            $row->addChild('Количество', $item['quantity']);
            $row->addChild('Сумма', $item['price'] * $item['quantity']);
            if ($item['size']) {
                $row->addChild('ХарактеристикаТовара', $item['size']);
            }
            $sum += $item['price'] * $item['quantity'];
        }
        
        $doc->addChild('Сумма', $sum);
        
        // Помечаем заказ как выгруженный
        $updateStmt = $db->prepare("UPDATE orders SET exported_to_1c = 1 WHERE id = ?");
        $updateStmt->execute([$order['id']]);
    }
    
    log1C("Выгружено заказов: " . count($orders));
    
    // Возвращаем XML
    return $xml->asXML();
}

// Обновление статусов заказов из 1С
function updateOrderStatusFrom1C($xmlPath) {
    $xml = simplexml_load_file($xmlPath);
    if (!$xml) return false;
    
    $db = getDB();
    $statusMap = [
        'Новый' => 'new',
        'Подтвержден' => 'processing',
        'Укомплектован' => 'done',
        'Отгружен' => 'done',
        'Отменен' => 'cancelled'
    ];
    
    $docs = $xml->xpath('//Документ');
    foreach ($docs as $doc) {
        $orderId = (int)$doc->Ид;
        $status1C = (string)$doc->Статус;
        $newStatus = $statusMap[$status1C] ?? 'new';
        
        $stmt = $db->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $stmt->execute([$newStatus, $orderId]);
    }
    
    log1C("Обновлены статусы заказов из 1С");
    return true;
}

// Основной обработчик запросов
$mode = $_GET['mode'] ?? '';
$type = $_GET['type'] ?? '';

// Протокол обмена (handshake)
if ($mode === 'checkauth') {
    // 1С проверяет доступность обмена
    header('Content-Type: text/plain; charset=utf-8');
    echo "success\n";
    echo "session_id\n";
    echo date('Y-m-d H:i:s');
    log1C("Handshake successful");
    exit;
}

// Инициализация сессии
if ($mode === 'init') {
    // 1С инициирует сессию обмена
    session_id($_GET['session_id'] ?? '');
    session_start();
    $_SESSION['zip'] = ($_GET['zip'] === 'yes');
    header('Content-Type: text/plain; charset=utf-8');
    echo "success\n";
    echo "init";
    log1C("Session initialized");
    exit;
}

// Загрузка файла от 1С
if ($mode === 'file') {
    $filename = $_GET['filename'] ?? '';
    $filepath = __DIR__ . '/../temp/' . $filename;
    
    $input = fopen('php://input', 'rb');
    $output = fopen($filepath, 'wb');
    
    while (!feof($input)) {
        fwrite($output, fread($input, 8192));
    }
    
    fclose($input);
    fclose($output);
    
    // Если файл ZIP, разворачиваем его
    if ($_SESSION['zip'] && strpos($filename, 'zip') !== false) {
        $zip = new ZipArchive();
        if ($zip->open($filepath) === true) {
            $zip->extractTo(__DIR__ . '/../temp/');
            $zip->close();
        }
    }
    
    header('Content-Type: text/plain; charset=utf-8');
    echo "success\n";
    echo $filename;
    log1C("File uploaded: $filename");
    exit;
}

// Импорт каталога
if ($mode === 'import' && $type === 'catalog') {
    $filepath = __DIR__ . '/../temp/import.xml';
    
    if (file_exists($filepath)) {
        $result = parseCatalogXML($filepath);
        if ($result) {
            echo "success\n";
            echo "Каталог товаров успешно загружен";
        } else {
            echo "failure\n";
            echo "Ошибка разбора XML";
        }
    } else {
        echo "failure\n";
        echo "Файл import.xml не найден";
    }
    log1C("Catalog import completed");
    exit;
}

// Импорт остатков и цен
if ($mode === 'import' && $type === 'offers') {
    $filepath = __DIR__ . '/../temp/offers.xml';
    
    if (file_exists($filepath)) {
        $result = parseOffersXML($filepath);
        if ($result) {
            echo "success\n";
            echo "Остатки и цены успешно загружены";
        } else {
            echo "failure\n";
            echo "Ошибка разбора XML";
        }
    } else {
        echo "failure\n";
        echo "Файл offers.xml не найден";
    }
    log1C("Offers import completed");
    exit;
}

// Выгрузка заказов
if ($mode === 'query') {
    $xml = exportOrdersToXML();
    if ($xml) {
        header('Content-Type: text/xml; charset=utf-8');
        echo $xml;
    } else {
        echo "failure\n";
        echo "Нет заказов для выгрузки";
    }
    exit;
}

// Обновление статусов
if ($mode === 'import' && $type === 'status') {
    $filepath = __DIR__ . '/../temp/status.xml';
    
    if (file_exists($filepath)) {
        $result = updateOrderStatusFrom1C($filepath);
        if ($result) {
            echo "success\n";
            echo "Статусы заказов обновлены";
        } else {
            echo "failure\n";
            echo "Ошибка разбора XML";
        }
    } else {
        echo "failure\n";
        echo "Файл status.xml не найден";
    }
    exit;
}

// Завершение сессии
if ($mode === 'complete') {
    // Очистка временных файлов
    $tempDir = __DIR__ . '/../temp/';
    if (is_dir($tempDir)) {
        array_map('unlink', glob($tempDir . '*'));
    }
    echo "success\n";
    echo "Обмен завершён";
    log1C("Exchange completed");
    exit;
}

// Если ничего не подошло
header('HTTP/1.0 404 Not Found');
echo "Not Found";