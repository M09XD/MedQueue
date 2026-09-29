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
            'name' => 'required|min:2|max:140',
            'email' => 'required|email|max:190',
            'phone' => 'required|min:7|max:40',
            'password' => 'required|min:8|max:200',
            'condition' => 'max:1000',
        ]);

        if (!$validation['ok']) {
            return JsonResponse::error('VALIDATION_ERROR', 'Please fix highlighted fields.', 422);
        }

        $condition = trim((string) $request->input('condition', ''));

        try {
            $user = $this->auth->registerPatient(
                trim((string) $request->input('name')),
                trim((string) $request->input('email')),
                trim((string) $request->input('phone')),
                (string) $request->input('password'),
                $condition !== '' ? $condition : null,
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
            'email' => 'required|email|max:190',
            'password' => 'required|max:200',
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
                return JsonResponse::error('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
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

        return JsonResponse::success(['user' => $request->user, 'csrfToken' => $this->session->csrfToken()]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->session->destroy();
        return JsonResponse::success(['message' => 'Logged out']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validation = Validator::require($request->body, [
            'currentPassword' => 'required|max:200',
            'newPassword' => 'required|min:8|max:200',
        ]);

        if (!$validation['ok']) {
            return JsonResponse::error('VALIDATION_ERROR', 'New password must be at least 8 characters.', 422);
        }

        if ($request->input('currentPassword') === $request->input('newPassword')) {
            return JsonResponse::error('VALIDATION_ERROR', 'Choose a password different from the current one.', 422);
        }

        try {
            $this->auth->changePassword(
                (int) $request->user['id'],
                (string) $request->input('currentPassword'),
                (string) $request->input('newPassword')
            );
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'INVALID_CREDENTIALS') {
                return JsonResponse::error('INVALID_CREDENTIALS', 'Current password is incorrect.', 401);
            }
            return JsonResponse::error('PASSWORD_CHANGE_FAILED', 'Password could not be changed.', 500);
        }

        return JsonResponse::success(['message' => 'Password updated.']);
    }
}
