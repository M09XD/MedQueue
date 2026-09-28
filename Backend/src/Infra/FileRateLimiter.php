<?php

declare(strict_types=1);

namespace MedQueue\Infra;

final class FileRateLimiter
{
    public function __construct(private readonly string $directory)
    {
        if (!is_dir($this->directory)) {
            mkdir($this->directory, 0770, true);
        }
    }

    /**
     * @throws \MedQueue\Http\HttpException
     */
    public function hit(string $key, int $max, int $windowSeconds): void
    {
        $safe = hash('sha256', $key);
        $path = $this->directory . DIRECTORY_SEPARATOR . $safe . '.json';
        $now = time();
        $hits = [];

        $fh = fopen($path, 'c+');
        if ($fh === false) {
            return;
        }

        try {
            flock($fh, LOCK_EX);
            $raw = stream_get_contents($fh);
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $hits = array_values(array_filter($decoded, static fn ($t) => is_int($t) && $t > $now - $windowSeconds));
                }
            }
            if (count($hits) >= $max) {
                throw new \MedQueue\Http\HttpException(429, 'rate_limited', 'Too many requests. Try again later.');
            }
            $hits[] = $now;
            rewind($fh);
            ftruncate($fh, 0);
            fwrite($fh, json_encode($hits));
        } finally {
            flock($fh, LOCK_UN);
            fclose($fh);
        }
    }
}
