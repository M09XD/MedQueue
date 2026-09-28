<?php

declare(strict_types=1);

namespace MedQueue\Core;

use RuntimeException;

final class Container
{
    /** @var array<string, callable|object> */
    private array $bindings = [];

    /** @var array<string, object> */
    private array $instances = [];

    public function set(string $id, callable|object $resolver): void
    {
        $this->bindings[$id] = $resolver;
    }

    public function get(string $id): object
    {
        if (isset($this->instances[$id])) {
            return $this->instances[$id];
        }

        if (!isset($this->bindings[$id])) {
            throw new RuntimeException("Container binding missing: {$id}");
        }

        $binding = $this->bindings[$id];
        $instance = is_callable($binding) ? $binding() : $binding;

        if (!is_object($instance)) {
            throw new RuntimeException("Container binding for {$id} did not return object");
        }

        $this->instances[$id] = $instance;
        return $instance;
    }
}
