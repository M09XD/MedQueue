<?php

declare(strict_types=1);

namespace MedQueue\Http;

final class HttpException extends \RuntimeException
{
    public function __construct(
        private readonly int $status,
        private readonly string $errorCode,
        string $message,
    ) {
        parent::__construct($message, $status);
    }

    public function status(): int
    {
        return $this->status;
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }

    public function toResponse(): JsonResponse
    {
        return JsonResponse::error($this->errorCode, $this->getMessage(), $this->status);
    }
}
