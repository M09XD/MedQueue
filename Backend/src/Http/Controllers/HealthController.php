<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Config\Config;
use MedQueue\Core\Request;
use MedQueue\Core\Response;

final class HealthController
{
    public function __invoke(Request $request): Response
    {
        return Response::json([
            'ok' => true,
            'data' => [
                'status' => 'healthy',
                'environment' => Config::get('app.env', 'local'),
                'timezone' => Config::get('app.timezone', 'Asia/Dhaka'),
            ],
        ]);
    }
}
