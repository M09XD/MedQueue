<?php

declare(strict_types=1);

namespace MedQueue\Core;

final class Request
{
    private ?array $jsonCache = null;

    public function __construct(
        private readonly string $method,
        private readonly string $path,
        private readonly array $query,
        private readonly array $body,
        private readonly array $server,
        private readonly array $cookies,
        private readonly array $files,
        private readonly string $rawBody
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');

        if ($basePath !== '' && $basePath !== '/' && str_starts_with($uriPath, $basePath)) {
            $uriPath = substr($uriPath, strlen($basePath));
            if ($uriPath === '') {
                $uriPath = '/';
            }
        }

        return new self(
            $method,
            $uriPath,
            $_GET,
            $_POST,
            $_SERVER,
            $_COOKIE,
            $_FILES,
            file_get_contents('php://input') ?: ''
        );
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function query(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        if (array_key_exists($key, $this->body)) {
            return $this->body[$key];
        }

        $json = $this->json();
        return $json[$key] ?? $default;
    }

    public function allInput(): array
    {
        return array_merge($this->json(), $this->body);
    }

    public function json(): array
    {
        if ($this->jsonCache !== null) {
            return $this->jsonCache;
        }

        $contentType = $this->header('CONTENT_TYPE') ?? '';
        if (!str_contains($contentType, 'application/json') || trim($this->rawBody) === '') {
            return $this->jsonCache = [];
        }

        $decoded = json_decode($this->rawBody, true);
        return $this->jsonCache = is_array($decoded) ? $decoded : [];
    }

    public function rawBody(): string
    {
        return $this->rawBody;
    }

    public function header(string $key): ?string
    {
        $normalized = strtoupper(str_replace('-', '_', $key));
        if (!str_starts_with($normalized, 'HTTP_') && !in_array($normalized, ['CONTENT_TYPE', 'CONTENT_LENGTH'], true)) {
            $normalized = 'HTTP_' . $normalized;
        }

        return $this->server[$normalized] ?? null;
    }

    public function cookie(string $key): ?string
    {
        $value = $this->cookies[$key] ?? null;
        return is_string($value) ? $value : null;
    }

    public function expectsJson(): bool
    {
        $accept = $this->header('ACCEPT') ?? '';
        return str_contains($accept, 'application/json') || str_contains($accept, '*/*');
    }

    public function ip(): string
    {
        return $this->server['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
