<?php

declare(strict_types=1);

namespace MedQueue\Services;

use MedQueue\Repositories\AuditLogRepository;
use MedQueue\Repositories\DoctorRepository;
use MedQueue\Repositories\QueueRepository;
use MedQueue\Repositories\ReportRepository;
use MedQueue\Repositories\SettingsRepository;

final class QueueService
{
    public function __construct(
        private readonly QueueRepository $queue,
        private readonly DoctorRepository $doctors,
        private readonly SettingsRepository $settings,
        private readonly ReportRepository $reports,
        private readonly AuditLogRepository $audit,
    ) {
    }

    public function bookToken(int $patientUserId, int $doctorId): array
    {
        $doctor = $this->doctors->findById($doctorId);
        if (!$doctor || (int) $doctor['is_active'] !== 1 || (int) $doctor['is_available'] !== 1) {
            throw new \RuntimeException('DOCTOR_UNAVAILABLE');
        }

        $timezone = (string) ($this->settings->get('app.timezone', 'Asia/Dhaka') ?? 'Asia/Dhaka');
        $now = new \DateTimeImmutable('now', new \DateTimeZone($timezone));
        $nowTime = $now->format('H:i:s');

        if ($nowTime < $doctor['work_start'] || $nowTime > $doctor['work_end']) {
            throw new \RuntimeException('OUTSIDE_WORKING_HOURS');
        }

        $dailyLimit = (int) ($this->settings->get('queue.daily_limit', 50) ?? 50);
        $token = $this->queue->createToken($patientUserId, $doctor, $dailyLimit);

        $this->audit->record($patientUserId, 'queue.book', 'queue_token', (int) $token['id'], ['doctor_id' => $doctorId]);

        return $token;
    }

    public function cancelToken(int $patientUserId, int $tokenId): bool
    {
        $result = $this->queue->cancelToken($tokenId, $patientUserId, 'Cancelled by patient');
        if ($result) {
            $this->audit->record($patientUserId, 'queue.cancel', 'queue_token', $tokenId);
        }
        return $result;
    }

    public function doctorTransition(int $doctorId, int $doctorUserId, int $tokenId, string $status, ?array $reportPayload = null): bool
    {
        $autoCancel = (int) ($this->settings->get('queue.auto_skip_called_minutes', 15) ?? 15);
        $this->queue->autoSkipExpiredCalled($doctorId, $autoCancel);

        $success = $this->queue->updateDoctorTokenStatus($doctorId, $tokenId, $status);

        if ($success) {
            $this->audit->record($doctorUserId, 'queue.transition', 'queue_token', $tokenId, ['status' => $status]);

            if ($status === 'completed' && $reportPayload !== null) {
                $token = $this->queue->doctorTokenById($tokenId, $doctorId);
                if ($token) {
                    $this->reports->upsertByToken($tokenId, $doctorUserId, (int) $token['patient_user_id'], $reportPayload);
                    $this->audit->record($doctorUserId, 'report.upsert', 'medical_report', $tokenId);
                }
            }
        }

        return $success;
    }
}
