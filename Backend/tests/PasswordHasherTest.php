<?php

declare(strict_types=1);

namespace MedQueue\Tests;

use MedQueue\Auth\PasswordHasher;
use PHPUnit\Framework\TestCase;

final class PasswordHasherTest extends TestCase
{
    public function testHashAndVerifyRoundTrip(): void
    {
        $plain = 'SuperSafePassword!123';
        $hash = PasswordHasher::hash($plain);

        self::assertNotSame($plain, $hash);
        self::assertTrue(PasswordHasher::verify($plain, $hash));
        self::assertFalse(PasswordHasher::verify('wrong-password', $hash));
    }
}
