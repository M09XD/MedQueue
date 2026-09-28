<?php

declare(strict_types=1);

namespace MedQueue\Auth;

use MedQueue\Core\HttpException;
use MedQueue\Database\Connection;
use PDO;

final class SessionAuth
{
    private const SESSION_KEY = 'medqueue_auth';

    public static function login(array $user): void
    {
        $_SESSION[self::SESSION_KEY] = [
            'id' => (int) $user['id'],
            'role' => (string) $user['role'],
        ];
    }

    public static function logout(): void
    {
        unset($_SESSION[self::SESSION_KEY]);
        session_regenerate_id(true);
    }

    public static function user(): ?array
    {
        $auth = $_SESSION[self::SESSION_KEY] ?? null;
        if (!is_array($auth) || !isset($auth['id'])) {
            return null;
        }

        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT id, role, name, email, phone, is_active, created_at FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => (int) $auth['id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || (int) $user['is_active'] !== 1) {
            self::logout();
            return null;
        }

        return [
            'id' => (int) $user['id'],
            'role' => (string) $user['role'],
            'name' => (string) $user['name'],
            'email' => (string) $user['email'],
            'phone' => $user['phone'] !== null ? (string) $user['phone'] : null,
            'created_at' => (string) $user['created_at'],
        ];
    }

    /** @param array<int, string> $roles */
    public static function requireRole(array $roles): array
    {
        $user = self::user();
        if ($user === null) {
            throw new HttpException(401, 'Authentication required.', 'auth_required');
        }

        if (!in_array($user['role'], $roles, true)) {
            throw new HttpException(403, 'You are not authorized for this action.', 'forbidden');
        }

        return $user;
    }
}
