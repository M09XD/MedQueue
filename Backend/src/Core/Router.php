<?php

declare(strict_types=1);

namespace MedQueue\Core;

final class Router
{
    /** @var array<string, array<int, array{path:string,handler:callable,middleware:array<int,callable>}>> */
    private array $routes = [];

    public function add(string $method, string $path, callable $handler, array $middleware = []): void
    {
        $method = strtoupper($method);
        $this->routes[$method][] = [
            'path' => '/' . ltrim($path, '/'),
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }

    public function dispatch(Request $request): array
    {
        $methodRoutes = $this->routes[$request->method()] ?? [];
        $requestPath = '/' . trim($request->path(), '/');
        if ($requestPath === '//') {
            $requestPath = '/';
        }

        foreach ($methodRoutes as $route) {
            $pattern = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $route['path']);
            $regex = '#^' . $pattern . '$#';

            if (!preg_match($regex, $requestPath, $matches)) {
                continue;
            }

            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = $value;
                }
            }

            return [
                'handler' => $route['handler'],
                'middleware' => $route['middleware'],
                'params' => $params,
            ];
        }

        throw new HttpException(404, 'Route not found.', 'route_not_found');
    }
}
