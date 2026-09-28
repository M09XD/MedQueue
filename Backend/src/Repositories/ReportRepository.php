<?php

declare(strict_types=1);

namespace MedQueue\Repositories;

use MedQueue\Core\Database;

final class ReportRepository
{
    public function __construct(private readonly Database $db)
    {
    }

    public function upsertByToken(int $tokenId, int $doctorUserId, int $patientUserId, array $payload): void
    {
        $sql = 'INSERT INTO medical_reports
            (queue_token_id, doctor_user_id, patient_user_id, diagnosis, prescription, follow_up, notes, created_at, updated_at)
            VALUES (:queue_token_id, :doctor_user_id, :patient_user_id, :diagnosis, :prescription, :follow_up, :notes, UTC_TIMESTAMP(), UTC_TIMESTAMP())
            ON DUPLICATE KEY UPDATE
                diagnosis = VALUES(diagnosis),
                prescription = VALUES(prescription),
                follow_up = VALUES(follow_up),
                notes = VALUES(notes),
                updated_at = UTC_TIMESTAMP()';

        $stmt = $this->db->pdo()->prepare($sql);
        $stmt->execute([
            'queue_token_id' => $tokenId,
            'doctor_user_id' => $doctorUserId,
            'patient_user_id' => $patientUserId,
            'diagnosis' => $payload['diagnosis'],
            'prescription' => $payload['prescription'],
            'follow_up' => $payload['follow_up'] ?? null,
            'notes' => $payload['notes'] ?? null,
        ]);
    }

    public function patientReports(int $patientUserId): array
    {
        $sql = 'SELECT mr.id, mr.diagnosis, mr.prescription, mr.follow_up, mr.notes, mr.updated_at,
                       d.full_name AS doctor_name, s.name AS specialty_name
                FROM medical_reports mr
                INNER JOIN doctors d ON d.user_id = mr.doctor_user_id
                INNER JOIN specialties s ON s.id = d.specialty_id
                WHERE mr.patient_user_id = :patient_user_id
                ORDER BY mr.updated_at DESC';
        $stmt = $this->db->pdo()->prepare($sql);
        $stmt->execute(['patient_user_id' => $patientUserId]);
        return $stmt->fetchAll();
    }

    public function adminReportMetadata(): array
    {
        $sql = 'SELECT mr.id, mr.updated_at, p.patient_code, p.full_name AS patient_name, d.full_name AS doctor_name, s.name AS specialty_name
                FROM medical_reports mr
                INNER JOIN patients p ON p.user_id = mr.patient_user_id
                INNER JOIN doctors d ON d.user_id = mr.doctor_user_id
                INNER JOIN specialties s ON s.id = d.specialty_id
                ORDER BY mr.updated_at DESC';
        return $this->db->pdo()->query($sql)->fetchAll();
    }

    public function adminReadFull(int $reportId): ?array
    {
        $sql = 'SELECT mr.*, p.patient_code, p.full_name AS patient_name, d.full_name AS doctor_name, s.name AS specialty_name
                FROM medical_reports mr
                INNER JOIN patients p ON p.user_id = mr.patient_user_id
                INNER JOIN doctors d ON d.user_id = mr.doctor_user_id
                INNER JOIN specialties s ON s.id = d.specialty_id
                WHERE mr.id = :id LIMIT 1';
        $stmt = $this->db->pdo()->prepare($sql);
        $stmt->execute(['id' => $reportId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}
