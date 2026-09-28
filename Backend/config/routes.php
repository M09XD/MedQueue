<?php

declare(strict_types=1);

use MedQueue\Auth\AuthService;
use MedQueue\Http\Csrf;
use MedQueue\Http\JsonResponse;
use MedQueue\Http\Request;
use MedQueue\Http\Route;
use MedQueue\Http\Router;
use MedQueue\Infra\FileRateLimiter;
use MedQueue\Infra\PdoConnection;

/** @var Router $router */

$rateLimiter = new FileRateLimiter(dirname(__DIR__) . '/storage/ratelimit');
$auth = new AuthService();

$router->get('/api/health', static function (Request $request): JsonResponse {
    return JsonResponse::ok([
        'ok' => true,
        'service' => 'medqueue',
        'time' => gmdate('c'),
    ]);
});

$router->get('/api/csrf', static function (Request $request): JsonResponse {
    return JsonResponse::ok([
        'csrfToken' => Csrf::token(),
    ]);
});

$router->post('/api/auth/register', Route::mutating(static function (Request $request) use ($auth, $rateLimiter): JsonResponse {
    $rateLimiter->hit('register:' . $request->ip(), 8, 300);
    $body = $request->jsonBody();
    $user = $auth->registerPatient(
        Route::jsonString($body, 'name'),
        Route::jsonString($body, 'email'),
        Route::jsonString($body, 'password'),
        Route::jsonString($body, 'phone') ?: null,
        Route::jsonString($body, 'condition') ?: null,
    );
    return JsonResponse::ok(['user' => $user], 201);
}));

$router->post('/api/auth/login', Route::mutating(static function (Request $request) use ($auth, $rateLimiter): JsonResponse {
    $body = $request->jsonBody();
    $email = strtolower(trim(Route::jsonString($body, 'email')));
    $rateLimiter->hit('login:' . $request->ip() . ':' . $email, 10, 900);
    $user = $auth->login($email, Route::jsonString($body, 'password'));
    return JsonResponse::ok(['user' => $user]);
}));

$router->post('/api/auth/logout', Route::mutating(static function (Request $request) use ($auth): JsonResponse {
    $auth->logout();
    return JsonResponse::ok(['ok' => true, 'csrfToken' => Csrf::token()]);
}));

$router->get('/api/auth/me', static function (Request $request) use ($auth): JsonResponse {
    return JsonResponse::ok(['user' => $auth->me()]);
});

$router->post('/api/auth/change-password', Route::mutating(static function (Request $request) use ($auth): JsonResponse {
    $body = $request->jsonBody();
    $auth->changePassword(Route::jsonString($body, 'currentPassword'), Route::jsonString($body, 'newPassword'));
    return JsonResponse::ok(['ok' => true, 'user' => $auth->me()]);
}));

$router->get('/api/specialties', static function (Request $request): JsonResponse {
    $pdo = PdoConnection::get();
    $rows = $pdo->query('SELECT id, name FROM specialties ORDER BY name ASC')->fetchAll();
    return JsonResponse::ok(['specialties' => $rows ?: []]);
});

$router->get('/api/doctors', static function (Request $request): JsonResponse {
    $pdo = PdoConnection::get();
    $sql = 'SELECT d.id, u.display_name AS name, s.name AS specialty, d.room, d.is_available AS available,
                   d.avg_wait_minutes AS avgWait, d.rating, d.photo_ref AS photo
            FROM doctors d
            JOIN users u ON u.id = d.user_id
            JOIN specialties s ON s.id = d.specialty_id
            WHERE d.account_status = \'active\'
            ORDER BY d.id ASC';
    $rows = $pdo->query($sql)->fetchAll();
    $doctors = [];
    foreach ($rows ?: [] as $row) {
        $doctors[] = [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'specialty' => $row['specialty'],
            'room' => $row['room'],
            'available' => (bool) $row['available'],
            'avgWait' => (int) $row['avgWait'],
            'rating' => (float) $row['rating'],
            'photo' => $row['photo'],
        ];
    }
    return JsonResponse::ok(['doctors' => $doctors]);
});
