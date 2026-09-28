<?php

declare(strict_types=1);

namespace MedQueue\Core;

class Response
{
    public function __construct(
        private readonly string $content,
        private readonly int $status = 200,
        private readonly array $headers = ['Content-Type' => 'application/json; charset=utf-8'],
    ) {
    }

    public function send(): void
    {
        http_response_code($this->status);

        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }

        echo $this->content;
    }
}
