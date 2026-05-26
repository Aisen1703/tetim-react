<?php
namespace Tetim\Utils;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtHelper
{
    private static $secret;
    private static $expiry;

    public static function init()
    {
        self::$secret = $_ENV['JWT_SECRET'];
        self::$expiry = (int)$_ENV['JWT_EXPIRY'];
    }

    public static function encode($payload)
    {
        $issuedAt = time();
        $payload['iat'] = $issuedAt;
        $payload['exp'] = $issuedAt + self::$expiry;
        return JWT::encode($payload, self::$secret, 'HS256');
    }

    public static function decode($token)
    {
        try {
            return (array) JWT::decode($token, new Key(self::$secret, 'HS256'));
        } catch (\Exception $e) {
            return null;
        }
    }
}
JwtHelper::init();