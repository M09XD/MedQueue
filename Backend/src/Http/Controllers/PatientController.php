<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Core\JsonResponse;
use MedQueue\Core\Request;
use MedQueue\Repositories\QueueRepository;
use MedQueue\Repositories\ReportRepository;
use MedQueue\Services\QueueService;

final class PatientController
{
    public function __construct(
        private readonly QueueService $queueService,
        private readonly QueueRepository $queue,
        private readonly ReportRepository $reports,
    ) {
    }

    public function tokens(Request $request): JsonResponse
    {
        $userId = (int) $request->user['id'];
        return JsonResponse::success([
            'tokens' => $this->queue->listPatientTokens($userId),
            'reports' => $this->reports->patientReports($userId),
        ]);
    }

    public function bookToken(Request $request): JsonResponse
    {
        $doctorId = (int) ($request->input('doctorId') ?? 0);
        if ($doctorId <= 0) {
            return JsonResponse::error('VALIDATION_ERROR', 'Doctor is required.', 422);
        }

        try {
            $token = $this->queueService->bookToken((int) $request->user['id'], $doctorId);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'DOCTOR_UNAVAILABLE' => JsonResponse::error('DOCTOR_UNAVAILABLE', 'Doctor unavailable right now.', 409),
                'OUTSIDE_WORKING_HOURS' => JsonResponse::error('OUTSIDE_WORKING_HOURS', 'Doctor is outside working hours.', 409),
                'DAILY_LIMIT_REACHED' => JsonResponse::error('DAILY_LIMIT_REACHED', 'Daily token limit reached for this doctor.', 409),
                default => JsonResponse::error('BOOKING_FAILED', 'Could not book token.', 500),
            };
        }

        return JsonResponse::success(['token' => $token], status: 201);
    }

    public function cancelToken(Request $request, array $params): JsonResponse
    {
        $tokenId = (int) ($params['tokenId'] ?? 0);
        if ($tokenId <= 0) {
            return JsonResponse::error('VALIDATION_ERROR', 'Invalid token id.', 422);
        }

        $ok = $this->queueService->cancelToken((int) $request->user['id'], $tokenId);
        if (!$ok) {
            return JsonResponse::error('TOKEN_NOT_CANCELLABLE', 'Token cannot be cancelled.', 409);
        }

        return JsonResponse::success(['message' => 'Token cancelled.']);
    }
}
