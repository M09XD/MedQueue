<?php

declare(strict_types=1);

namespace MedQueue\Auth;

final class PasswordHasher
{
    public static function hash(string $plainText): string
    {
        $algorithm = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
        return password_hash($plainText, $algorithm);
    }

    public static function verify(string $plainText, string $hash): bool
    {
        return password_verify($plainText, $hash);
    }
}
