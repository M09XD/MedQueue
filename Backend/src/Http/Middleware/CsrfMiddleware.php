<?php

declare(strict_types=1);

namespace MedQueue\Http\Middleware;

use MedQueue\Config\Config;
use MedQueue\Core\HttpException;
use MedQueue\Core\Request;
use MedQueue\Core\Response;

final class CsrfMiddleware
{
    public function __invoke(Request $request, callable $next): Response
    {
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        $token = $_SESSION['csrf_token'] ?? null;
        $headerName = (string) Config::get('security.csrf_header', 'X-CSRF-Token');
        $provided = $request->header($headerName);

        if (!is_string($token) || !is_string($provided) || !hash_equals($token, $provided)) {
            throw new HttpException(419, 'CSRF token validation failed.', 'csrf_failed');
        }

        return $next($request);
    }
}
