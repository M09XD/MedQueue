<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Core\JsonResponse;
use MedQueue\Core\Request;
use MedQueue\Repositories\PermissionRepository;
use MedQueue\Repositories\ReportRepository;
use MedQueue\Services\AnalyticsService;

final class AdminController
{
    public function __construct(
        private readonly AnalyticsService $analytics,
        private readonly ReportRepository $reports,
        private readonly PermissionRepository $permissions,
    ) {
    }

    public function analytics(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'summary' => $this->analytics->dashboardSummary(),
            'hourlyWaitTrend' => $this->analytics->hourlyWaitTrend(),
            'specialtyDistribution' => $this->analytics->specialtyDistribution(),
        ]);
    }

    public function reportMetadata(Request $request): JsonResponse
    {
        return JsonResponse::success(['reports' => $this->reports->adminReportMetadata()]);
    }

    public function reportFull(Request $request, array $params): JsonResponse
    {
        $userId = (int) $request->user['id'];

        if (!$this->permissions->userHasPermission($userId, 'reports.read_full')) {
            return JsonResponse::error('FORBIDDEN', 'You do not have permission to read full reports.', 403);
        }

        $id = (int) ($params['reportId'] ?? 0);
        if ($id <= 0) {
            return JsonResponse::error('VALIDATION_ERROR', 'Invalid report id.', 422);
        }

        $report = $this->reports->adminReadFull($id);
        if (!$report) {
            return JsonResponse::error('NOT_FOUND', 'Report not found.', 404);
        }

        return JsonResponse::success(['report' => $report]);
    }
}
