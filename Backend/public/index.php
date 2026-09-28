<?php

declare(strict_types=1);

use MedQueue\Core\HttpException;
use MedQueue\Core\Request;

$app = require dirname(__DIR__) . '/bootstrap.php';
$request = Request::fromGlobals();

try {
    $response = $app->handle($request);
} catch (HttpException $exception) {
    $response = $app->errorResponse($exception->getStatusCode(), $exception->getMessage(), [
        'code' => $exception->getErrorCode(),
        'details' => $exception->getDetails(),
    ]);
} catch (Throwable $exception) {
    $response = $app->errorResponse(500, 'Unexpected server error.', [
        'code' => 'internal_error',
    ]);
}

$response->send();
