<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Core\HttpException;
use MedQueue\Core\Request;
use MedQueue\Core\Response;
use MedQueue\Database\Connection;
use PDO;

final class AdminController
{
    public function config(Request $request): Response
    {
        $pdo = Connection::get();
        $stmt = $pdo->query('SELECT config_key, config_value FROM app_config ORDER BY config_key');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $result[$row['config_key']] = $row['config_value'];
        }

        return Response::json(['ok' => true, 'data' => ['config' => $result]]);
    }

    public function updateConfig(Request $request): Response
    {
        $updates = $request->allInput()['config'] ?? null;
        if (!is_array($updates)) {
            throw new HttpException(422, 'config object is required.', 'validation_error');
        }

        $allowed = [
            'queue.daily_limit_per_doctor',
            'queue.max_waiting_per_doctor',
            'queue.auto_cancel_called_minutes',
            'queue.emergency_mode_enabled',
        ];

        $pdo = Connection::get();
        $stmt = $pdo->prepare('INSERT INTO app_config (config_key, config_value, updated_at) VALUES (:config_key, :config_value, :updated_at) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = VALUES(updated_at)');
        $now = gmdate('Y-m-d H:i:s');

        foreach ($updates as $key => $value) {
            if (!in_array($key, $allowed, true)) {
                continue;
            }
            $stmt->execute([
                'config_key' => (string) $key,
                'config_value' => (string) $value,
                'updated_at' => $now,
            ]);
        }

        return $this->config($request);
    }

    public function setDoctorActive(Request $request, array $params): Response
    {
        $doctorId = (int) $params['id'];
        $active = (bool) $request->input('is_active', false);
        $pdo = Connection::get();

        if (!$active) {
            $activeCheck = $pdo->prepare('SELECT COUNT(*) FROM queue_tokens WHERE doctor_id = :doctor_id AND status IN (\'called\', \'in_progress\')');
            $activeCheck->execute(['doctor_id' => $doctorId]);
            if ((int) $activeCheck->fetchColumn() > 0) {
                throw new HttpException(409, 'Cannot deactivate doctor while patient is called or in progress.', 'doctor_busy');
            }

            $cancelStmt = $pdo->prepare(
                'UPDATE queue_tokens SET status = \'cancelled\', cancel_reason = \'Cancelled due to doctor deactivation\', cancelled_at = :cancelled_at, updated_at = :updated_at
                 WHERE doctor_id = :doctor_id AND status = \'waiting\''
            );
            $cancelStmt->execute([
                'cancelled_at' => gmdate('Y-m-d H:i:s'),
                'updated_at' => gmdate('Y-m-d H:i:s'),
                'doctor_id' => $doctorId,
            ]);
        }

        $updateStmt = $pdo->prepare('UPDATE doctor_profiles SET is_active = :is_active, updated_at = :updated_at WHERE user_id = :user_id');
        $updateStmt->execute([
            'is_active' => $active ? 1 : 0,
            'updated_at' => gmdate('Y-m-d H:i:s'),
            'user_id' => $doctorId,
        ]);

        return Response::json(['ok' => true, 'data' => ['doctor_id' => $doctorId, 'is_active' => $active]]);
    }
}
