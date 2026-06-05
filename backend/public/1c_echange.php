<?php
function check1SAuth() {
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
check1SAuth();

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'tetim');
define('DB_USER', 'tetim_user');
define('DB_PASS', 'tetim_pass123');

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

function log1C($message) {
    $logDir = __DIR__ . '/../logs/';
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    file_put_contents($logDir . '1c_exchange.log',
        date('Y-m-d H:i:s') . ' - ' . $message . PHP_EOL, FILE_APPEND);
}

function getNsUri($xml) {
    $namespaces = $xml->getNamespaces(true);
    foreach ($namespaces as $prefix => $uri) {
        if ($prefix === '' || strpos($uri, '1C.ru') !== false || strpos($uri, 'commerceml') !== false) {
            return $uri;
        }
    }
    return '';
}

function getChild($node, $ns_uri, $tag) {
    if ($ns_uri) {
        $children = $node->children($ns_uri);
        if (isset($children->$tag)) return $children->$tag;
    }
    if (isset($node->$tag)) return $node->$tag;
    return null;
}

function parseCatalogXML($xmlPath) {
    $xml = simplexml_load_file($xmlPath);
    if (!$xml) return false;
    $db = getDB();

    $ns_uri = getNsUri($xml);
    if ($ns_uri) $xml->registerXPathNamespace('cm', $ns_uri);
    $prefix = $ns_uri ? 'cm:' : '';

    $products = $xml->xpath('//' . $prefix . 'Товар');
    if (empty($products)) $products = $xml->xpath('//Товар');
    if (empty($products)) { log1C("Товары не найдены в XML"); return true; }

    $count = 0;
    foreach ($products as $product) {
        $p = $ns_uri ? $product->children($ns_uri) : $product;

        $id      = (string)($p->Ид ?? $product->Ид ?? '');
        $name    = (string)($p->Наименование ?? $product->Наименование ?? '');
        $article = (string)($p->Артикул ?? $product->Артикул ?? '');
        $desc    = (string)($p->Описание ?? $product->Описание ?? '');

        $category = '';
        $grp = $p->Группы ?? $product->Группы ?? null;
        if ($grp) {
            $g = $grp->Группа ?? null;
            if ($g) {
                $gc = $ns_uri ? $g->children($ns_uri) : $g;
                $category = (string)($gc->Ид ?? $g->Ид ?? '');
            }
        }

        $price = 0;
        $ceny = $p->Цены ?? $product->Цены ?? null;
        if ($ceny && $ceny->Цена) {
            $c = $ns_uri ? $ceny->Цена->children($ns_uri) : $ceny->Цена;
            $price = (float)($c->ЦенаЗаЕдиницу ?? $ceny->Цена->ЦенаЗаЕдиницу ?? 0);
        }

        if (!$id) continue;

        $stmt = $db->prepare("SELECT id FROM products WHERE external_id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if ($existing) {
            $stmt = $db->prepare("UPDATE products SET name=?, article=?, description=?, category=?, updated_at=NOW() WHERE external_id=?");
            $stmt->execute([$name, $article, $desc, $category, $id]);
        } else {
            $stmt = $db->prepare("INSERT INTO products (external_id, name, article, description, category, price, stock, sizes, is_published, created_at) VALUES (?,?,?,?,?,0,0,'',0,NOW())");
            $stmt->execute([$id, $name, $article, $desc, $category]);
        }
        $count++;
    }

    log1C("Каталог: обработано $count товаров");
    return true;
}

function parseOffersXML($xmlPath) {
    $xml = simplexml_load_file($xmlPath);
    if (!$xml) return false;
    $db = getDB();

    $ns_uri = getNsUri($xml);
    if ($ns_uri) $xml->registerXPathNamespace('cm', $ns_uri);
    $prefix = $ns_uri ? 'cm:' : '';

    $offers = $xml->xpath('//' . $prefix . 'Предложение');
    if (empty($offers)) $offers = $xml->xpath('//Предложение');
    if (empty($offers)) { log1C("Предложения не найдены"); return true; }

    $allowed = ['2XS','XS','S','M','L','XL','2XL','3XL','4XL','XXL','XXXL'];

    $groups = [];

    foreach ($offers as $offer) {
        $o_ns = getNsUri($offer);
        $o = $o_ns ? $offer->children($o_ns) : $offer;

        $id       = (string)($o->Ид ?? $offer->Ид ?? '');
        $quantity = (int)($o->Количество ?? $offer->Количество ?? 0);
        $name     = (string)($o->Наименование ?? $offer->Наименование ?? '');
        $price    = 0;

        $ceny = $o->Цены ?? $offer->Цены ?? null;
        if ($ceny && $ceny->Цена) {
            $c = $o_ns ? $ceny->Цена->children($o_ns) : $ceny->Цена;
            $price = (float)($c->ЦенаЗаЕдиницу ?? $ceny->Цена->ЦенаЗаЕдиницу ?? 0);
        }

        $size = '';
        if (preg_match('/\b(2XL|2XS|XXL|XL|XS|S|M|L)\b/i', $name, $mm)) {
            $size = strtoupper($mm[1]);
        } elseif (preg_match('/[,(]\s*([A-Z]+)-\d+/i', $name, $mm)) {
            $cand = strtoupper($mm[1]);
            if (in_array($cand, $allowed)) $size = $cand;
        } elseif (preg_match('/размер:\s*([A-Z]+)/iu', $name, $mm)) {
            $cand = strtoupper($mm[1]);
            if (in_array($cand, $allowed)) $size = $cand;
        }

        $base = preg_replace('/\s*[,(]\s*(?:[^,()]*?)?(?:2XL|2XS|XXL|XL|XS|S|M|L)(?:-\d+)?\s*\)?[\s,]*$/iu', '', $name);
        $base = preg_replace('/\s*\(размер:.*?\)/iu', '', $base);
        $base = trim($base, " \t\n\r\0\x0B(),");
        if (!$base) $base = $name;

        if (!isset($groups[$base])) {
            $groups[$base] = ['ids' => [], 'price' => 0, 'sizes' => [], 'stock' => 0];
        }
        if (!in_array($id, $groups[$base]['ids'])) {
            $groups[$base]['ids'][] = $id;
        }
        if ($price > 0) $groups[$base]['price'] = $price;
        $groups[$base]['stock'] += $quantity;
        if ($size && $quantity >= 0) {
            $groups[$base]['sizes'][$size] = ($groups[$base]['sizes'][$size] ?? 0) + $quantity;
        }
    }

    $updated = 0;
    foreach ($groups as $base => $data) {
        if ($data['stock'] <= 0) continue;

        $sizesStr = '';
        if (!empty($data['sizes'])) {
            $parts = [];
            foreach ($data['sizes'] as $sz => $qty) {
                if ($qty > 0) $parts[] = "$sz:$qty";
            }
            $sizesStr = implode(', ', $parts);
        }

        foreach ($data['ids'] as $eid) {
            $stmt = $db->prepare("SELECT id FROM products WHERE external_id=? LIMIT 1");
            $stmt->execute([$eid]);
            $row = $stmt->fetch();
            if ($row) {
                $stmt2 = $db->prepare("UPDATE products SET price=?, stock=?, sizes=?, updated_at=NOW() WHERE id=?");
                $stmt2->execute([$data['price'], $data['stock'], $sizesStr, $row['id']]);
                $updated++;
                break;
            }
        }
    }

    $allIds = [];
    foreach ($groups as $data) {
        if ($data['stock'] > 0) {
            foreach ($data['ids'] as $eid) $allIds[] = $eid;
        }
    }
    if (!empty($allIds)) {
        $placeholders = implode(',', array_fill(0, count($allIds), '?'));
        $db->prepare("UPDATE products SET is_published=0, stock=0 WHERE external_id NOT IN ($placeholders)")->execute($allIds);
    }

    // Снимаем с публикации товары с нулевым остатком
    $db->prepare("UPDATE products SET is_published=0 WHERE stock=0 OR stock IS NULL")->execute();

    log1C("Предложения: обработано " . count($offers) . ", групп: " . count($groups) . ", обновлено: $updated");
    return true;
}

function exportOrdersToXML() {
    $db = getDB();
    $stmt = $db->query("SELECT * FROM orders WHERE exported_to_1c=0 AND status!='cancelled' ORDER BY id");
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($orders)) { log1C("Нет новых заказов"); return null; }

    // БЕЗ xmlns — пространство имён ломает парсинг заказов в 1С УНФ
    $xmlStr = '<?xml version="1.0" encoding="UTF-8"?>'
            . '<КоммерческаяИнформация ВерсияСхемы="2.09" ДатаФормирования="'
            . date('Y-m-d') . 'T' . date('H:i:s') . '"></КоммерческаяИнформация>';
    $xml = new SimpleXMLElement($xmlStr);

    foreach ($orders as $order) {
        // <Документ> прямо в <КоммерческаяИнформация>, без обёртки <Документы>
        $doc = $xml->addChild('Документ');
        $doc->addChild('Ид', 'ЗАКАЗ-' . $order['id']);
        $doc->addChild('Номер', (string)$order['id']);
        $doc->addChild('Дата', date('Y-m-d', strtotime($order['created_at'])));
        $doc->addChild('ХозОперация', 'Заказ товара');
        $doc->addChild('Роль', 'Продавец');
        $doc->addChild('Валюта', 'RUB');
        $doc->addChild('Курс', '1');

        // Контрагент
        $kontrs = $doc->addChild('Контрагенты');
        $kontr  = $kontrs->addChild('Контрагент');
        $kontr->addChild('Ид', 'КЛИЕНТ-' . $order['id']);
        $kontr->addChild('Наименование', htmlspecialchars($order['customer_name'] ?? 'Клиент'));
        $kontr->addChild('Роль', 'Покупатель');
        $kontr->addChild('ПолноеНаименование', htmlspecialchars($order['customer_name'] ?? 'Клиент'));
        if (!empty($order['phone'])) {
            $contacts = $kontr->addChild('Контакты');
            $c = $contacts->addChild('Контакт');
            $c->addChild('Тип', 'ТелефонРабочий');
            $c->addChild('Значение', $order['phone']);
        }
        if (!empty($order['address'])) {
            $addr = $kontr->addChild('АдресРегистрации');
            $addr->addChild('Представление', htmlspecialchars($order['address']));
        }

        if (!empty($order['comment'])) {
            $doc->addChild('Комментарий', htmlspecialchars($order['comment']));
        }

        // Товары
        $itemsStmt = $db->prepare("SELECT * FROM order_items WHERE order_id=?");
        $itemsStmt->execute([$order['id']]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        $table = $doc->addChild('Товары');
        $sum   = 0;
        foreach ($items as $item) {
            $row = $table->addChild('Товар');
            $row->addChild('Ид', (string)($item['product_id'] ?? ''));
            $row->addChild('Наименование', htmlspecialchars($item['product_name'] ?? ''));
            $row->addChild('БазоваяЕдиница', 'шт');
            $row->addChild('ЦенаЗаЕдиницу', number_format((float)($item['price'] ?? 0), 2, '.', ''));
            $row->addChild('Количество',     (string)(int)($item['quantity'] ?? 1));
            $row->addChild('Сумма',          number_format((float)($item['price'] ?? 0) * (int)($item['quantity'] ?? 1), 2, '.', ''));
            if (!empty($item['size'])) {
                $xar = $row->addChild('ХарактеристикиТовара');
                $x   = $xar->addChild('ХарактеристикаТовара');
                $x->addChild('Наименование', 'Размер');
                $x->addChild('Значение', $item['size']);
            }
            $sum += (float)($item['price'] ?? 0) * (int)($item['quantity'] ?? 1);
        }

        $doc->addChild('Сумма', number_format($sum, 2, '.', ''));

        // Реквизиты
        $revs = $doc->addChild('ЗначенияРеквизитов');

        $r1 = $revs->addChild('ЗначениеРеквизита');
        $r1->addChild('Наименование', 'ПометкаУдаления');
        $r1->addChild('Значение', 'false');

        $r2 = $revs->addChild('ЗначениеРеквизита');
        $r2->addChild('Наименование', 'Проведен');
        $r2->addChild('Значение', 'false');

        $r3 = $revs->addChild('ЗначениеРеквизита');
        $r3->addChild('Наименование', 'СтатусЗаказа');
        $r3->addChild('Значение', 'Новый');

        $db->prepare("UPDATE orders SET exported_to_1c=1 WHERE id=?")->execute([$order['id']]);
    }

    log1C("Выгружено заказов: " . count($orders));

    $dom = new DOMDocument('1.0', 'UTF-8');
    $dom->preserveWhiteSpace = false;
    $dom->formatOutput = true;
    $dom->loadXML($xml->asXML());
    return $dom->saveXML();
}

function updateOrderStatusFrom1C($xmlPath) {
    $xml = simplexml_load_file($xmlPath);
    if (!$xml) return false;
    $db = getDB();
    $statusMap = [
        'Новый'        => 'new',
        'Подтвержден'  => 'processing',
        'Укомплектован'=> 'done',
        'Отгружен'     => 'done',
        'Отменен'      => 'cancelled'
    ];
    foreach ($xml->xpath('//Документ') as $doc) {
        $orderId = (int)$doc->Ид;
        $status  = $statusMap[(string)$doc->Статус] ?? 'new';
        $db->prepare("UPDATE orders SET status=? WHERE id=?")->execute([$status, $orderId]);
    }
    log1C("Статусы обновлены");
    return true;
}

// ── Роутер ──────────────────────────────────────────────────────────────────
$mode = $_GET['mode'] ?? '';
$type = $_GET['type'] ?? '';

if ($mode === 'checkauth') {
    header('Content-Type: text/plain; charset=utf-8');
    echo "success\nsession_id\n" . date('Y-m-d H:i:s');
    log1C("Handshake OK");
    exit;
}

if ($mode === 'init') {
    session_id($_GET['session_id'] ?? '');
    @session_start();
    $_SESSION['zip'] = (($_GET['zip'] ?? '') === 'yes');
    header('Content-Type: text/plain; charset=utf-8');
    echo "success\ninit";
    exit;
}

if ($mode === 'file') {
    $filename = $_GET['filename'] ?? '';
    $filepath = __DIR__ . '/../temp/' . $filename;
    $dir = dirname($filepath);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $input  = fopen('php://input', 'rb');
    $output = fopen($filepath, 'wb');
    while (!feof($input)) fwrite($output, fread($input, 8192));
    fclose($input); fclose($output);
    if (!empty($_SESSION['zip']) && strpos($filename, 'zip') !== false) {
        $zip = new ZipArchive();
        if ($zip->open($filepath) === true) { $zip->extractTo(dirname($filepath)); $zip->close(); }
    }
    header('Content-Type: text/plain; charset=utf-8');
    echo "success\n$filename";
    log1C("File: $filename");
    exit;
}

if ($mode === 'import' && $type === 'catalog') {
    $filename = $_GET['filename'] ?? 'import.xml';
    header('Content-Type: text/plain; charset=utf-8');
    if (strpos($filename, 'offers') !== false) {
        $fp = __DIR__ . '/../temp/offers.xml';
        if (file_exists($fp) && parseOffersXML($fp)) { echo "success\nОстатки загружены"; }
        else { echo "failure\noffers.xml не найден"; }
        log1C("Offers import done (via catalog type)");
    } else {
        $fp = __DIR__ . '/../temp/import.xml';
        if (file_exists($fp) && parseCatalogXML($fp)) { echo "success\nКаталог загружен"; }
        else { echo "failure\nimport.xml не найден или ошибка"; }
        log1C("Catalog import done");
    }
    exit;
}

if ($mode === 'import' && $type === 'offers') {
    $fp = __DIR__ . '/../temp/offers.xml';
    header('Content-Type: text/plain; charset=utf-8');
    if (file_exists($fp) && parseOffersXML($fp)) { echo "success\nОстатки загружены"; }
    else { echo "failure\noffers.xml не найден или ошибка"; }
    log1C("Offers import done");
    exit;
}

if ($mode === 'query') {
    $xml = exportOrdersToXML();
    if ($xml) { header('Content-Type: text/xml; charset=utf-8'); echo $xml; }
    else { header('Content-Type: text/plain; charset=utf-8'); echo "success\nНет заказов для выгрузки"; }
    exit;
}

if ($mode === 'import' && $type === 'status') {
    $fp = __DIR__ . '/../temp/status.xml';
    header('Content-Type: text/plain; charset=utf-8');
    if (file_exists($fp) && updateOrderStatusFrom1C($fp)) echo "success\nСтатусы обновлены";
    else echo "failure\nstatus.xml не найден";
    exit;
}

// Приём XML заказов от 1С (orders-*.xml)
if ($mode === 'import' && $type === 'orders') {
    $filename = $_GET['filename'] ?? '';
    header('Content-Type: text/plain; charset=utf-8');
    if ($filename) {
        $fp = __DIR__ . '/../temp/' . basename($filename);
        if (file_exists($fp)) {
            updateOrderStatusFrom1C($fp);
            log1C("Orders import done: $filename");
        } else {
            log1C("Orders import: файл не найден $filename");
        }
    }
    echo "success\norders ok";
    exit;
}

// 1С УНФ отправляет выгруженные заказы с type=sale
if ($mode === 'import' && $type === 'sale') {
    $filename = $_GET['filename'] ?? '';
    header('Content-Type: text/plain; charset=utf-8');
    if ($filename) {
        $fp = __DIR__ . '/../temp/' . basename($filename);
        if (file_exists($fp)) {
            updateOrderStatusFrom1C($fp);
            log1C("Sale import done: $filename");
        } else {
            log1C("Sale import: файл не найден $filename");
        }
    }
    echo "success\nsale ok";
    exit;
}

if ($mode === 'complete') {
    $tempDir = __DIR__ . '/../temp/';
    if (is_dir($tempDir)) array_map('unlink', glob($tempDir . '*'));
    echo "success\nОбмен завершён";
    log1C("Exchange complete");
    exit;
}

header('HTTP/1.0 404 Not Found');
echo "Not Found";