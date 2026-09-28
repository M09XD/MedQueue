<?php

declare(strict_types=1);

namespace MedQueue\Http;

final class JsonResponse
{
    /**
     * @param array<string, mixed> $data
     */
    public function __construct(
        private readonly int $status,
        private readonly array $data,
        private readonly array $headers = [],
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function ok(array $data, int $status = 200): self
    {
        return new self($status, $data);
    }

    public static function error(string $code, string $message, int $status = 400): self
    {
        return new self($status, [
            'error' => [
                'code' => $code,
                'message' => $message,
            ],
        ]);
    }

    public function status(): int
    {
        return $this->status;
    }

    /**
     * @return array<string, mixed>
     */
    public function data(): array
    {
        return $this->data;
    }

    public function send(): void
    {
        http_response_code($this->status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }
        echo json_encode($this->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
