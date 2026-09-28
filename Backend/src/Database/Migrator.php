<?php

declare(strict_types=1);

namespace MedQueue\Database;

use PDO;

final class Migrator
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function migrate(string $migrationsPath): void
    {
        $this->pdo->exec('CREATE TABLE IF NOT EXISTS migrations (id INT AUTO_INCREMENT PRIMARY KEY, file_name VARCHAR(191) UNIQUE NOT NULL, ran_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');

        $applied = $this->pdo->query('SELECT file_name FROM migrations')->fetchAll(PDO::FETCH_COLUMN);
        $appliedSet = array_fill_keys($applied ?: [], true);

        $files = glob(rtrim($migrationsPath, '/') . '/*.sql') ?: [];
        sort($files);

        foreach ($files as $file) {
            $name = basename($file);
            if (isset($appliedSet[$name])) {
                continue;
            }

            $sql = file_get_contents($file);
            if ($sql === false) {
                continue;
            }

            $this->pdo->beginTransaction();
            try {
                $this->pdo->exec($sql);
                $stmt = $this->pdo->prepare('INSERT INTO migrations (file_name) VALUES (:file_name)');
                $stmt->execute(['file_name' => $name]);
                $this->pdo->commit();
            } catch (\Throwable $exception) {
                $this->pdo->rollBack();
                throw $exception;
            }
        }
    }
}
