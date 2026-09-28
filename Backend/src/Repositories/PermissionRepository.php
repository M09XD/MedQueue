<?php

declare(strict_types=1);

namespace MedQueue\Repositories;

use MedQueue\Core\Database;

final class PermissionRepository
{
    public function __construct(private readonly Database $db)
    {
    }

    public function userHasPermission(int $userId, string $permission): bool
    {
        $stmt = $this->db->pdo()->prepare('SELECT 1 FROM user_permissions WHERE user_id = :user_id AND permission = :permission LIMIT 1');
        $stmt->execute(['user_id' => $userId, 'permission' => $permission]);
        return (bool) $stmt->fetchColumn();
    }
}
