<?php

declare(strict_types=1);

use MedQueue\Support\Env;

return [
    'session_name' => Env::get('SESSION_NAME', 'MEDQUEUESESSID'),
    'session_lifetime_min' => (int) Env::get('SESSION_LIFETIME_MIN', 120),
    'session_secure' => Env::bool('SESSION_SECURE', false),
    'session_samesite' => Env::get('SESSION_SAMESITE', 'Lax'),
    'cors_allowed_origin' => Env::get('CORS_ALLOWED_ORIGIN', 'http://localhost'),
    'csrf_header' => 'X-CSRF-Token',
];
