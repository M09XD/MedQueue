<?php

declare(strict_types=1);

use MedQueue\Config\Environment;

return [
    'name' => Environment::get('APP_NAME', 'MedQueue'),
    'env' => Environment::get('APP_ENV', 'local'),
    'debug' => (bool) Environment::get('APP_DEBUG', false),
    'url' => Environment::get('APP_URL', 'http://localhost'),
];
