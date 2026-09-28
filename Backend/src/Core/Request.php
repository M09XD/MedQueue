<?php

declare(strict_types=1);

namespace MedQueue\Core;

final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $headers,
        public readonly array $cookies,
        public readonly array $server,
        public readonly ?array $user = null,
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $headers = function_exists('getallheaders') ? getallheaders() : [];

        $body = [];
        $raw = file_get_contents('php://input');
        if (is_string($raw) && trim($raw) !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $body = $decoded;
            }
        }

        if ($body === [] && !empty($_POST)) {
            $body = $_POST;
        }

        return new self($method, $path, $_GET, $body, $headers ?: [], $_COOKIE, $_SERVER);
    }

    public function withUser(array $user): self
    {
        return new self(
            $this->method,
            $this->path,
            $this->query,
            $this->body,
            $this->headers,
            $this->cookies,
            $this->server,
            $user,
        );
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function header(string $name, ?string $default = null): ?string
    {
        foreach ($this->headers as $k => $v) {
            if (strtolower($k) === strtolower($name)) {
                return is_array($v) ? implode(', ', $v) : (string) $v;
            }
        }

        return $default;
    }
}
