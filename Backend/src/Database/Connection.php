<?php

declare(strict_types=1);

namespace MedQueue\Database;

use MedQueue\Config\Config;
use PDO;

final class Connection
{
    private static ?PDO $pdo = null;

    public static function get(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $host = (string) Config::require('database.host');
        $port = (int) Config::require('database.port');
        $name = (string) Config::require('database.name');
        $charset = (string) Config::require('database.charset');
        $user = (string) Config::require('database.user');
        $pass = (string) Config::get('database.pass', '');
        $options = (array) Config::get('database.options', []);

        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $name, $charset);
        self::$pdo = new PDO($dsn, $user, $pass, $options);
        return self::$pdo;
    }
}
