<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Core\HttpException;
use MedQueue\Core\Request;
use MedQueue\Core\Response;
use MedQueue\Database\Connection;
use PDO;

final class ReportController
{
    public function myReports(Request $request): Response
    {
        $user = $_SESSION['request_user'];
        $pdo = Connection::get();

        $stmt = $pdo->prepare(
            'SELECT r.id, r.token_id, r.diagnosis, r.prescription, r.follow_up_at, r.notes, r.created_at,
                    d.name AS doctor_name, qt.token_number
             FROM reports r
             INNER JOIN users d ON d.id = r.doctor_id
             INNER JOIN queue_tokens qt ON qt.id = r.token_id
             WHERE r.patient_id = :patient_id
             ORDER BY r.id DESC'
        );
        $stmt->execute(['patient_id' => (int) $user['id']]);

        return Response::json(['ok' => true, 'data' => ['reports' => $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []]]);
    }

    public function fullById(Request $request, array $params): Response
    {
        $user = $_SESSION['request_user'];
        if ($user['role'] !== 'admin') {
            throw new HttpException(403, 'Only admin can access this endpoint.', 'forbidden');
        }

        $pdo = Connection::get();
        $permStmt = $pdo->prepare(
            'SELECT 1
             FROM role_permissions rp
             INNER JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role = :role AND p.code = :code LIMIT 1'
        );
        $permStmt->execute(['role' => 'admin', 'code' => 'reports.read_full']);
        if (!$permStmt->fetchColumn()) {
            throw new HttpException(403, 'reports.read_full permission missing.', 'permission_missing');
        }

        $stmt = $pdo->prepare(
            'SELECT r.*, d.name AS doctor_name, p.name AS patient_name
             FROM reports r
             INNER JOIN users d ON d.id = r.doctor_id
             INNER JOIN users p ON p.id = r.patient_id
             WHERE r.id = :id LIMIT 1'
        );
        $stmt->execute(['id' => (int) $params['id']]);
        $report = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$report) {
            throw new HttpException(404, 'Report not found.', 'report_not_found');
        }

        $audit = $pdo->prepare('INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (:actor, :action, :entity_type, :entity_id, :meta_json, :created_at)');
        $audit->execute([
            'actor' => (int) $user['id'],
            'action' => 'report.read_full',
            'entity_type' => 'report',
            'entity_id' => (int) $report['id'],
            'meta_json' => json_encode(['ip' => $request->ip()], JSON_UNESCAPED_SLASHES),
            'created_at' => gmdate('Y-m-d H:i:s'),
        ]);

        return Response::json(['ok' => true, 'data' => ['report' => $report]]);
    }
}
