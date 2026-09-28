<?php

declare(strict_types=1);

namespace MedQueue\Infra;

interface Notifier
{
    /**
     * @param array<string, mixed> $payload
     */
    public function notifyTurn(int $patientUserId, array $payload): void;
}
