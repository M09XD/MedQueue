<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Core\JsonResponse;
use MedQueue\Core\Request;
use MedQueue\Repositories\DoctorRepository;
use MedQueue\Repositories\SpecialtyRepository;

final class PublicController
{
    public function __construct(
        private readonly SpecialtyRepository $specialties,
        private readonly DoctorRepository $doctors,
    ) {
    }

    public function specialties(Request $request): JsonResponse
    {
        return JsonResponse::success(['specialties' => $this->specialties->list()]);
    }

    public function doctors(Request $request): JsonResponse
    {
        $specialtyId = $request->query['specialtyId'] ?? null;
        $specialtyId = $specialtyId !== null ? (int) $specialtyId : null;
        $doctors = $this->doctors->listActive($specialtyId);
        return JsonResponse::success(['doctors' => $doctors]);
    }
}
