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

        $hash = $this->hasher->hash($password);
        $userId = $this->users->createPatient($email, $hash, $name, $phone, $condition);

        $user = $this->users->findById($userId);
        $profile = $this->users->patientProfile($userId);

        $sessionUser = [
            'id' => $userId,
            'email' => $user['email'],
            'role' => $user['role'],
            'profile' => [
                'name' => $profile['full_name'],
                'patientId' => $profile['patient_code'],
            ],
        ];

        $this->session->login($sessionUser);
        $this->audit->record($userId, 'auth.register', 'user', $userId);

        return $sessionUser;
    }

    public function login(string $email, string $password): array
    {
        $user = $this->users->findByEmail($email);

        if (!$user || $user['status'] !== 'active' || !$this->hasher->verify($password, $user['password_hash'])) {
            $this->audit->record(null, 'auth.login_failed', 'user', null, ['email' => mb_strtolower($email)]);
            throw new \RuntimeException('INVALID_CREDENTIALS');
        }

        $profile = null;
        if ($user['role'] === 'patient') {
            $profile = $this->users->patientProfile((int) $user['id']);
            $profile = [
                'name' => $profile['full_name'],
                'patientId' => $profile['patient_code'],
                'phone' => $profile['phone'],
                'condition' => $profile['condition_text'],
                'joinedAt' => $profile['joined_at'],
            ];
        } elseif ($user['role'] === 'doctor') {
            $doc = $this->users->doctorProfile((int) $user['id']);
            if (!$doc) {
                throw new \RuntimeException('DOCTOR_PROFILE_MISSING');
            }
            $profile = [
                'doctorId' => (int) $doc['doctor_id'],
                'name' => $doc['full_name'],
                'specialty' => $doc['specialty'],
                'room' => $doc['room_no'],
            ];
        } else {
            $profile = ['name' => 'Admin'];
        }

        $sessionUser = [
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'profile' => $profile,
        ];

        $this->session->login($sessionUser);
        $this->audit->record((int) $user['id'], 'auth.login', 'user', (int) $user['id']);

        return $sessionUser;
    }
}
