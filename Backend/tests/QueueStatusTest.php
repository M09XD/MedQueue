<?php

declare(strict_types=1);

namespace MedQueue\Tests;

use MedQueue\Domain\QueueStatus;
use PHPUnit\Framework\TestCase;

final class QueueStatusTest extends TestCase
{
    public function testActiveStatusesAreExpected(): void
    {
        self::assertSame([
            QueueStatus::WAITING,
            QueueStatus::CALLED,
            QueueStatus::IN_PROGRESS,
        ], QueueStatus::activeStatuses());
    }
}
