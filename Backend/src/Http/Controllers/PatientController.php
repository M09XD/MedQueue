<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Core\HttpException;
use MedQueue\Core\Request;
use MedQueue\Core\Response;
use MedQueue\Services\QueueService;

final class PatientController
{
    public function queue(Request $request): Response
    {
        $user = $_SESSION['request_user'];
        $service = new QueueService();
        $tokens = $service->getPatientTokens((int) $user['id']);

        return Response::json([
            'ok' => true,
            'data' => ['tokens' => $tokens],
        ]);
    }

    public function book(Request $request): Response
    {
        $doctorId = (int) $request->input('doctor_id', 0);
        if ($doctorId < 1) {
            throw new HttpException(422, 'doctor_id is required.', 'validation_error');
        }

        $user = $_SESSION['request_user'];
        $service = new QueueService();
        $token = $service->bookToken((int) $user['id'], $doctorId, (bool) $request->input('is_emergency', false));

        return Response::json(['ok' => true, 'data' => ['token' => $token]], 201);
    }

    public function cancel(Request $request, array $params): Response
    {
        $user = $_SESSION['request_user'];
        $service = new QueueService();
        $token = $service->cancelPatientToken((int) $user['id'], (int) $params['id'], 'Cancelled by patient');

        return Response::json(['ok' => true, 'data' => ['token' => $token]]);
    }
}
