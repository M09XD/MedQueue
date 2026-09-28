<?php

declare(strict_types=1);

namespace MedQueue\Http\Middleware;

use MedQueue\Config\Config;
use MedQueue\Core\Request;
use MedQueue\Core\Response;

final class SessionMiddleware
{
    public function __invoke(Request $request, callable $next): Response
    {
        if (session_status() === PHP_SESSION_NONE) {
            $lifetimeMinutes = (int) Config::get('security.session_lifetime_min', 120);
            session_name((string) Config::get('security.session_name', 'MEDQUEUESESSID'));
            session_set_cookie_params([
                'lifetime' => $lifetimeMinutes * 60,
                'path' => '/',
                'secure' => (bool) Config::get('security.session_secure', false),
                'httponly' => true,
                'samesite' => (string) Config::get('security.session_samesite', 'Lax'),
            ]);
            session_start();
        }

        return $next($request);
    }
}
