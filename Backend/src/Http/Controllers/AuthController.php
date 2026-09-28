<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Core\JsonResponse;
use MedQueue\Core\Request;
use MedQueue\Security\SessionManager;
use MedQueue\Services\AuthService;
use MedQueue\Support\Validator;

final class AuthController
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly SessionManager $session,
    ) {
    }

    public function csrf(Request $request): JsonResponse
    {
        return JsonResponse::success(['csrfToken' => $this->session->csrfToken()]);
    }

    public function register(Request $request): JsonResponse
    {
        $validation = Validator::require($request->body, [
            'name' => 'required|min:2',
            'email' => 'required|email',
            'phone' => 'required|min:7',
            'password' => 'required|min:8',
        ]);

        if (!$validation['ok']) {
            return JsonResponse::error('VALIDATION_ERROR', 'Please fix highlighted fields.', 422);
        }

        try {
            $user = $this->auth->registerPatient(
                trim((string) $request->input('name')),
                trim((string) $request->input('email')),
                trim((string) $request->input('phone')),
                (string) $request->input('password'),
                $request->input('condition') !== null ? trim((string) $request->input('condition')) : null,
            );
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'EMAIL_EXISTS') {
                return JsonResponse::error('EMAIL_EXISTS', 'This email is already registered.', 409);
            }
            return JsonResponse::error('REGISTER_FAILED', 'Could not create account.', 500);
        }

        return JsonResponse::success(['user' => $user, 'csrfToken' => $this->session->csrfToken()], status: 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validation = Validator::require($request->body, [
            'email' => 'required|email',
            'password' => 'required|min:8',
        ]);

        if (!$validation['ok']) {
            return JsonResponse::error('VALIDATION_ERROR', 'Email and password are required.', 422);
        }

        try {
            $user = $this->auth->login(
                trim((string) $request->input('email')),
                (string) $request->input('password')
            );
        } catch (\RuntimeException $e) {
            $code = $e->getMessage();
            if ($code === 'INVALID_CREDENTIALS') {
                return JsonResponse::error('INVALID_CREDENTIALS', 'Invalid credentials.', 401);
            }
            return JsonResponse::error('LOGIN_FAILED', 'Login failed.', 500);
        }

        return JsonResponse::success(['user' => $user, 'csrfToken' => $this->session->csrfToken()]);
    }

    public function me(Request $request): JsonResponse
    {
        if ($request->user === null) {
            return JsonResponse::error('UNAUTHENTICATED', 'Login required.', 401);
        }

        return JsonResponse::success(['user' => $request->user]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->session->destroy();
        return JsonResponse::success(['message' => 'Logged out']);
    }
}
