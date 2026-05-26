<?php
namespace Tetim;

use Tetim\Middleware\AuthMiddleware;

class Router
{
    private $routes = [];

    public function add($method, $path, $handler)
    {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'auth' => false
        ];
    }

    public function addWithAuth($method, $path, $handler)
    {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'auth' => true
        ];
    }

    public function dispatch($method, $uri)
    {
        $uri = parse_url($uri, PHP_URL_PATH);
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) continue;

            $pattern = '#^' . preg_replace('#\{[^/]+\}#', '([^/]+)', $route['path']) . '$#';
            if (preg_match($pattern, $uri, $matches)) {
                array_shift($matches);
                if ($route['auth']) {
                    $user = AuthMiddleware::authenticate();
                    if (!$user) {
                        http_response_code(401);
                        echo json_encode(['message' => 'Unauthorized']);
                        return;
                    }
                    // передаём пользователя в контроллер через глобальную переменную или контейнер
                    $GLOBALS['auth_user'] = $user;
                }
                $handler = $route['handler'];
                if (is_array($handler)) {
                    $controller = new $handler[0]();
                    $method = $handler[1];
                    call_user_func_array([$controller, $method], $matches);
                } else {
                    call_user_func_array($handler, $matches);
                }
                return;
            }
        }
        http_response_code(404);
        echo json_encode(['message' => 'Not Found']);
    }
}