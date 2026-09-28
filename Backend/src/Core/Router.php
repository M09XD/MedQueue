<?php

declare(strict_types=1);

namespace MedQueue\Core;

use Closure;

final class Router
{
    /** @var array<int, array{method:string, path:string, regex:string, handler:callable, middleware:array}> */
    private array $routes = [];

    public function __construct(private readonly Container $container)
    {
    }

    public function add(string $method, string $path, callable $handler, array $middleware = []): void
    {
        $pattern = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $path);
        $regex = '#^' . $pattern . '$#';

        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'regex' => $regex,
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }

    public function dispatch(Request $request, array $middlewareMap): Response
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }

            if (!preg_match($route['regex'], $request->path, $matches)) {
                continue;
            }

            $params = array_filter($matches, static fn ($k): bool => !is_int($k), ARRAY_FILTER_USE_KEY);

            $pipeline = array_reduce(
                array_reverse($route['middleware']),
                function (Closure $next, string $middlewareName) use ($middlewareMap): Closure {
                    return function (Request $request) use ($next, $middlewareMap, $middlewareName): Response {
                        $middleware = $middlewareMap[$middlewareName] ?? null;
                        if ($middleware === null) {
                            return JsonResponse::error('MIDDLEWARE_NOT_FOUND', 'Server middleware missing.', 500);
                        }
                        return $middleware($request, $next);
                    };
                },
                function (Request $request) use ($route, $params): Response {
                    return ($route['handler'])($request, $params);
                }
            );

            return $pipeline($request);
        }

        return JsonResponse::error('ROUTE_NOT_FOUND', 'Endpoint not found.', 404);
    }
}
