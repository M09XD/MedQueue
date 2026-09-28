<?php

declare(strict_types=1);

namespace MedQueue\Security;

use MedQueue\Config\Environment;

final class SessionManager
{
    public function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $secureCookie = (bool) Environment::get('SESSION_SECURE_COOKIE', (bool) Environment::get('SESSION_SECURE', false));
        $sameSite = (string) Environment::get('SESSION_SAMESITE', 'Lax');
        $lifetime = (int) Environment::get('SESSION_LIFETIME', 7200);

        session_name((string) Environment::get('SESSION_NAME', 'medqueue_session'));
        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path' => '/',
            'domain' => '',
            'secure' => $secureCookie,
            'httponly' => true,
            'samesite' => $sameSite,
        ]);

        session_start();

        $now = time();
        if (!isset($_SESSION['last_seen'])) {
            $_SESSION['last_seen'] = $now;
        }

        if ($now - (int) $_SESSION['last_seen'] > $lifetime) {
            $this->destroy();
            session_start();
        }

        $_SESSION['last_seen'] = $now;
    }

    public function login(array $sessionUser): void
    {
        session_regenerate_id(true);
        $_SESSION['user'] = $sessionUser;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    public function user(): ?array
    {
        return $_SESSION['user'] ?? null;
    }

    public function csrfToken(): string
    {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return (string) $_SESSION['csrf_token'];
    }

    public function destroy(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
        }
        session_destroy();
    }
}
