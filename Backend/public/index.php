<?php

declare(strict_types=1);

use MedQueue\Core\Request;

$kernel = require dirname(__DIR__) . '/bootstrap.php';
$request = Request::fromGlobals();
$response = $kernel->handle($request);
$response->send();
