<?php

declare(strict_types=1);

use MedQueue\Config\Environment;
use MedQueue\Core\JsonResponse;
use MedQueue\Core\Request;
use MedQueue\Core\RequestContext;

$root = dirname(__DIR__);

/** @var MedQueue\Core\Kernel $kernel */
$kernel = require $root . '/bootstrap.php';

$allowOrigin = trim((string) Environment::get('CORS_ORIGIN', ''));
$requestOrigin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
if ($allowOrigin === '') {
    $allowOrigin = $requestOrigin !== '' ? $requestOrigin : '*';
}
$allowCredentials = $allowOrigin !== '*';

header('Access-Control-Allow-Origin: ' . $allowOrigin);
header('Access-Control-Allow-Credentials: ' . ($allowCredentials ? 'true' : 'false'));
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, X-Requested-With, Idempotency-Key');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Vary: Origin');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $request = Request::fromGlobals();
    $response = $kernel->handle($request);
} catch (Throwable $e) {
    if (RequestContext::requestId() === '') {
        RequestContext::setRequestId(bin2hex(random_bytes(8)));
    }
    $debug = (bool) Environment::get('APP_DEBUG', false);
    $response = JsonResponse::error('INTERNAL_ERROR', $debug ? $e->getMessage() : 'Unexpected server error.', 500);
}

$response->send();
