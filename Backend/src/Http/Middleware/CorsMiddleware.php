<?php

declare(strict_types=1);

namespace MedQueue\Http\Middleware;

use MedQueue\Config\Config;
use MedQueue\Core\Request;
use MedQueue\Core\Response;

final class CorsMiddleware
{
    public function __invoke(Request $request, callable $next): Response
    {
        $allowedOrigin = (string) Config::get('security.cors_allowed_origin', 'http://localhost');
        $origin = $request->header('ORIGIN') ?? '';

        $headers = [
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Allow-Methods' => 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, X-CSRF-Token, If-None-Match',
            'Vary' => 'Origin',
        ];

        if ($origin !== '' && ($allowedOrigin === '*' || $origin === $allowedOrigin)) {
            $headers['Access-Control-Allow-Origin'] = $origin;
        }

        if ($request->method() === 'OPTIONS') {
            return Response::noContent(204, $headers);
        }

        $response = $next($request);
        foreach ($headers as $name => $value) {
            $response = $response->withHeader($name, $value);
        }

        return $response;
    }
}
