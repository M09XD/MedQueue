#!/usr/bin/env php
<?php

declare(strict_types=1);

$checks = [
    'PHP_VERSION' => PHP_VERSION,
    'PASSWORD_ARGON2ID' => defined('PASSWORD_ARGON2ID') ? 'yes' : 'no',
    'pdo_mysql' => extension_loaded('pdo_mysql') ? 'yes' : 'no',
    'mbstring' => extension_loaded('mbstring') ? 'yes' : 'no',
    'openssl' => extension_loaded('openssl') ? 'yes' : 'no',
];

foreach ($checks as $name => $value) {
    echo str_pad($name, 22) . ': ' . $value . PHP_EOL;
}
