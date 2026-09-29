<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Core\JsonResponse;
use MedQueue\Core\Request;
use MedQueue\Repositories\DoctorRepository;
use MedQueue\Services\QueueService;

final class DoctorController
{
    public function __construct(
        private readonly DoctorRepository $doctors,
        private readonly QueueService $queueService,
    ) {
    }

    public function queue(Request $request): JsonResponse
    {
        $doctorId = (int) ($request->user['profile']['doctorId'] ?? 0);
        $doctor = $this->doctors->findById($doctorId);
        if (!$doctor) {
            return JsonResponse::error('DOCTOR_NOT_FOUND', 'Doctor profile not found.', 404);
        }

        $queue = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'number' => $row['token_number'],
            'status' => $row['status'],
            'isEmergency' => (bool) $row['is_emergency'],
            'estimatedWait' => (int) $row['estimated_wait_minutes'],
            'createdAt' => $row['created_at'],
            'calledAt' => $row['called_at'],
            'startedAt' => $row['started_at'] ?? null,
            'patientCode' => $row['patient_code'],
            'patientName' => $row['patient_name'],
        ], $this->doctors->doctorQueue($doctorId));

        return JsonResponse::success([
            'queue' => $queue,
            'availability' => [
                'available' => (bool) $doctor['is_available'],
                'workStart' => substr((string) $doctor['work_start'], 0, 5),
                'workEnd' => substr((string) $doctor['work_end'], 0, 5),
                'avgWait' => (int) $doctor['avg_wait_minutes'],
            ],
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $doctorId = (int) ($request->user['profile']['doctorId'] ?? 0);
        $rows = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'number' => $row['token_number'],
            'status' => $row['status'],
            'patientName' => $row['patient_name'],
            'completedAt' => $row['completed_at'],
            'updatedAt' => $row['updated_at'],
        ], $this->doctors->doctorHistory($doctorId));

        return JsonResponse::success(['history' => $rows]);
    }

    public function emergency(Request $request, array $params): JsonResponse
    {
        $tokenId = (int) ($params['tokenId'] ?? 0);
        if ($tokenId <= 0) {
            return JsonResponse::error('VALIDATION_ERROR', 'Invalid token id.', 422);
        }

        $doctorId = (int) ($request->user['profile']['doctorId'] ?? 0);
        $ok = $this->doctors->markEmergency($doctorId, $tokenId);
        if (!$ok) {
            return JsonResponse::error('INVALID_TRANSITION', 'Token cannot be marked emergency.', 409);
        }

        return JsonResponse::success(['message' => 'Token marked emergency.']);
    }

    public function availability(Request $request): JsonResponse
    {
        $doctorId = (int) ($request->user['profile']['doctorId'] ?? 0);

        $available = (bool) $request->input('available', true);
        $workStart = (string) $request->input('workStart', '09:00');
        $workEnd = (string) $request->input('workEnd', '17:00');

        if (!preg_match('/^\d{2}:\d{2}$/', $workStart) || !preg_match('/^\d{2}:\d{2}$/', $workEnd)) {
            return JsonResponse::error('VALIDATION_ERROR', 'Working hours must be in HH:MM format.', 422);
        }

        $ok = $this->doctors->updateAvailability($doctorId, $available, $workStart . ':00', $workEnd . ':00');
        if (!$ok) {
            return JsonResponse::error('UPDATE_FAILED', 'Could not update availability.', 500);
        }

        return JsonResponse::success(['message' => 'Availability updated.']);
    }

    public function transition(Request $request, array $params): JsonResponse
    {
        $tokenId = (int) ($params['tokenId'] ?? 0);
        $status = (string) ($request->input('status') ?? '');

        if ($tokenId <= 0 || $status === '') {
            return JsonResponse::error('VALIDATION_ERROR', 'Token and status are required.', 422);
        }

        $doctorId = (int) ($request->user['profile']['doctorId'] ?? 0);
        $doctorUserId = (int) $request->user['id'];

        $report = null;
        if ($status === 'completed') {
            $report = [
                'diagnosis' => trim((string) ($request->input('diagnosis') ?? '')),
                'prescription' => trim((string) ($request->input('prescription') ?? '')),
                'follow_up' => trim((string) ($request->input('followUp') ?? '')),
                'notes' => trim((string) ($request->input('notes') ?? '')),
            ];
            if ($report['diagnosis'] === '' || $report['prescription'] === '') {
                return JsonResponse::error('VALIDATION_ERROR', 'Diagnosis and prescription are required on completion.', 422);
            }
        }

        try {
            $ok = $this->queueService->doctorTransition($doctorId, $doctorUserId, $tokenId, $status, $report);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'ANOTHER_ACTIVE_PATIENT') {
                return JsonResponse::error('ANOTHER_ACTIVE_PATIENT', 'Another patient is already called or in progress.', 409);
            }
            return JsonResponse::error('TRANSITION_FAILED', 'Could not update token status.', 500);
        }

        if (!$ok) {
            return JsonResponse::error('INVALID_TRANSITION', 'Invalid queue transition.', 409);
        }

        return JsonResponse::success(['message' => 'Queue updated.']);
    }
}
