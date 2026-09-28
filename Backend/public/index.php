<?php

declare(strict_types=1);

use MedQueue\Http\Cors;
use MedQueue\Http\HttpException;
use MedQueue\Http\JsonResponse;
use MedQueue\Http\Request;
use MedQueue\Http\Router;
use MedQueue\Http\Session;
use MedQueue\Support\Env;

$root = dirname(__DIR__);

require $root . '/vendor/autoload.php';

$envFile = is_readable($root . '/.env') ? $root . '/.env' : $root . '/.env.example';
Env::load($envFile);

if (Cors::handlePreflight()) {
    return;
}
Cors::apply();

Session::start();

$router = new Router();
require $root . '/config/routes.php';

try {
    $request = Request::fromGlobals();
    $response = $router->dispatch($request);
} catch (HttpException $e) {
    $response = $e->toResponse();
} catch (Throwable $e) {
    $debug = Env::bool('APP_DEBUG', false);
    $message = $debug ? $e->getMessage() : 'Internal server error.';
    $response = JsonResponse::error('server_error', $message, 500);
}

$response->send();
