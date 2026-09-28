<?php

declare(strict_types=1);

namespace MedQueue\Core;

final class RequestContext
{
    private static string $requestId = '';

    public static function setRequestId(string $id): void
    {
        self::$requestId = $id;
    }

    public static function requestId(): string
    {
        return self::$requestId;
    }
}
