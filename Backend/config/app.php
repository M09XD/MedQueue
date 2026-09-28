<?php

declare(strict_types=1);

use MedQueue\Support\Env;

return [
    'name' => Env::get('APP_NAME', 'MedQueue'),
    'env' => Env::get('APP_ENV', 'local'),
    'debug' => Env::bool('APP_DEBUG', false),
    'url' => Env::get('APP_URL', 'http://localhost'),
];
