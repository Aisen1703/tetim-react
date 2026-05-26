<?php
namespace Tetim\Models;

class Setting
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAll()
    {
        $stmt = $this->db->query("SELECT key_name, value FROM settings");
        $rows = $stmt->fetchAll();
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['key_name']] = $row['value'];
        }
        return $settings;
    }

    public function set($key, $value)
    {
        $stmt = $this->db->prepare("INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?");
        return $stmt->execute([$key, $value, $value]);
    }

    public function setMultiple($data)
    {
        $success = true;
        foreach ($data as $key => $value) {
            if (!$this->set($key, $value)) $success = false;
        }
        return $success;
    }
}