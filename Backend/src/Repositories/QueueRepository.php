<?php

declare(strict_types=1);

namespace MedQueue\Repositories;

use MedQueue\Core\Database;
use PDO;

final class QueueRepository
{
    public function __construct(private readonly Database $db)
    {
    }

    public function getActiveTokenForPatient(int $patientUserId, int $doctorId): ?array
    {
        $stmt = $this->db->pdo()->prepare('SELECT id, token_number, status, doctor_id, token_sequence, estimated_wait_minutes, created_at
                                           FROM queue_tokens
                                           WHERE patient_user_id = :patient_user_id
                                             AND doctor_id = :doctor_id
                                             AND status IN ("waiting", "called", "in_progress")
                                           LIMIT 1');
        $stmt->execute([
            'patient_user_id' => $patientUserId,
            'doctor_id' => $doctorId,
        ]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function listPatientTokens(int $patientUserId): array
    {
        $sql = 'SELECT qt.id, qt.token_number, qt.status, qt.is_emergency, qt.estimated_wait_minutes, qt.created_at, qt.called_at, qt.started_at,
                       qt.completed_at, qt.cancelled_at, qt.cancel_reason,
                       d.full_name AS doctor_name, d.room_no, s.name AS specialty_name
                FROM queue_tokens qt
                INNER JOIN doctors d ON d.id = qt.doctor_id
                INNER JOIN specialties s ON s.id = d.specialty_id
                WHERE qt.patient_user_id = :patient_user_id
                ORDER BY qt.id DESC';
        $stmt = $this->db->pdo()->prepare($sql);
        $stmt->execute(['patient_user_id' => $patientUserId]);
        return $stmt->fetchAll();
    }

    public function createToken(int $patientUserId, array $doctor, int $dailyLimit): array
    {
        $pdo = $this->db->pdo();
        $pdo->beginTransaction();

        $lockStmt = $pdo->prepare('SELECT id FROM doctors WHERE id = :id FOR UPDATE');
        $lockStmt->execute(['id' => $doctor['id']]);

        $activeStmt = $pdo->prepare('SELECT id, token_number, status, doctor_id, token_sequence, estimated_wait_minutes, created_at
                                     FROM queue_tokens
                                     WHERE patient_user_id = :patient_user_id
                                       AND doctor_id = :doctor_id
                                       AND status IN ("waiting", "called", "in_progress")
                                     LIMIT 1 FOR UPDATE');
        $activeStmt->execute([
            'patient_user_id' => $patientUserId,
            'doctor_id' => $doctor['id'],
        ]);
        $active = $activeStmt->fetch();
        if ($active) {
            $pdo->commit();
            return $active;
        }

        $nextStmt = $pdo->prepare('SELECT COALESCE(MAX(token_sequence), 0) + 1 AS next_sequence
                                   FROM queue_tokens
                                   WHERE doctor_id = :doctor_id AND queue_date = CURRENT_DATE() FOR UPDATE');
        $nextStmt->execute(['doctor_id' => $doctor['id']]);
        $nextSequence = (int) $nextStmt->fetchColumn();

        if ($nextSequence > $dailyLimit) {
            $pdo->rollBack();
            throw new \RuntimeException('DAILY_LIMIT_REACHED');
        }

        $waitingCountStmt = $pdo->prepare('SELECT COUNT(*) FROM queue_tokens WHERE doctor_id = :doctor_id AND status = "waiting"');
        $waitingCountStmt->execute(['doctor_id' => $doctor['id']]);
        $waitingCount = (int) $waitingCountStmt->fetchColumn();

        $tokenNumber = sprintf('%s%03d', $doctor['token_prefix'], $nextSequence);
        $estimated = ($waitingCount + 1) * (int) $doctor['avg_wait_minutes'];

        $insertStmt = $pdo->prepare('INSERT INTO queue_tokens
            (token_number, token_sequence, queue_date, doctor_id, patient_user_id, status, is_emergency, estimated_wait_minutes, created_at, updated_at)
            VALUES (:token_number, :token_sequence, CURRENT_DATE(), :doctor_id, :patient_user_id, "waiting", 0, :estimated_wait_minutes, UTC_TIMESTAMP(), UTC_TIMESTAMP())');
        $insertStmt->execute([
            'token_number' => $tokenNumber,
            'token_sequence' => $nextSequence,
            'doctor_id' => $doctor['id'],
            'patient_user_id' => $patientUserId,
            'estimated_wait_minutes' => $estimated,
        ]);

        $tokenId = (int) $pdo->lastInsertId();

        $fetchStmt = $pdo->prepare('SELECT id, token_number, status, doctor_id, token_sequence, estimated_wait_minutes, created_at
                                    FROM queue_tokens WHERE id = :id');
        $fetchStmt->execute(['id' => $tokenId]);
        $token = $fetchStmt->fetch();

        $pdo->commit();
        return $token;
    }

    public function cancelToken(int $tokenId, int $patientUserId, string $reason): bool
    {
        $stmt = $this->db->pdo()->prepare('UPDATE queue_tokens
            SET status = "cancelled", cancelled_at = UTC_TIMESTAMP(), cancel_reason = :reason, updated_at = UTC_TIMESTAMP()
            WHERE id = :id AND patient_user_id = :patient_user_id AND status IN ("waiting", "called")');
        $stmt->execute([
            'id' => $tokenId,
            'patient_user_id' => $patientUserId,
            'reason' => $reason,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function doctorTokenById(int $tokenId, int $doctorId): ?array
    {
        $stmt = $this->db->pdo()->prepare('SELECT * FROM queue_tokens WHERE id = :id AND doctor_id = :doctor_id LIMIT 1');
        $stmt->execute(['id' => $tokenId, 'doctor_id' => $doctorId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function updateDoctorTokenStatus(int $doctorId, int $tokenId, string $status): bool
    {
        $allowedTransitions = [
            'called' => ['waiting'],
            'in_progress' => ['called'],
            'completed' => ['in_progress'],
            'skipped' => ['called', 'in_progress'],
        ];

        if (!isset($allowedTransitions[$status])) {
            return false;
        }

        $pdo = $this->db->pdo();
        $pdo->beginTransaction();

        $lockStmt = $pdo->prepare('SELECT id FROM doctors WHERE id = :id FOR UPDATE');
        $lockStmt->execute(['id' => $doctorId]);

        $tokenStmt = $pdo->prepare('SELECT id, status FROM queue_tokens WHERE id = :id AND doctor_id = :doctor_id FOR UPDATE');
        $tokenStmt->execute(['id' => $tokenId, 'doctor_id' => $doctorId]);
        $token = $tokenStmt->fetch();

        if (!$token || !in_array($token['status'], $allowedTransitions[$status], true)) {
            $pdo->rollBack();
            return false;
        }

        if (in_array($status, ['called', 'in_progress'], true)) {
            $activeStmt = $pdo->prepare('SELECT id FROM queue_tokens WHERE doctor_id = :doctor_id AND status IN ("called", "in_progress") AND id != :token_id LIMIT 1 FOR UPDATE');
            $activeStmt->execute(['doctor_id' => $doctorId, 'token_id' => $tokenId]);
            if ($activeStmt->fetch()) {
                $pdo->rollBack();
                throw new \RuntimeException('ANOTHER_ACTIVE_PATIENT');
            }
        }

        $timeColumn = match ($status) {
            'called' => 'called_at',
            'in_progress' => 'started_at',
            'completed' => 'completed_at',
            'skipped' => 'cancelled_at',
            default => null,
        };

        $sql = 'UPDATE queue_tokens SET status = :status, updated_at = UTC_TIMESTAMP()';
        if ($timeColumn !== null) {
            $sql .= ', ' . $timeColumn . ' = UTC_TIMESTAMP()';
        }
        if ($status === 'skipped') {
            $sql .= ', cancel_reason = "No-show"';
        }
        $sql .= ' WHERE id = :id';

        $updateStmt = $pdo->prepare($sql);
        $updateStmt->execute(['status' => $status, 'id' => $tokenId]);

        $pdo->commit();
        return true;
    }

    public function autoSkipExpiredCalled(int $doctorId, int $minutes): int
    {
        $stmt = $this->db->pdo()->prepare('UPDATE queue_tokens
            SET status = "skipped", cancelled_at = UTC_TIMESTAMP(), cancel_reason = "Auto-skipped no-show", updated_at = UTC_TIMESTAMP()
            WHERE doctor_id = :doctor_id
              AND status = "called"
              AND called_at <= (UTC_TIMESTAMP() - INTERVAL :minutes MINUTE)');
        $stmt->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);
        $stmt->bindValue(':minutes', $minutes, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount();
    }
}
