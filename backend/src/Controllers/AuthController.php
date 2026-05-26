<?php
namespace Tetim\Controllers;

use Tetim\Models\User;
use Tetim\Utils\JwtHelper;
use PDOException;

class AuthController extends BaseController
{
    private $userModel;

    public function __construct()
    {
        parent::__construct();
        $this->userModel = new User($this->db);
    }

    public function login()
    {
        $data = $this->getJsonInput();
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        $user = $this->userModel->findByEmail($email);
        if (!$user || !password_verify($password, $user['password'])) {
            $this->sendError('Неверный email или пароль', 401);
        }

        $token = JwtHelper::encode(['id' => $user['id'], 'role' => $user['role']]);
        unset($user['password']);
        $this->sendSuccess(['token' => $token, 'user' => $user]);
    }

    public function register()
    {
        $data = $this->getJsonInput();
        if (empty($data['email']) || empty($data['password']) || empty($data['name'])) {
            $this->sendError('Имя, email и пароль обязательны', 400);
        }
        if ($this->userModel->findByEmail($data['email'])) {
            $this->sendError('Email уже зарегистрирован', 409);
        }
        try {
            $userId = $this->userModel->create($data);
            $user = $this->userModel->findById($userId);
            $token = JwtHelper::encode(['id' => $user['id'], 'role' => $user['role']]);
            unset($user['password']);
            $this->sendSuccess(['token' => $token, 'user' => $user]);
        } catch (PDOException $e) {
            $this->sendError('Ошибка регистрации', 500);
        }
    }

    public function forgotPassword()
    {
        $data = $this->getJsonInput();
        $login = $data['login'] ?? '';
        if (!$login) {
            $this->sendError('Введите email или телефон', 400);
        }
        $user = filter_var($login, FILTER_VALIDATE_EMAIL) ? $this->userModel->findByEmail($login) : $this->userModel->findByPhone($login);
        if (!$user) {
            $this->sendSuccess(['message' => 'Если аккаунт существует, код будет отправлен', 'dev_code' => '123456']);
            return;
        }
        $code = rand(100000, 999999);
        $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $this->userModel->setResetCode($login, $code, $expires);
        $this->sendSuccess(['message' => 'Код отправлен', 'dev_code' => (string)$code]);
    }

    public function verifyResetCode()
    {
        $data = $this->getJsonInput();
        $login = $data['login'] ?? '';
        $code = $data['code'] ?? '';
        if (!$login || !$code) {
            $this->sendError('Недостаточно данных', 400);
        }
        $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';
        $stmt = $this->db->prepare("SELECT id FROM users WHERE $field = ? AND reset_code = ? AND reset_code_expires > NOW()");
        $stmt->execute([$login, $code]);
        if ($stmt->fetch()) {
            $this->sendSuccess(['message' => 'Код подтверждён']);
        } else {
            $this->sendError('Неверный или просроченный код', 400);
        }
    }

    public function resetPassword()
    {
        $data = $this->getJsonInput();
        $login = $data['login'] ?? '';
        $code = $data['code'] ?? '';
        $newPassword = $data['newPassword'] ?? '';
        if (!$login || !$code || !$newPassword) {
            $this->sendError('Заполните все поля', 400);
        }
        $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';
        $stmt = $this->db->prepare("SELECT id FROM users WHERE $field = ? AND reset_code = ? AND reset_code_expires > NOW()");
        $stmt->execute([$login, $code]);
        $user = $stmt->fetch();
        if (!$user) {
            $this->sendError('Неверный код', 400);
        }
        $this->userModel->updatePassword($user['id'], $newPassword);
        $this->sendSuccess(['message' => 'Пароль изменён']);
    }
}