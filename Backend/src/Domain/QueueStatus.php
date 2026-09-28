<?php

declare(strict_types=1);

namespace MedQueue\Domain;

final class QueueStatus
{
    public const WAITING = 'waiting';
    public const CALLED = 'called';
    public const IN_PROGRESS = 'in_progress';
    public const COMPLETED = 'completed';
    public const CANCELLED = 'cancelled';
    public const SKIPPED = 'skipped';
    public const AUTO_SKIPPED = 'auto_skipped';

    /** @return array<int, string> */
    public static function activeStatuses(): array
    {
        return [self::WAITING, self::CALLED, self::IN_PROGRESS];
    }
}
