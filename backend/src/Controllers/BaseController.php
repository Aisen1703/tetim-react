<?php
namespace Tetim\Controllers;

class BaseController
{
    protected $db;

    public function __construct()
    {
        $this->db = require __DIR__ . '/../../config/database.php';
    }

    protected function getJsonInput()
    {
        $input = file_get_contents('php://input');
        return json_decode($input, true) ?? [];
    }

    protected function sendSuccess($data, $code = 200)
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    protected function sendError($message, $code = 400)
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['message' => $message]);
        exit;
    }

    protected function getUser()
    {
        return $GLOBALS['auth_user'] ?? null;
    }

    protected function requireAdmin()
    {
        $user = $this->getUser();
        if (!$user || $user['role'] !== 'admin') {
            $this->sendError('Доступ запрещён', 403);
        }
    }
}