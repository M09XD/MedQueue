<?php

declare(strict_types=1);

namespace MedQueue\Http;

final class Csrf
{
    public static function token(): string
    {
        $existing = $_SESSION['_csrf'] ?? null;
        if (is_string($existing) && $existing !== '') {
            return $existing;
        }
        $token = bin2hex(random_bytes(32));
        $_SESSION['_csrf'] = $token;
        return $token;
    }

    public static function assert(Request $request): void
    {
        $sent = $request->header('x-csrf-token') ?? '';
        $expected = $_SESSION['_csrf'] ?? '';
        if (!is_string($expected) || $expected === '' || !is_string($sent) || $sent === '') {
            throw new HttpException(403, 'csrf', 'Missing or invalid CSRF token.');
        }
        if (!hash_equals($expected, $sent)) {
            throw new HttpException(403, 'csrf', 'Missing or invalid CSRF token.');
        }
    }
}
