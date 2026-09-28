<?php

declare(strict_types=1);

namespace MedQueue\Services;

use DateTimeImmutable;
use DateTimeZone;
use MedQueue\Config\Config;
use MedQueue\Core\HttpException;
use MedQueue\Database\Connection;
use MedQueue\Domain\QueueStatus;
use PDO;

final class QueueService
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Connection::get();
    }

    public function businessDate(): string
    {
        $timezone = new DateTimeZone((string) Config::get('app.timezone', 'Asia/Dhaka'));
        return (new DateTimeImmutable('now', $timezone))->format('Y-m-d');
    }

    public function nowUtc(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
    }

    public function autoSkipExpiredCalled(int $doctorId): void
    {
        $timeout = $this->getIntConfig('queue.auto_cancel_called_minutes', 15);
        $sql = "
            UPDATE queue_tokens
            SET status = :status,
                cancelled_at = :cancelled_at,
                cancel_reason = 'Auto-skipped: patient did not arrive after call',
                updated_at = :updated_at
            WHERE doctor_id = :doctor_id
              AND status = :called
              AND called_at IS NOT NULL
              AND TIMESTAMPDIFF(MINUTE, called_at, UTC_TIMESTAMP()) >= :timeout
        ";

        $stmt = $this->pdo->prepare($sql);
        $now = $this->nowUtc();
        $stmt->execute([
            'status' => QueueStatus::AUTO_SKIPPED,
            'cancelled_at' => $now,
            'updated_at' => $now,
            'doctor_id' => $doctorId,
            'called' => QueueStatus::CALLED,
            'timeout' => $timeout,
        ]);
    }

    public function bookToken(int $patientId, int $doctorId, bool $isEmergency = false): array
    {
        $businessDate = $this->businessDate();
        $now = $this->nowUtc();

        $this->pdo->beginTransaction();
        try {
            $doctorStmt = $this->pdo->prepare('SELECT user_id, token_prefix, room, is_active, work_start, work_end FROM doctor_profiles WHERE user_id = :id FOR UPDATE');
            $doctorStmt->execute(['id' => $doctorId]);
            $doctor = $doctorStmt->fetch(PDO::FETCH_ASSOC);
            if (!$doctor || (int) $doctor['is_active'] !== 1) {
                throw new HttpException(409, 'Doctor is currently unavailable.', 'doctor_unavailable');
            }

            $this->autoSkipExpiredCalled($doctorId);

            $existingStmt = $this->pdo->prepare(
                'SELECT * FROM queue_tokens WHERE patient_id = :patient_id AND doctor_id = :doctor_id AND status IN (\'waiting\',\'called\',\'in_progress\') ORDER BY id DESC LIMIT 1'
            );
            $existingStmt->execute(['patient_id' => $patientId, 'doctor_id' => $doctorId]);
            $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                $this->pdo->commit();
                $existing['reused'] = true;
                return $existing;
            }

            $activeStmt = $this->pdo->prepare(
                'SELECT id FROM queue_tokens WHERE patient_id = :patient_id AND status IN (\'waiting\',\'called\',\'in_progress\') LIMIT 1'
            );
            $activeStmt->execute(['patient_id' => $patientId]);
            if ($activeStmt->fetchColumn()) {
                throw new HttpException(409, 'Patient already has an active token.', 'patient_has_active_token');
            }

            $limitPerDoctor = $this->getIntConfig('queue.daily_limit_per_doctor', 50);
            $dailyCountStmt = $this->pdo->prepare('SELECT COUNT(*) FROM queue_tokens WHERE doctor_id = :doctor_id AND business_date = :business_date');
            $dailyCountStmt->execute(['doctor_id' => $doctorId, 'business_date' => $businessDate]);
            $dailyCount = (int) $dailyCountStmt->fetchColumn();
            if ($dailyCount >= $limitPerDoctor) {
                throw new HttpException(409, 'Daily doctor queue limit reached.', 'daily_limit_reached');
            }

            $maxWaiting = $this->getIntConfig('queue.max_waiting_per_doctor', 100);
            $waitingStmt = $this->pdo->prepare('SELECT COUNT(*) FROM queue_tokens WHERE doctor_id = :doctor_id AND status IN (\'waiting\', \'called\', \'in_progress\')');
            $waitingStmt->execute(['doctor_id' => $doctorId]);
            $activeQueueCount = (int) $waitingStmt->fetchColumn();
            if ($activeQueueCount >= $maxWaiting) {
                throw new HttpException(409, 'Doctor queue is full.', 'queue_full');
            }

            $sequenceStmt = $this->pdo->prepare('SELECT COALESCE(MAX(sequence_no), 0) FROM queue_tokens WHERE doctor_id = :doctor_id AND business_date = :business_date');
            $sequenceStmt->execute(['doctor_id' => $doctorId, 'business_date' => $businessDate]);
            $nextSequence = ((int) $sequenceStmt->fetchColumn()) + 1;

            $tokenNumber = strtoupper((string) $doctor['token_prefix']) . str_pad((string) $nextSequence, 3, '0', STR_PAD_LEFT);
            $tokenUid = bin2hex(random_bytes(12));

            $insertStmt = $this->pdo->prepare(
                'INSERT INTO queue_tokens (token_uid, token_number, sequence_no, business_date, doctor_id, patient_id, status, is_emergency, created_at, updated_at)
                 VALUES (:token_uid, :token_number, :sequence_no, :business_date, :doctor_id, :patient_id, :status, :is_emergency, :created_at, :updated_at)'
            );

            $insertStmt->execute([
                'token_uid' => $tokenUid,
                'token_number' => $tokenNumber,
                'sequence_no' => $nextSequence,
                'business_date' => $businessDate,
                'doctor_id' => $doctorId,
                'patient_id' => $patientId,
                'status' => QueueStatus::WAITING,
                'is_emergency' => $isEmergency ? 1 : 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $tokenId = (int) $this->pdo->lastInsertId();
            $this->pdo->commit();

            return $this->findTokenById($tokenId) ?? throw new HttpException(500, 'Unable to load created token.', 'token_create_failed');
        } catch (\Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function getPatientTokens(int $patientId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT qt.*, u.name AS doctor_name, dp.room, s.name AS specialty_name
             FROM queue_tokens qt
             INNER JOIN users u ON u.id = qt.doctor_id
             INNER JOIN doctor_profiles dp ON dp.user_id = qt.doctor_id
             INNER JOIN specialties s ON s.id = dp.specialty_id
             WHERE qt.patient_id = :patient_id
             ORDER BY qt.id DESC'
        );
        $stmt->execute(['patient_id' => $patientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function cancelPatientToken(int $patientId, int $tokenId, string $reason): array
    {
        $stmt = $this->pdo->prepare(
            'UPDATE queue_tokens
             SET status = :status, cancelled_at = :cancelled_at, cancel_reason = :cancel_reason, updated_at = :updated_at
             WHERE id = :id AND patient_id = :patient_id AND status IN (\'waiting\',\'called\')'
        );

        $now = $this->nowUtc();
        $stmt->execute([
            'status' => QueueStatus::CANCELLED,
            'cancelled_at' => $now,
            'cancel_reason' => $reason,
            'updated_at' => $now,
            'id' => $tokenId,
            'patient_id' => $patientId,
        ]);

        if ($stmt->rowCount() < 1) {
            throw new HttpException(409, 'Token cannot be cancelled in current state.', 'invalid_token_state');
        }

        return $this->findTokenById($tokenId) ?? throw new HttpException(404, 'Token not found.', 'token_not_found');
    }

    public function callNext(int $doctorId): array
    {
        $this->pdo->beginTransaction();
        try {
            $this->lockDoctor($doctorId);
            $this->autoSkipExpiredCalled($doctorId);

            $inProgressStmt = $this->pdo->prepare('SELECT id FROM queue_tokens WHERE doctor_id = :doctor_id AND status = :status LIMIT 1 FOR UPDATE');
            $inProgressStmt->execute(['doctor_id' => $doctorId, 'status' => QueueStatus::IN_PROGRESS]);
            if ($inProgressStmt->fetchColumn()) {
                throw new HttpException(409, 'Finish current in-progress patient first.', 'in_progress_exists');
            }

            $nextStmt = $this->pdo->prepare('SELECT id FROM queue_tokens WHERE doctor_id = :doctor_id AND status = :status ORDER BY is_emergency DESC, sequence_no ASC LIMIT 1 FOR UPDATE');
            $nextStmt->execute(['doctor_id' => $doctorId, 'status' => QueueStatus::WAITING]);
            $tokenId = (int) $nextStmt->fetchColumn();
            if ($tokenId < 1) {
                throw new HttpException(404, 'No waiting patients in queue.', 'queue_empty');
            }

            $now = $this->nowUtc();
            $updateStmt = $this->pdo->prepare('UPDATE queue_tokens SET status = :status, called_at = :called_at, updated_at = :updated_at WHERE id = :id');
            $updateStmt->execute(['status' => QueueStatus::CALLED, 'called_at' => $now, 'updated_at' => $now, 'id' => $tokenId]);

            $this->pdo->commit();
            return $this->findTokenById($tokenId) ?? throw new HttpException(404, 'Called token not found.', 'token_not_found');
        } catch (\Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function startCalled(int $doctorId, int $tokenId): array
    {
        return $this->transitionDoctorToken($doctorId, $tokenId, QueueStatus::CALLED, QueueStatus::IN_PROGRESS, 'started_at');
    }

    public function skipToken(int $doctorId, int $tokenId): array
    {
        return $this->transitionDoctorToken($doctorId, $tokenId, QueueStatus::CALLED, QueueStatus::SKIPPED, 'cancelled_at', 'Patient was skipped by doctor.');
    }

    public function completeToken(int $doctorId, int $tokenId, array $reportInput): array
    {
        $this->pdo->beginTransaction();
        try {
            $tokenStmt = $this->pdo->prepare('SELECT * FROM queue_tokens WHERE id = :id AND doctor_id = :doctor_id FOR UPDATE');
            $tokenStmt->execute(['id' => $tokenId, 'doctor_id' => $doctorId]);
            $token = $tokenStmt->fetch(PDO::FETCH_ASSOC);

            if (!$token) {
                throw new HttpException(404, 'Token not found.', 'token_not_found');
            }
            if ($token['status'] !== QueueStatus::IN_PROGRESS) {
                throw new HttpException(409, 'Only in-progress tokens can be completed.', 'invalid_token_state');
            }

            $diagnosis = trim((string) ($reportInput['diagnosis'] ?? ''));
            $prescription = trim((string) ($reportInput['prescription'] ?? ''));
            if ($diagnosis === '' || $prescription === '') {
                throw new HttpException(422, 'Diagnosis and prescription are required.', 'validation_error');
            }

            $insertReport = $this->pdo->prepare(
                'INSERT INTO reports (token_id, doctor_id, patient_id, diagnosis, prescription, follow_up_at, notes, created_at, updated_at)
                 VALUES (:token_id, :doctor_id, :patient_id, :diagnosis, :prescription, :follow_up_at, :notes, :created_at, :updated_at)'
            );
            $now = $this->nowUtc();
            $insertReport->execute([
                'token_id' => $tokenId,
                'doctor_id' => $doctorId,
                'patient_id' => (int) $token['patient_id'],
                'diagnosis' => $diagnosis,
                'prescription' => $prescription,
                'follow_up_at' => $reportInput['follow_up_at'] ?? null,
                'notes' => $reportInput['notes'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $reportId = (int) $this->pdo->lastInsertId();
            $completeStmt = $this->pdo->prepare(
                'UPDATE queue_tokens SET status = :status, completed_at = :completed_at, report_id = :report_id, updated_at = :updated_at WHERE id = :id'
            );
            $completeStmt->execute([
                'status' => QueueStatus::COMPLETED,
                'completed_at' => $now,
                'report_id' => $reportId,
                'updated_at' => $now,
                'id' => $tokenId,
            ]);

            $this->pdo->commit();
            return $this->findTokenById($tokenId) ?? throw new HttpException(404, 'Token not found.', 'token_not_found');
        } catch (\Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function doctorQueueView(int $doctorId): array
    {
        $this->autoSkipExpiredCalled($doctorId);

        $stmt = $this->pdo->prepare(
            'SELECT qt.*, u.name AS patient_name
             FROM queue_tokens qt
             INNER JOIN users u ON u.id = qt.patient_id
             WHERE qt.doctor_id = :doctor_id AND qt.status IN (\'waiting\', \'called\', \'in_progress\')
             ORDER BY qt.is_emergency DESC, qt.sequence_no ASC'
        );
        $stmt->execute(['doctor_id' => $doctorId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function transitionDoctorToken(int $doctorId, int $tokenId, string $from, string $to, string $timestampColumn, ?string $reason = null): array
    {
        $this->pdo->beginTransaction();
        try {
            $tokenStmt = $this->pdo->prepare('SELECT id, status FROM queue_tokens WHERE id = :id AND doctor_id = :doctor_id FOR UPDATE');
            $tokenStmt->execute(['id' => $tokenId, 'doctor_id' => $doctorId]);
            $token = $tokenStmt->fetch(PDO::FETCH_ASSOC);

            if (!$token) {
                throw new HttpException(404, 'Token not found.', 'token_not_found');
            }
            if ($token['status'] !== $from) {
                throw new HttpException(409, 'Invalid queue transition.', 'invalid_transition');
            }

            $now = $this->nowUtc();
            $sql = "UPDATE queue_tokens SET status = :status, {$timestampColumn} = :ts, updated_at = :updated_at";
            $params = ['status' => $to, 'ts' => $now, 'updated_at' => $now, 'id' => $tokenId];

            if ($reason !== null) {
                $sql .= ', cancel_reason = :reason';
                $params['reason'] = $reason;
            }
            $sql .= ' WHERE id = :id';

            $updateStmt = $this->pdo->prepare($sql);
            $updateStmt->execute($params);

            $this->pdo->commit();
            return $this->findTokenById($tokenId) ?? throw new HttpException(404, 'Token not found.', 'token_not_found');
        } catch (\Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    private function lockDoctor(int $doctorId): void
    {
        $stmt = $this->pdo->prepare('SELECT user_id FROM doctor_profiles WHERE user_id = :id FOR UPDATE');
        $stmt->execute(['id' => $doctorId]);
        if (!$stmt->fetchColumn()) {
            throw new HttpException(404, 'Doctor profile not found.', 'doctor_not_found');
        }
    }

    private function getIntConfig(string $key, int $default): int
    {
        $stmt = $this->pdo->prepare('SELECT config_value FROM app_config WHERE config_key = :key LIMIT 1');
        $stmt->execute(['key' => $key]);
        $value = $stmt->fetchColumn();
        if ($value === false || !is_numeric($value)) {
            return $default;
        }

        return (int) $value;
    }

    private function findTokenById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT qt.*, p.name AS patient_name, d.name AS doctor_name, dp.room, s.name AS specialty_name
             FROM queue_tokens qt
             INNER JOIN users p ON p.id = qt.patient_id
             INNER JOIN users d ON d.id = qt.doctor_id
             INNER JOIN doctor_profiles dp ON dp.user_id = qt.doctor_id
             INNER JOIN specialties s ON s.id = dp.specialty_id
             WHERE qt.id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
