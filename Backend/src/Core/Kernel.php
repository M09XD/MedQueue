<?php

declare(strict_types=1);

namespace MedQueue\Core;

use MedQueue\Config\Environment;
use MedQueue\Http\Controllers\AdminController;
use MedQueue\Http\Controllers\AuthController;
use MedQueue\Http\Controllers\DoctorController;
use MedQueue\Http\Controllers\PatientController;
use MedQueue\Http\Controllers\PublicController;
use MedQueue\Repositories\AuditLogRepository;
use MedQueue\Repositories\DoctorRepository;
use MedQueue\Repositories\PermissionRepository;
use MedQueue\Repositories\QueueRepository;
use MedQueue\Repositories\RateLimitRepository;
use MedQueue\Repositories\ReportRepository;
use MedQueue\Repositories\SettingsRepository;
use MedQueue\Repositories\SpecialtyRepository;
use MedQueue\Repositories\UserRepository;
use MedQueue\Security\PasswordHasher;
use MedQueue\Security\SessionManager;
use MedQueue\Services\AnalyticsService;
use MedQueue\Services\AuthService;
use MedQueue\Services\QueueService;

final class Kernel
{
    /** Endpoints still allowed while a temporary password is pending change. */
    private const PASSWORD_CHANGE_PATH_SUFFIXES = [
        '/auth/me',
        '/auth/logout',
        '/auth/change-password',
        '/auth/csrf',
        '/csrf',
    ];

    public function __construct(private readonly Container $container)
    {
    }

    public function handle(Request $request): Response
    {
        RequestContext::setRequestId(bin2hex(random_bytes(8)));
        $session = $this->session();
        $session->start();
        $this->applySecurityHeaders();

        $router = $this->container->get(Router::class);
        $this->registerRoutes($router);

        $middleware = [
            'auth' => function (Request $req, \Closure $next) use ($session): Response {
                $user = $session->user();
                if ($user === null) {
                    return JsonResponse::error('UNAUTHENTICATED', 'Login required.', 401);
                }

                $row = $this->users()->findById((int) ($user['id'] ?? 0));
                if ($row === null || ($row['status'] ?? 'inactive') !== 'active') {
                    $session->destroy();
                    return JsonResponse::error('UNAUTHENTICATED', 'Your session is no longer valid. Please log in again.', 401);
                }

                $user['email'] = (string) $row['email'];
                $user['role'] = (string) $row['role'];
                $user['mustChangePassword'] = (bool) ($row['must_change_password'] ?? false);

                if (($user['mustChangePassword'] ?? false) && !$this->isPasswordChangeAllowedPath($req->path)) {
                    return JsonResponse::error('PASSWORD_CHANGE_REQUIRED', 'Please change your temporary password first.', 403);
                }

                return $next($req->withUser($user));
            },
            'role:patient' => function (Request $req, \Closure $next): Response {
                if (($req->user['role'] ?? null) !== 'patient') {
                    return JsonResponse::error('FORBIDDEN', 'Patient role required.', 403);
                }
                return $next($req);
            },
            'role:doctor' => function (Request $req, \Closure $next): Response {
                if (($req->user['role'] ?? null) !== 'doctor') {
                    return JsonResponse::error('FORBIDDEN', 'Doctor role required.', 403);
                }
                return $next($req);
            },
            'role:admin' => function (Request $req, \Closure $next): Response {
                if (($req->user['role'] ?? null) !== 'admin') {
                    return JsonResponse::error('FORBIDDEN', 'Admin role required.', 403);
                }
                return $next($req);
            },
            'csrf' => function (Request $req, \Closure $next) use ($session): Response {
                if (in_array($req->method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
                    $headerToken = (string) ($req->header('X-CSRF-Token') ?? '');
                    if ($headerToken === '' || !hash_equals($session->csrfToken(), $headerToken)) {
                        return JsonResponse::error('CSRF_MISMATCH', 'CSRF token missing or invalid.', 419);
                    }
                }
                return $next($req);
            },
            'rate:auth' => function (Request $req, \Closure $next): Response {
                $email = mb_strtolower((string) ($req->input('email') ?? 'unknown'));
                $ip = (string) ($req->server['REMOTE_ADDR'] ?? 'unknown');
                $hits = $this->rateLimiter()->hit('auth:' . $ip . ':' . $email, 300);
                if ($hits > 10) {
                    return JsonResponse::error('RATE_LIMITED', 'Too many login attempts. Try again later.', 429);
                }
                return $next($req);
            },
            'rate:write' => function (Request $req, \Closure $next): Response {
                $ip = (string) ($req->server['REMOTE_ADDR'] ?? 'unknown');
                $hits = $this->rateLimiter()->hit('write:' . $ip, 60);
                if ($hits > 50) {
                    return JsonResponse::error('RATE_LIMITED', 'Too many write requests.', 429);
                }
                return $next($req);
            },
        ];

        try {
            return $router->dispatch($request, $middleware);
        } catch (\Throwable $e) {
            if ((bool) Environment::get('APP_DEBUG', false)) {
                return JsonResponse::error('UNHANDLED_EXCEPTION', $e->getMessage(), 500);
            }
            return JsonResponse::error('INTERNAL_ERROR', 'Unexpected server error.', 500);
        }
    }

    private function applySecurityHeaders(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Cross-Origin-Resource-Policy: same-origin');
        header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

        $csp = "default-src 'self'; script-src 'self' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
        header('Content-Security-Policy: ' . $csp);
    }

    private function registerRoutes(Router $router): void
    {
        $auth = $this->authController();
        $public = $this->publicController();
        $patient = $this->patientController();
        $doctor = $this->doctorController();
        $admin = $this->adminController();

        $this->registerApiRoute($router, 'GET', '/health', static fn (Request $request): Response => JsonResponse::success([
            'ok' => true,
            'service' => 'medqueue',
            'time' => gmdate('c'),
        ]));

        $this->registerApiRoute($router, 'GET', '/auth/csrf', [$auth, 'csrf']);
        $this->registerApiRoute($router, 'POST', '/auth/register', [$auth, 'register'], ['rate:write']);
        $this->registerApiRoute($router, 'POST', '/auth/login', [$auth, 'login'], ['rate:auth']);
        $this->registerApiRoute($router, 'POST', '/auth/logout', [$auth, 'logout'], ['auth', 'csrf']);
        $this->registerApiRoute($router, 'GET', '/auth/me', [$auth, 'me'], ['auth']);
        $this->registerApiRoute($router, 'POST', '/auth/change-password', [$auth, 'changePassword'], ['auth', 'csrf', 'rate:write']);

        $this->registerApiRoute($router, 'GET', '/public/specialties', [$public, 'specialties']);
        $this->registerApiRoute($router, 'GET', '/public/doctors', [$public, 'doctors']);

        $this->registerApiRoute($router, 'GET', '/patient/tokens', [$patient, 'tokens'], ['auth', 'role:patient']);
        $this->registerApiRoute($router, 'POST', '/patient/tokens', [$patient, 'bookToken'], ['auth', 'role:patient', 'csrf', 'rate:write']);
        $this->registerApiRoute($router, 'POST', '/patient/tokens/{tokenId}/cancel', [$patient, 'cancelToken'], ['auth', 'role:patient', 'csrf', 'rate:write']);

        $this->registerApiRoute($router, 'GET', '/doctor/queue', [$doctor, 'queue'], ['auth', 'role:doctor']);
        $this->registerApiRoute($router, 'GET', '/doctor/history', [$doctor, 'history'], ['auth', 'role:doctor']);
        $this->registerApiRoute($router, 'POST', '/doctor/tokens/{tokenId}/transition', [$doctor, 'transition'], ['auth', 'role:doctor', 'csrf', 'rate:write']);
        $this->registerApiRoute($router, 'POST', '/doctor/tokens/{tokenId}/emergency', [$doctor, 'emergency'], ['auth', 'role:doctor', 'csrf', 'rate:write']);
        $this->registerApiRoute($router, 'PATCH', '/doctor/availability', [$doctor, 'availability'], ['auth', 'role:doctor', 'csrf', 'rate:write']);

        $this->registerApiRoute($router, 'GET', '/admin/analytics', [$admin, 'analytics'], ['auth', 'role:admin']);
        $this->registerApiRoute($router, 'GET', '/admin/reports', [$admin, 'reportMetadata'], ['auth', 'role:admin']);
        $this->registerApiRoute($router, 'GET', '/admin/reports/{reportId}', [$admin, 'reportFull'], ['auth', 'role:admin']);

        // Backward-compatible aliases for earlier frontend/API paths.
        $this->registerApiRoute($router, 'GET', '/csrf', [$auth, 'csrf']);
        $this->registerApiRoute($router, 'GET', '/specialties', [$public, 'specialties']);
        $this->registerApiRoute($router, 'GET', '/doctors', [$public, 'doctors']);
    }

    private function registerApiRoute(Router $router, string $method, string $path, callable $handler, array $middleware = []): void
    {
        $normalized = '/' . ltrim($path, '/');
        $prefixes = ['/api', '/Backend/public/api', '/MedQueue/Backend/public/api'];

        foreach ($prefixes as $prefix) {
            $router->add($method, $prefix . $normalized, $handler, $middleware);
        }
    }

    private function isPasswordChangeAllowedPath(string $path): bool
    {
        foreach (self::PASSWORD_CHANGE_PATH_SUFFIXES as $suffix) {
            if (str_ends_with($path, $suffix)) {
                return true;
            }
        }

        return false;
    }

    private function session(): SessionManager
    {
        static $session;
        if (!$session) {
            $session = new SessionManager();
        }
        return $session;
    }

    private function users(): UserRepository
    {
        static $repo;
        if (!$repo) {
            $repo = new UserRepository($this->container->get(Database::class));
        }
        return $repo;
    }

    private function doctors(): DoctorRepository
    {
        static $repo;
        if (!$repo) {
            $repo = new DoctorRepository($this->container->get(Database::class));
        }
        return $repo;
    }

    private function specialties(): SpecialtyRepository
    {
        static $repo;
        if (!$repo) {
            $repo = new SpecialtyRepository($this->container->get(Database::class));
        }
        return $repo;
    }

    private function queueRepo(): QueueRepository
    {
        static $repo;
        if (!$repo) {
            $repo = new QueueRepository($this->container->get(Database::class));
        }
        return $repo;
    }

    private function settings(): SettingsRepository
    {
        static $repo;
        if (!$repo) {
            $repo = new SettingsRepository($this->container->get(Database::class));
        }
        return $repo;
    }

    private function reports(): ReportRepository
    {
        static $repo;
        if (!$repo) {
            $repo = new ReportRepository($this->container->get(Database::class));
        }
        return $repo;
    }

    private function permissions(): PermissionRepository
    {
        static $repo;
        if (!$repo) {
            $repo = new PermissionRepository($this->container->get(Database::class));
        }
        return $repo;
    }

    private function audit(): AuditLogRepository
    {
        static $repo;
        if (!$repo) {
            $repo = new AuditLogRepository($this->container->get(Database::class));
        }
        return $repo;
    }

    private function rateLimiter(): RateLimitRepository
    {
        static $repo;
        if (!$repo) {
            $repo = new RateLimitRepository($this->container->get(Database::class));
        }
        return $repo;
    }

    private function authController(): AuthController
    {
        $service = new AuthService($this->users(), new PasswordHasher(), $this->session(), $this->audit());
        return new AuthController($service, $this->session());
    }

    private function publicController(): PublicController
    {
        return new PublicController($this->specialties(), $this->doctors());
    }

    private function patientController(): PatientController
    {
        $queueService = new QueueService($this->queueRepo(), $this->doctors(), $this->settings(), $this->reports(), $this->audit());
        return new PatientController($queueService, $this->queueRepo(), $this->reports());
    }

    private function doctorController(): DoctorController
    {
        $queueService = new QueueService($this->queueRepo(), $this->doctors(), $this->settings(), $this->reports(), $this->audit());
        return new DoctorController($this->doctors(), $queueService);
    }

    private function adminController(): AdminController
    {
        $analytics = new AnalyticsService($this->container->get(Database::class));
        return new AdminController($analytics, $this->reports(), $this->permissions());
    }
}
