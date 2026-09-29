<?php

declare(strict_types=1);

$root = dirname(__DIR__);
require $root . '/bootstrap.php';

$db = (new MedQueue\Core\Database())->pdo();
$files = glob($root . '/database/migrations/*.sql') ?: [];
sort($files, SORT_STRING);

foreach ($files as $file) {
    $sql = file_get_contents($file);
    if ($sql === false) {
        fwrite(STDERR, "Could not read {$file}\n");
        exit(1);
    }

    $db->exec($sql);
    fwrite(STDOUT, 'Applied ' . basename($file) . PHP_EOL);
}

fwrite(STDOUT, "Migration complete.\n");
