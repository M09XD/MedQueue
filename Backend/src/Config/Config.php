<?php

declare(strict_types=1);

namespace MedQueue\Config;

use RuntimeException;

final class Config
{
    /** @var array<string, mixed> */
    private static array $config = [];

    public static function load(string $dir): void
    {
        $files = glob(rtrim($dir, '/') . '/*.php') ?: [];
        foreach ($files as $file) {
            $key = basename($file, '.php');
            $value = require $file;
            self::$config[$key] = is_array($value) ? $value : [];
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $segments = explode('.', $key);
        $value = self::$config;

        foreach ($segments as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return $default;
            }
            $value = $value[$segment];
        }

        return $value;
    }

    public static function require(string $key): mixed
    {
        $value = self::get($key);
        if ($value === null) {
            throw new RuntimeException('Missing required config value: ' . $key);
        }

        return $value;
    }
}
