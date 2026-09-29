<?php

declare(strict_types=1);

namespace MedQueue\Repositories;

use MedQueue\Core\Database;

final class DoctorRepository
{
    public function __construct(private readonly Database $db)
    {
    }

    public function listActive(?int $specialtyId = null): array
    {
        $sql = 'SELECT d.id, d.full_name, d.room_no, d.photo_url, d.token_prefix, d.avg_wait_minutes, d.is_active, d.is_available,
                       d.work_start, d.work_end, s.id AS specialty_id, s.name AS specialty_name,
                       (SELECT COUNT(*) FROM queue_tokens qt WHERE qt.doctor_id = d.id AND qt.status = "waiting") AS queue_count
                FROM doctors d
                INNER JOIN specialties s ON s.id = d.specialty_id
                WHERE d.is_active = 1';

        $params = [];
        if ($specialtyId !== null) {
            $sql .= ' AND d.specialty_id = :specialty_id';
            $params['specialty_id'] = $specialtyId;
        }

        $sql .= ' ORDER BY d.full_name';

        $stmt = $this->db->pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById(int $doctorId): ?array
    {
        $stmt = $this->db->pdo()->prepare('SELECT d.*, s.name AS specialty_name FROM doctors d INNER JOIN specialties s ON s.id = d.specialty_id WHERE d.id = :id LIMIT 1');
        $stmt->execute(['id' => $doctorId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function doctorQueue(int $doctorId): array
    {
        $stmt = $this->db->pdo()->prepare('SELECT qt.id, qt.token_number, qt.status, qt.is_emergency, qt.estimated_wait_minutes, qt.created_at, qt.called_at, qt.started_at,
                                                 p.patient_code, p.full_name AS patient_name
                                          FROM queue_tokens qt
                                          INNER JOIN patients p ON p.user_id = qt.patient_user_id
                                          WHERE qt.doctor_id = :doctor_id AND qt.status IN ("waiting", "called", "in_progress")
                                          ORDER BY qt.is_emergency DESC, qt.token_sequence ASC');
        $stmt->execute(['doctor_id' => $doctorId]);
        return $stmt->fetchAll();
    }

    public function doctorHistory(int $doctorId): array
    {
        $stmt = $this->db->pdo()->prepare('SELECT qt.id, qt.token_number, qt.status, qt.completed_at, qt.updated_at,
                                                  p.full_name AS patient_name
                                           FROM queue_tokens qt
                                           INNER JOIN patients p ON p.user_id = qt.patient_user_id
                                           WHERE qt.doctor_id = :doctor_id AND qt.status IN ("completed", "skipped")
                                           ORDER BY qt.updated_at DESC');
        $stmt->execute(['doctor_id' => $doctorId]);
        return $stmt->fetchAll();
    }

    public function markEmergency(int $doctorId, int $tokenId): bool
    {
        $stmt = $this->db->pdo()->prepare('UPDATE queue_tokens
                                           SET is_emergency = 1, updated_at = UTC_TIMESTAMP()
                                           WHERE id = :id AND doctor_id = :doctor_id AND status = "waiting"');
        $stmt->execute(['id' => $tokenId, 'doctor_id' => $doctorId]);
        return $stmt->rowCount() > 0;
    }

    public function updateAvailability(int $doctorId, bool $available, string $workStart, string $workEnd): bool
    {
        $stmt = $this->db->pdo()->prepare('UPDATE doctors
                                           SET is_available = :available, work_start = :work_start, work_end = :work_end, updated_at = UTC_TIMESTAMP()
                                           WHERE id = :id');
        $stmt->execute([
            'available' => $available ? 1 : 0,
            'work_start' => $workStart,
            'work_end' => $workEnd,
            'id' => $doctorId,
        ]);

        return $stmt->rowCount() > 0;
    }
}

