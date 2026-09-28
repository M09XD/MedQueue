<?php

declare(strict_types=1);

namespace MedQueue\Core;

use JsonException;

final class Response
{
    /** @param array<string, string> $headers */
    public function __construct(
        private string $body,
        private int $status = 200,
        private array $headers = ['Content-Type' => 'application/json; charset=utf-8']
    ) {
    }

    public static function json(array $payload, int $status = 200, array $headers = []): self
    {
        try {
            $body = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (JsonException) {
            $body = '{"ok":false,"error":{"message":"JSON encoding failed."}}';
            $status = 500;
        }

        return new self($body, $status, array_merge(['Content-Type' => 'application/json; charset=utf-8'], $headers));
    }

    public static function noContent(int $status = 204, array $headers = []): self
    {
        return new self('', $status, $headers);
    }

    public function withHeader(string $name, string $value): self
    {
        $clone = clone $this;
        $clone->headers[$name] = $value;
        return $clone;
    }

    public function send(): void
    {
        http_response_code($this->status);
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }
        echo $this->body;
    }
}
