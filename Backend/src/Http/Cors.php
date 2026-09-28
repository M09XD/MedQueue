<?php

declare(strict_types=1);

namespace MedQueue\Http;

use MedQueue\Support\Env;

final class Cors
{
    public static function apply(): void
    {
        $origin = Env::get('CORS_ORIGIN', '') ?? '';
        if ($origin === '') {
            return;
        }

        $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (!is_string($requestOrigin) || $requestOrigin !== $origin) {
            return;
        }

        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, If-None-Match');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
        header('Vary: Origin');
    }

    public static function handlePreflight(): bool
    {
        if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'OPTIONS') {
            return false;
        }
        self::apply();
        http_response_code(204);
        return true;
    }
}
