<?php
namespace Tetim\Models;

use PDO;

class Product
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAllPublished($limit = 100, $offset = 0)
    {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE is_published = 1 ORDER BY id DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        return $stmt->fetchAll();
    }

    public function getAll($limit = 100, $offset = 0)
    {
        $stmt = $this->db->prepare("SELECT * FROM products ORDER BY id DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        return $stmt->fetchAll();
    }

    public function find($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function create($data)
    {
        $stmt = $this->db->prepare("
            INSERT INTO products (external_id, article, name, category, price, sizes, stock, image_url, description, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['external_id'] ?? null,
            $data['article'] ?? null,
            $data['name'],
            $data['category'] ?? 'accessories',
            $data['price'],
            $data['sizes'] ?? '',
            $data['stock'] ?? 0,
            $data['image_url'] ?? null,
            $data['description'] ?? null,
            isset($data['is_published']) ? (int)$data['is_published'] : 0
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data)
    {
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
        $stmt = $this->db->prepare("UPDATE products SET " . implode(',', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id)
    {
        $stmt = $this->db->prepare("DELETE FROM products WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function setPublished($id, $published)
    {
        $stmt = $this->db->prepare("UPDATE products SET is_published = ? WHERE id = ?");
        return $stmt->execute([$published ? 1 : 0, $id]);
    }

    public function upsertByExternalId($data)
    {
        $existing = null;
        if (!empty($data['external_id'])) {
            $stmt = $this->db->prepare("SELECT id FROM products WHERE external_id = ?");
            $stmt->execute([$data['external_id']]);
            $existing = $stmt->fetch();
        }
        if ($existing) {
            $this->update($existing['id'], $data);
            return $existing['id'];
        } else {
            return $this->create($data);
        }
    }
}