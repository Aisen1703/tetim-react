<?php
namespace Tetim\Models;

use PDO;

class Order
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function create($orderData, $items)
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                INSERT INTO orders (user_id, customer_name, phone, email, address, comment, total_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
            ");
            $stmt->execute([
                $orderData['user_id'] ?? null,
                $orderData['customer_name'],
                $orderData['phone'],
                $orderData['email'] ?? null,
                $orderData['address'] ?? null,
                $orderData['comment'] ?? null,
                $orderData['total_amount']
            ]);
            $orderId = $this->db->lastInsertId();

            $stmtItem = $this->db->prepare("
                INSERT INTO order_items (order_id, product_id, product_name, price, quantity, size)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            foreach ($items as $item) {
                $stmtItem->execute([
                    $orderId,
                    $item['product_id'],
                    $item['product_name'],
                    $item['price'],
                    $item['quantity'],
                    $item['size'] ?? null
                ]);
            }
            $this->db->commit();
            return $orderId;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getByUserId($userId)
    {
        $stmt = $this->db->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function getAll($limit = 100, $offset = 0)
    {
        $stmt = $this->db->prepare("SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        return $stmt->fetchAll();
    }

    public function updateStatus($orderId, $status)
    {
        $stmt = $this->db->prepare("UPDATE orders SET status = ? WHERE id = ?");
        return $stmt->execute([$status, $orderId]);
    }
}