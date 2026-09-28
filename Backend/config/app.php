<?php

declare(strict_types=1);

use MedQueue\Support\Env;

return [
    'name' => 'MedQueue',
    'env' => Env::get('APP_ENV', 'local'),
    'debug' => Env::bool('APP_DEBUG', true),
    'url' => Env::get('APP_URL', 'http://localhost/MedQueue'),
    'timezone' => Env::get('APP_TIMEZONE', 'Asia/Dhaka'),
    'queue_call_timeout_minutes' => 15,
];
