<?php

declare(strict_types=1);

use MedQueue\Http\Controllers\AdminController;
use MedQueue\Http\Controllers\AuthController;
use MedQueue\Http\Controllers\DoctorController;
use MedQueue\Http\Controllers\HealthController;
use MedQueue\Http\Controllers\PatientController;
use MedQueue\Http\Controllers\ReportController;
use MedQueue\Http\Middleware\AuthMiddleware;
use MedQueue\Http\Middleware\CsrfMiddleware;

$healthController = new HealthController();
$authController = new AuthController();
$doctorController = new DoctorController();
$patientController = new PatientController();
$reportController = new ReportController();
$adminController = new AdminController();

$csrf = new CsrfMiddleware();
$patientOnly = new AuthMiddleware(['patient']);
$doctorOnly = new AuthMiddleware(['doctor']);
$adminOnly = new AuthMiddleware(['admin']);
$patientDoctorAdmin = new AuthMiddleware(['patient', 'doctor', 'admin']);

$router->add('GET', '/api/v1/health', static fn($request, $params) => $healthController($request));

$router->add('GET', '/api/v1/auth/csrf', static fn($request, $params) => $authController->csrf($request));
$router->add('POST', '/api/v1/auth/register', static fn($request, $params) => $authController->register($request));
$router->add('POST', '/api/v1/auth/login', static fn($request, $params) => $authController->login($request));
$router->add('GET', '/api/v1/auth/me', static fn($request, $params) => $authController->me($request), [$patientDoctorAdmin]);
$router->add('POST', '/api/v1/auth/logout', static fn($request, $params) => $authController->logout($request), [$patientDoctorAdmin, $csrf]);

$router->add('GET', '/api/v1/doctors', static fn($request, $params) => $doctorController->index($request));

$router->add('GET', '/api/v1/patient/queue', static fn($request, $params) => $patientController->queue($request), [$patientOnly]);
$router->add('POST', '/api/v1/patient/queue', static fn($request, $params) => $patientController->book($request), [$patientOnly, $csrf]);
$router->add('POST', '/api/v1/patient/queue/{id}/cancel', static fn($request, $params) => $patientController->cancel($request, $params), [$patientOnly, $csrf]);
$router->add('GET', '/api/v1/patient/reports', static fn($request, $params) => $reportController->myReports($request), [$patientOnly]);

$router->add('GET', '/api/v1/doctor/queue', static fn($request, $params) => $doctorController->queue($request), [$doctorOnly]);
$router->add('POST', '/api/v1/doctor/queue/call-next', static fn($request, $params) => $doctorController->callNext($request), [$doctorOnly, $csrf]);
$router->add('POST', '/api/v1/doctor/queue/{id}/start', static fn($request, $params) => $doctorController->start($request, $params), [$doctorOnly, $csrf]);
$router->add('POST', '/api/v1/doctor/queue/{id}/skip', static fn($request, $params) => $doctorController->skip($request, $params), [$doctorOnly, $csrf]);
$router->add('POST', '/api/v1/doctor/queue/{id}/complete', static fn($request, $params) => $doctorController->complete($request, $params), [$doctorOnly, $csrf]);

$router->add('GET', '/api/v1/admin/config', static fn($request, $params) => $adminController->config($request), [$adminOnly]);
$router->add('POST', '/api/v1/admin/config', static fn($request, $params) => $adminController->updateConfig($request), [$adminOnly, $csrf]);
$router->add('POST', '/api/v1/admin/doctors/{id}/active', static fn($request, $params) => $adminController->setDoctorActive($request, $params), [$adminOnly, $csrf]);
$router->add('GET', '/api/v1/admin/reports/{id}', static fn($request, $params) => $reportController->fullById($request, $params), [$adminOnly]);
