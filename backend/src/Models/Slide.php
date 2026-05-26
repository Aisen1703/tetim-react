<?php
namespace Tetim\Models;

class Slide
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getActive()
    {
        $stmt = $this->db->prepare("SELECT * FROM slides WHERE is_active = 1 ORDER BY sort_order ASC");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getAll()
    {
        $stmt = $this->db->prepare("SELECT * FROM slides ORDER BY sort_order ASC");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function create($data)
    {
        $stmt = $this->db->prepare("
            INSERT INTO slides (title, subtitle, image_url, media_type, background_color, sort_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['title'] ?? null,
            $data['subtitle'] ?? null,
            $data['image_url'],
            $data['media_type'] ?? 'image',
            $data['background_color'] ?? '#111111',
            $data['sort_order'] ?? 0,
            isset($data['is_active']) ? (int)$data['is_active'] : 1
        ]);
        return $this->db->lastInsertId();
    }

    public function delete($id)
    {
        $stmt = $this->db->prepare("DELETE FROM slides WHERE id = ?");
        return $stmt->execute([$id]);
    }
}