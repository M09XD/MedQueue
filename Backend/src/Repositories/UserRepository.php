<?php

declare(strict_types=1);

namespace MedQueue\Repositories;

use MedQueue\Core\Database;
use PDO;

final class UserRepository
{
    public function __construct(private readonly Database $db)
    {
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->pdo()->prepare('SELECT id, email, password_hash, role, status FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => mb_strtolower($email)]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->pdo()->prepare('SELECT id, email, role, status FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function createPatient(string $email, string $passwordHash, string $name, string $phone, ?string $condition): int
    {
        $pdo = $this->db->pdo();
        $pdo->beginTransaction();

        $stmtUser = $pdo->prepare('INSERT INTO users (email, password_hash, role, status, created_at, updated_at) VALUES (:email, :password_hash, :role, :status, UTC_TIMESTAMP(), UTC_TIMESTAMP())');
        $stmtUser->execute([
            'email' => mb_strtolower($email),
            'password_hash' => $passwordHash,
            'role' => 'patient',
            'status' => 'active',
        ]);

        $userId = (int) $pdo->lastInsertId();
        $patientCode = sprintf('PAT-%05d', $userId);

        $stmtPatient = $pdo->prepare('INSERT INTO patients (user_id, patient_code, full_name, phone, condition_text, joined_at, created_at, updated_at) VALUES (:user_id, :patient_code, :full_name, :phone, :condition_text, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())');
        $stmtPatient->execute([
            'user_id' => $userId,
            'patient_code' => $patientCode,
            'full_name' => $name,
            'phone' => $phone,
            'condition_text' => $condition,
        ]);

        $pdo->commit();
        return $userId;
    }

    public function patientProfile(int $userId): ?array
    {
        $stmt = $this->db->pdo()->prepare('SELECT patient_code, full_name, phone, condition_text, joined_at FROM patients WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function doctorProfile(int $userId): ?array
    {
        $sql = 'SELECT d.id AS doctor_id, d.full_name, d.room_no, d.photo_url, d.token_prefix, d.avg_wait_minutes, d.is_active, d.is_available,
                       d.work_start, d.work_end, s.name AS specialty
                FROM doctors d
                INNER JOIN specialties s ON s.id = d.specialty_id
                WHERE d.user_id = :user_id LIMIT 1';
        $stmt = $this->db->pdo()->prepare($sql);
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}
