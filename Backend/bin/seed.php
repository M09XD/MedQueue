#!/usr/bin/env php
<?php

declare(strict_types=1);

$kernel = require dirname(__DIR__) . '/bootstrap.php';
$db = (new MedQueue\Core\Database())->pdo();

$files = glob(dirname(__DIR__) . '/database/seeds/*.sql');
sort($files);

foreach ($files as $file) {
    $sql = file_get_contents($file);
    if (!is_string($sql)) {
        echo "[skip] {$file}\n";
        continue;
    }

    echo "[apply] " . basename($file) . "\n";
    $db->exec($sql);
}

echo "Seeds completed.\n";
