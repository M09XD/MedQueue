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
        return JsonResponse::success(['queue' => $this->doctors->doctorQueue($doctorId)]);
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
