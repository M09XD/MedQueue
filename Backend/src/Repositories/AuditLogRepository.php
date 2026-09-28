<?php

declare(strict_types=1);

namespace MedQueue\Repositories;

use MedQueue\Core\Database;

final class AuditLogRepository
{
    public function __construct(private readonly Database $db)
    {
    }

    public function record(?int $actorUserId, string $action, string $entityType, ?int $entityId = null, array $metadata = []): void
    {
        $stmt = $this->db->pdo()->prepare('INSERT INTO audit_logs
            (actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
            VALUES (:actor_user_id, :action, :entity_type, :entity_id, :metadata_json, UTC_TIMESTAMP())');

        $stmt->execute([
            'actor_user_id' => $actorUserId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'metadata_json' => json_encode($metadata, JSON_UNESCAPED_UNICODE),
        ]);
    }
}
