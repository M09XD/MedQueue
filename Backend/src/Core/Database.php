<?php

declare(strict_types=1);

namespace MedQueue\Core;

use MedQueue\Config\Environment;
use PDO;
use PDOException;
use RuntimeException;

final class Database
{
    private PDO $pdo;

    public function __construct()
    {
        $host = (string) Environment::get('DB_HOST', '127.0.0.1');
        $port = (string) Environment::get('DB_PORT', '3306');
        $name = (string) Environment::get('DB_NAME', 'medqueue');
        $user = (string) Environment::get('DB_USER', 'root');
        $pass = (string) Environment::get('DB_PASSWORD', '');

        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        try {
            $this->pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            throw new RuntimeException('Database connection failed.');
        }
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }
}
