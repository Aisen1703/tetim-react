<?php
namespace Tetim\Middleware;

use Tetim\Utils\JwtHelper;

class AuthMiddleware
{
    public static function authenticate()
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
            $decoded = JwtHelper::decode($token);
            if ($decoded && isset($decoded['id'])) {
                return $decoded;
            }
        }
        return null;
    }
}