<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Core\Request;
use MedQueue\Core\Response;
use MedQueue\Database\Connection;
use MedQueue\Services\QueueService;
use PDO;

final class DoctorController
{
    public function index(Request $request): Response
    {
        $pdo = Connection::get();

        $stmt = $pdo->query(
            'SELECT u.id, u.name, u.email, dp.room, dp.photo_url, dp.work_start, dp.work_end, dp.is_active,
                    s.id AS specialty_id, s.name AS specialty_name
             FROM doctor_profiles dp
             INNER JOIN users u ON u.id = dp.user_id
             INNER JOIN specialties s ON s.id = dp.specialty_id
             ORDER BY u.name ASC'
        );

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $etag = 'W/"' . sha1((string) json_encode($rows)) . '"';

        if (($request->header('IF_NONE_MATCH') ?? '') === $etag) {
            return Response::noContent(304, ['ETag' => $etag]);
        }

        return Response::json(['ok' => true, 'data' => ['doctors' => $rows]], 200, ['ETag' => $etag]);
    }

    public function queue(Request $request): Response
    {
        $user = $_SESSION['request_user'];
        $service = new QueueService();
        $items = $service->doctorQueueView((int) $user['id']);

        return Response::json(['ok' => true, 'data' => ['queue' => $items]]);
    }

    public function callNext(Request $request): Response
    {
        $user = $_SESSION['request_user'];
        $service = new QueueService();
        $token = $service->callNext((int) $user['id']);
        return Response::json(['ok' => true, 'data' => ['token' => $token]]);
    }

    public function start(Request $request, array $params): Response
    {
        $user = $_SESSION['request_user'];
        $service = new QueueService();
        $token = $service->startCalled((int) $user['id'], (int) $params['id']);
        return Response::json(['ok' => true, 'data' => ['token' => $token]]);
    }

    public function skip(Request $request, array $params): Response
    {
        $user = $_SESSION['request_user'];
        $service = new QueueService();
        $token = $service->skipToken((int) $user['id'], (int) $params['id']);
        return Response::json(['ok' => true, 'data' => ['token' => $token]]);
    }

    public function complete(Request $request, array $params): Response
    {
        $user = $_SESSION['request_user'];
        $service = new QueueService();
        $token = $service->completeToken((int) $user['id'], (int) $params['id'], $request->allInput());
        return Response::json(['ok' => true, 'data' => ['token' => $token]]);
    }
}
