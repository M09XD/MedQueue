<?php

declare(strict_types=1);

namespace MedQueue\Services;

use MedQueue\Core\Database;

final class AnalyticsService
{
    public function __construct(private readonly Database $db)
    {
    }

    public function dashboardSummary(): array
    {
        $pdo = $this->db->pdo();

        $todayPatients = (int) $pdo->query('SELECT COUNT(DISTINCT patient_user_id) FROM queue_tokens WHERE queue_date = CURRENT_DATE()')->fetchColumn();
        $tokens = (int) $pdo->query('SELECT COUNT(*) FROM queue_tokens WHERE queue_date = CURRENT_DATE()')->fetchColumn();
        $activeDoctors = (int) $pdo->query('SELECT COUNT(*) FROM doctors WHERE is_active = 1 AND is_available = 1')->fetchColumn();

        $waitSql = 'SELECT AVG(TIMESTAMPDIFF(MINUTE, called_at, completed_at))
                    FROM queue_tokens
                    WHERE status = "completed"
                      AND completed_at IS NOT NULL
                      AND called_at IS NOT NULL
                      AND completed_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)';
        $avgWait = $pdo->query($waitSql)->fetchColumn();

        return [
            'todayPatients' => $todayPatients,
            'tokensGenerated' => $tokens,
            'activeDoctors' => $activeDoctors,
            'avgWaitMinutes' => $avgWait !== null ? round((float) $avgWait, 1) : null,
        ];
    }

    public function hourlyWaitTrend(): array
    {
        $sql = 'SELECT DATE_FORMAT(CONVERT_TZ(completed_at, "+00:00", "+06:00"), "%H:00") AS hour_slot,
                       AVG(TIMESTAMPDIFF(MINUTE, called_at, completed_at)) AS avg_wait
                FROM queue_tokens
                WHERE status = "completed"
                  AND completed_at IS NOT NULL
                  AND called_at IS NOT NULL
                  AND completed_at >= (UTC_TIMESTAMP() - INTERVAL 1 DAY)
                GROUP BY hour_slot
                ORDER BY hour_slot';

        return $this->db->pdo()->query($sql)->fetchAll();
    }

    public function specialtyDistribution(): array
    {
        $sql = 'SELECT s.name, COUNT(*) AS total
                FROM queue_tokens qt
                INNER JOIN doctors d ON d.id = qt.doctor_id
                INNER JOIN specialties s ON s.id = d.specialty_id
                WHERE qt.queue_date >= (CURRENT_DATE() - INTERVAL 30 DAY)
                GROUP BY s.id
                ORDER BY total DESC';

        return $this->db->pdo()->query($sql)->fetchAll();
    }
}
