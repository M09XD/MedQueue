<?php

declare(strict_types=1);

use MedQueue\Config\Environment;
use MedQueue\Core\Container;
use MedQueue\Core\Database;
use MedQueue\Core\Kernel;
use MedQueue\Core\Router;

const MEDQUEUE_BASE = __DIR__;

date_default_timezone_set('UTC');

spl_autoload_register(static function (string $class): void {
    $prefix = 'MedQueue\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = MEDQUEUE_BASE . '/src/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($path)) {
        require_once $path;
    }
});

Environment::load(MEDQUEUE_BASE . '/.env');

$container = new Container();
$container->set(Database::class, static fn (): Database => new Database());
$container->set(Router::class, static fn (): Router => new Router($container));

return new Kernel($container);
