<?php

declare(strict_types=1);

namespace MedQueue\Infra;

final class NullNotifier implements Notifier
{
    public function notifyTurn(int $patientUserId, array $payload): void
    {
        // v1: in-app polling only. Email/SMS adapters can replace this later.
    }
}
