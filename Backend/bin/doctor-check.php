<?php

declare(strict_types=1);

$requiredExtensions = ['pdo', 'pdo_mysql', 'mbstring', 'openssl', 'json'];
$missing = [];

foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        $missing[] = $ext;
    }
}

echo "MedQueue backend environment check\n";
echo "PHP version: " . PHP_VERSION . "\n";
echo "SAPI: " . PHP_SAPI . "\n";
echo "Argon2id available: " . (defined('PASSWORD_ARGON2ID') ? 'yes' : 'no') . "\n";

if ($missing !== []) {
    echo "Missing extensions: " . implode(', ', $missing) . "\n";
    exit(1);
}

echo "All required extensions are available.\n";
