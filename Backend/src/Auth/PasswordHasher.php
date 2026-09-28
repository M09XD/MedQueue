<?php

declare(strict_types=1);

namespace MedQueue\Auth;

final class PasswordHasher
{
    public static function hash(string $plain): string
    {
        $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
        $hash = password_hash($plain, $algo);
        if ($hash === false) {
            throw new \RuntimeException('Could not hash password.');
        }
        return $hash;
    }

    public static function verify(string $plain, string $hash): bool
    {
        return password_verify($plain, $hash);
    }
}
