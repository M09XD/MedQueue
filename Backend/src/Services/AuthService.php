<?php

declare(strict_types=1);

namespace MedQueue\Services;

use MedQueue\Repositories\AuditLogRepository;
use MedQueue\Repositories\UserRepository;
use MedQueue\Security\PasswordHasher;
use MedQueue\Security\SessionManager;

final class AuthService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly PasswordHasher $hasher,
        private readonly SessionManager $session,
        private readonly AuditLogRepository $audit,
    ) {
    }

    public function registerPatient(string $name, string $email, string $phone, string $password, ?string $condition): array
    {
        if ($this->users->findByEmail($email) !== null) {
            throw new \RuntimeException('EMAIL_EXISTS');
        }

        try {
            $hash = $this->hasher->hash($password);
            $userId = $this->users->createPatient($email, $hash, $name, $phone, $condition);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                throw new \RuntimeException('EMAIL_EXISTS');
            }
            throw $e;
        }

        $user = $this->users->findById($userId) ?? [];
        $sessionUser = $this->buildSessionUser($user);

        $this->session->login($sessionUser);
        $this->audit->record($userId, 'auth.register', 'user', $userId);

        return $sessionUser;
    }

    public function login(string $email, string $password): array
    {
        $user = $this->users->findByEmail($email);

        if ($user === null) {
            // keep response timing closer to the wrong-password path.
            $this->hasher->hash($password);
            $this->audit->record(null, 'auth.login_failed', 'user', null);
            throw new \RuntimeException('INVALID_CREDENTIALS');
        }

        if ($user['status'] !== 'active' || !$this->hasher->verify($password, (string) $user['password_hash'])) {
            $this->audit->record((int) $user['id'], 'auth.login_failed', 'user', (int) $user['id']);
            throw new \RuntimeException('INVALID_CREDENTIALS');
        }

        $sessionUser = $this->buildSessionUser($user);

        $this->session->login($sessionUser);
        $this->users->touchLogin((int) $user['id']);
        $this->audit->record((int) $user['id'], 'auth.login', 'user', (int) $user['id']);

        return $sessionUser;
    }

    public function changePassword(int $userId, string $current, string $new): void
    {
        $hash = $this->users->passwordHash($userId);
        if ($hash === null || !$this->hasher->verify($current, $hash)) {
            throw new \RuntimeException('INVALID_CREDENTIALS');
        }

        $this->users->updatePassword($userId, $this->hasher->hash($new));
        $this->audit->record($userId, 'auth.password_changed', 'user', $userId);
    }

    private function buildSessionUser(array $user): array
    {
        $id = (int) $user['id'];
        $role = (string) $user['role'];
        $profile = ['name' => 'Admin'];

        if ($role === 'patient') {
            $patient = $this->users->patientProfile($id) ?? throw new \RuntimeException('PROFILE_MISSING');
            $profile = [
                'name' => $patient['full_name'],
                'patientId' => $patient['patient_code'],
                'phone' => $patient['phone'],
                'condition' => $patient['condition_text'],
                'joinedAt' => $patient['joined_at'],
            ];
        } elseif ($role === 'doctor') {
            $doc = $this->users->doctorProfile($id) ?? throw new \RuntimeException('PROFILE_MISSING');
            if ((int) ($doc['is_active'] ?? 0) !== 1) {
                throw new \RuntimeException('INVALID_CREDENTIALS');
            }
            $profile = [
                'doctorId' => (int) $doc['doctor_id'],
                'name' => $doc['full_name'],
                'specialty' => $doc['specialty'],
                'room' => $doc['room_no'],
            ];
        }

        return [
            'id' => $id,
            'email' => $user['email'],
            'role' => $role,
            'mustChangePassword' => (bool) ($user['must_change_password'] ?? false),
            'profile' => $profile,
        ];
    }
}
