<?php

declare(strict_types=1);

namespace MedQueue\Core;

final class App
{
    /** @var array<int, callable> */
    private array $globalMiddleware = [];

    public function __construct(private readonly Router $router)
    {
    }

    public function addMiddleware(callable $middleware): void
    {
        $this->globalMiddleware[] = $middleware;
    }

    public function handle(Request $request): Response
    {
        $route = $this->router->dispatch($request);
        $handler = $route['handler'];
        $params = $route['params'];
        $stack = array_merge($this->globalMiddleware, $route['middleware']);

        $pipeline = array_reduce(
            array_reverse($stack),
            static fn (callable $next, callable $middleware) => static fn (Request $req): Response => $middleware($req, $next),
            static fn (Request $req): Response => $handler($req, $params)
        );

        return $pipeline($request);
    }

    public function errorResponse(int $status, string $message, array $extra = []): Response
    {
        return Response::json([
            'ok' => false,
            'error' => array_merge([
                'message' => $message,
            ], $extra),
        ], $status);
    }
}
