<?php

declare(strict_types=1);

namespace MedQueue\Http\Middleware;

use MedQueue\Auth\SessionAuth;
use MedQueue\Core\Request;
use MedQueue\Core\Response;

final class AuthMiddleware
{
    /** @param array<int, string> $roles */
    public function __construct(private readonly array $roles)
    {
    }

    public function __invoke(Request $request, callable $next): Response
    {
        $user = SessionAuth::requireRole($this->roles);
        $_SESSION['request_user'] = $user;
        return $next($request);
    }
}
