<?php

declare(strict_types=1);

namespace MedQueue\Core;

final class JsonResponse extends Response
{
    public static function success(array $data = [], array $meta = [], int $status = 200): self
    {
        return new self(json_encode([
            'success' => true,
            'data' => $data,
            'meta' => $meta,
            'requestId' => RequestContext::requestId(),
        ], JSON_UNESCAPED_UNICODE), $status);
    }

    public static function error(string $code, string $message, int $status): self
    {
        return new self(json_encode([
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
            ],
            'requestId' => RequestContext::requestId(),
        ], JSON_UNESCAPED_UNICODE), $status);
    }
}
