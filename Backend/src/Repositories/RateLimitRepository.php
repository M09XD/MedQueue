<?php

declare(strict_types=1);

namespace MedQueue\Repositories;

use MedQueue\Core\Database;

final class RateLimitRepository
{
    public function __construct(private readonly Database $db)
    {
    }

    public function hit(string $bucketKey, int $windowSeconds): int
    {
        $sql = 'INSERT INTO rate_limits (bucket_key, window_start, hits)
                VALUES (:bucket_key, UTC_TIMESTAMP(), 1)
                ON DUPLICATE KEY UPDATE
                    hits = IF(window_start <= (UTC_TIMESTAMP() - INTERVAL :window_second SECOND), 1, hits + 1),
                    window_start = IF(window_start <= (UTC_TIMESTAMP() - INTERVAL :window_second_again SECOND), UTC_TIMESTAMP(), window_start)';

        $stmt = $this->db->pdo()->prepare($sql);
        $stmt->execute([
            'bucket_key' => $bucketKey,
            'window_second' => $windowSeconds,
            'window_second_again' => $windowSeconds,
        ]);

        $readStmt = $this->db->pdo()->prepare('SELECT hits FROM rate_limits WHERE bucket_key = :bucket_key LIMIT 1');
        $readStmt->execute(['bucket_key' => $bucketKey]);
        return (int) $readStmt->fetchColumn();
    }
}
