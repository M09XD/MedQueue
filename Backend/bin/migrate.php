<?php

declare(strict_types=1);

use MedQueue\Database\Connection;
use MedQueue\Database\Migrator;

$app = require dirname(__DIR__) . '/bootstrap.php';
unset($app);

$pdo = Connection::get();
$migrator = new Migrator($pdo);
$migrator->migrate(dirname(__DIR__) . '/database/migrations');

echo "Migrations completed successfully.\n";
