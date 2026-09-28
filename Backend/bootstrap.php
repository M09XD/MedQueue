<?php

declare(strict_types=1);

use MedQueue\Config\Config;
use MedQueue\Core\App;
use MedQueue\Core\Router;
use MedQueue\Http\Middleware\CorsMiddleware;
use MedQueue\Http\Middleware\SessionMiddleware;
use MedQueue\Support\Env;

$projectRoot = dirname(__DIR__);
$autoload = $projectRoot . '/vendor/autoload.php';

if (is_file($autoload)) {
    require_once $autoload;
} else {
    spl_autoload_register(static function (string $class) use ($projectRoot): void {
        $prefix = 'MedQueue\\';
        $baseDir = $projectRoot . '/Backend/src/';
        if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
            return;
        }

        $relativeClass = substr($class, strlen($prefix));
        $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
        if (is_file($file)) {
            require $file;
        }
    });
}

Env::load($projectRoot . '/Backend/.env');
Config::load($projectRoot . '/Backend/config');

date_default_timezone_set((string) Config::get('app.timezone', 'Asia/Dhaka'));

$router = new Router();
require $projectRoot . '/Backend/routes/api.php';

$app = new App($router);
$app->addMiddleware(new CorsMiddleware());
$app->addMiddleware(new SessionMiddleware());

return $app;
