<?php

declare(strict_types=1);

use MedQueue\Support\Env;

$root = dirname(__DIR__);
require $root . '/vendor/autoload.php';

$envFile = is_readable($root . '/.env') ? $root . '/.env' : $root . '/.env.example';
Env::load($envFile);

$host = Env::require('DB_HOST');
$port = Env::get('DB_PORT', '3306') ?? '3306';
$db = Env::require('DB_NAME');
$user = Env::require('DB_USER');
$pass = Env::get('DB_PASS', '') ?? '';
$charset = Env::get('DB_CHARSET', 'utf8mb4') ?? 'utf8mb4';

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;charset=%s', $host, $port, $charset),
    $user,
    $pass,
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]
);

$quoted = str_replace('`', '``', $db);
$pdo->exec('CREATE DATABASE IF NOT EXISTS `' . $quoted . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$pdo->exec('USE `' . $quoted . '`');

$files = glob($root . '/migrations/*.sql') ?: [];
sort($files, SORT_STRING);

foreach ($files as $file) {
    $sql = file_get_contents($file);
    if ($sql === false) {
        fwrite(STDERR, "Could not read {$file}\n");
        exit(1);
    }
    $pdo->exec($sql);
    fwrite(STDOUT, 'Applied ' . basename($file) . PHP_EOL);
}

fwrite(STDOUT, "Migration complete.\n");
