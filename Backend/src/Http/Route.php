<?php

declare(strict_types=1);

namespace MedQueue\Http;

final class Route
{
    public static function mutating(callable $handler): callable
    {
        return static function (Request $request) use ($handler): JsonResponse {
            Csrf::assert($request);
            $result = $handler($request);
            if (!$result instanceof JsonResponse) {
                throw new \RuntimeException('Route handler must return JsonResponse.');
            }
            return $result;
        };
    }

    public static function jsonString(array $body, string $key): string
    {
        $value = $body[$key] ?? '';
        return is_string($value) ? $value : '';
    }
}
