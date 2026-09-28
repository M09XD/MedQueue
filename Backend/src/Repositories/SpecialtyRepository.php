<?php

declare(strict_types=1);

namespace MedQueue\Repositories;

use MedQueue\Core\Database;

final class SpecialtyRepository
{
    public function __construct(private readonly Database $db)
    {
    }

    public function list(): array
    {
        $stmt = $this->db->pdo()->query('SELECT id, name FROM specialties WHERE is_active = 1 ORDER BY name');
        return $stmt->fetchAll();
    }
}
