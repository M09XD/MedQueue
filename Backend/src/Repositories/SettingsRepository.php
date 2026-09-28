<?php

declare(strict_types=1);

namespace MedQueue\Repositories;

use MedQueue\Core\Database;

final class SettingsRepository
{
    public function __construct(private readonly Database $db)
    {
    }

    public function get(string $key, mixed $default = null): mixed
    {
        $stmt = $this->db->pdo()->prepare('SELECT value_json FROM system_settings WHERE setting_key = :setting_key LIMIT 1');
        $stmt->execute(['setting_key' => $key]);
        $value = $stmt->fetchColumn();

        if ($value === false) {
            return $default;
        }

        $decoded = json_decode((string) $value, true);
        return $decoded ?? $default;
    }
}
