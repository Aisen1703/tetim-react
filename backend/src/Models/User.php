<?php
namespace Tetim\Models;

use PDO;
use Tetim\Utils\JwtHelper;

class User
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function findByEmail($email)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch();
    }

    public function findByPhone($phone)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        return $stmt->fetch();
    }

    public function create($data)
    {
        $stmt = $this->db->prepare("
            INSERT INTO users (name, email, phone, password, role)
            VALUES (?, ?, ?, ?, ?)
        ");
        $hashed = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt->execute([
            $data['name'],
            $data['email'],
            $data['phone'] ?? null,
            $hashed,
            'user'
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data)
    {
        $fields = [];
        $params = [];
        foreach ($data as $key => $value) {
            if (in_array($key, ['name','lastname','email','phone','birthday','gender','city','street','house','flat'])) {
                $fields[] = "$key = ?";
                $params[] = $value;
            }
        }
        if (empty($fields)) return false;
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE users SET " . implode(',', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function findById($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function setResetCode($login, $code, $expires)
    {
        $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';
        $stmt = $this->db->prepare("UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE $field = ?");
        return $stmt->execute([$code, $expires, $login]);
    }

    public function findByResetCode($code)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE reset_code = ? AND reset_code_expires > NOW()");
        $stmt->execute([$code]);
        return $stmt->fetch();
    }

    public function updatePassword($userId, $password)
    {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?");
        return $stmt->execute([$hashed, $userId]);
    }

    public function getAll($limit = 100, $offset = 0)
    {
        $stmt = $this->db->prepare("SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        return $stmt->fetchAll();
    }
}