<?php
namespace Tetim\Models;

class PageBlock
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getByPage($page)
    {
        $stmt = $this->db->prepare("SELECT * FROM page_blocks WHERE page = ? AND is_active = 1 ORDER BY sort_order ASC");
        $stmt->execute([$page]);
        return $stmt->fetchAll();
    }

    public function getAll()
    {
        $stmt = $this->db->prepare("SELECT * FROM page_blocks ORDER BY sort_order ASC");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function find($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM page_blocks WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function create($data)
    {
        $stmt = $this->db->prepare("
            INSERT INTO page_blocks (page, type, title, subtitle, image_url, background_color, text_color, sort_order, is_active, content_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['page'] ?? 'home',
            $data['type'],
            $data['title'] ?? null,
            $data['subtitle'] ?? null,
            $data['image_url'] ?? null,
            $data['background_color'] ?? '#ffffff',
            $data['text_color'] ?? '#111111',
            $data['sort_order'] ?? 0,
            isset($data['is_active']) ? (int)$data['is_active'] : 1,
            $data['content_json'] ?? '{}'
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data)
    {
        $fields = [];
        $params = [];
        $allowed = ['page','type','title','subtitle','image_url','background_color','text_color','sort_order','is_active','content_json'];
        foreach ($data as $key => $value) {
            if (in_array($key, $allowed)) {
                $fields[] = "$key = ?";
                $params[] = $value;
            }
        }
        if (empty($fields)) return false;
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE page_blocks SET " . implode(',', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id)
    {
        $stmt = $this->db->prepare("DELETE FROM page_blocks WHERE id = ?");
        return $stmt->execute([$id]);
    }
}