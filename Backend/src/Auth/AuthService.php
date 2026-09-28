<?php

declare(strict_types=1);

namespace MedQueue\Auth;

use MedQueue\Http\HttpException;
use MedQueue\Http\Session;
use MedQueue\Infra\PdoConnection;
use PDO;

final class AuthService
{
    /**
     * @return array<string, mixed>
     */
    public function login(string $email, string $password): array
    {
        $email = strtolower(trim($email));
        if ($email === '' || $password === '') {
            throw new HttpException(400, 'invalid_credentials', 'Invalid email or password.');
        }

        $pdo = PdoConnection::get();
        $stmt = $pdo->prepare('SELECT id, email, password_hash, role, display_name, must_change_password, can_view_clinical_reports FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!is_array($user) || !PasswordHasher::verify($password, (string) $user['password_hash'])) {
            throw new HttpException(401, 'invalid_credentials', 'Invalid email or password.');
        }

        Session::regenerate();
        $_SESSION['user_id'] = (int) $user['id'];

        return $this->publicUser((int) $user['id']);
    }

    /**
     * @return array<string, mixed>
     */
    public function registerPatient(string $name, string $email, string $password, ?string $phone, ?string $condition): array
    {
        $name = trim($name);
        $email = strtolower(trim($email));
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new HttpException(400, 'validation', 'Name and a valid email are required.');
        }
        if (strlen($password) < 8) {
            throw new HttpException(400, 'validation', 'Password must be at least 8 characters.');
        }

        $pdo = PdoConnection::get();
        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $exists->execute([$email]);
        if ($exists->fetch()) {
            throw new HttpException(409, 'email_taken', 'That email is already registered.');
        }

        $pdo->beginTransaction();
        try {
            $insUser = $pdo->prepare(
                'INSERT INTO users (email, password_hash, role, display_name, must_change_password, can_view_clinical_reports)
                 VALUES (?, ?, \'patient\', ?, 0, 0)'
            );
            $insUser->execute([$email, PasswordHasher::hash($password), $name]);
            $userId = (int) $pdo->lastInsertId();

            $code = $this->allocatePublicCode($pdo);
            $insPatient = $pdo->prepare(
                'INSERT INTO patients (user_id, public_code, phone, condition_note, joined_at) VALUES (?, ?, ?, ?, NOW())'
            );
            $insPatient->execute([$userId, $code, $phone !== null && $phone !== '' ? $phone : null, $condition !== null && $condition !== '' ? $condition : null]);
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        Session::regenerate();
        $_SESSION['user_id'] = $userId;

        return $this->publicUser($userId);
    }

    public function logout(): void
    {
        Session::destroy();
        Session::start();
    }

    /**
     * @return array<string, mixed>
     */
    public function me(): array
    {
        $id = $this->requireUserId();
        return $this->publicUser($id);
    }

    public function changePassword(string $current, string $next): void
    {
        $id = $this->requireUserId();
        if (strlen($next) < 8) {
            throw new HttpException(400, 'validation', 'Password must be at least 8 characters.');
        }

        $pdo = PdoConnection::get();
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!is_array($row) || !PasswordHasher::verify($current, (string) $row['password_hash'])) {
            throw new HttpException(401, 'invalid_credentials', 'Current password is incorrect.');
        }

        $upd = $pdo->prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?');
        $upd->execute([PasswordHasher::hash($next), $id]);
        Session::regenerate();
    }

    public function requireUserId(): int
    {
        $id = $_SESSION['user_id'] ?? null;
        if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
            throw new HttpException(401, 'unauthenticated', 'Authentication required.');
        }
        return (int) $id;
    }

    /**
     * @return array<string, mixed>
     */
    public function publicUser(int $userId): array
    {
        $pdo = PdoConnection::get();
        $stmt = $pdo->prepare(
            'SELECT u.id, u.email, u.role, u.display_name, u.must_change_password, u.can_view_clinical_reports,
                    p.public_code, p.phone, p.condition_note, p.joined_at,
                    d.id AS doctor_id, d.account_status, d.is_available
             FROM users u
             LEFT JOIN patients p ON p.user_id = u.id
             LEFT JOIN doctors d ON d.user_id = u.id
             WHERE u.id = ?
             LIMIT 1'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            throw new HttpException(401, 'unauthenticated', 'Authentication required.');
        }

        $payload = [
            'id' => (int) $row['id'],
            'email' => $row['email'],
            'role' => $row['role'],
            'displayName' => $row['display_name'],
            'mustChangePassword' => (bool) $row['must_change_password'],
            'canViewClinicalReports' => (bool) $row['can_view_clinical_reports'],
        ];

        if ($row['role'] === 'patient') {
            $payload['patient'] = [
                'publicCode' => $row['public_code'],
                'phone' => $row['phone'],
                'conditionNote' => $row['condition_note'],
                'joinedAt' => $row['joined_at'],
            ];
        }

        if ($row['role'] === 'doctor') {
            $payload['doctor'] = [
                'id' => $row['doctor_id'] !== null ? (int) $row['doctor_id'] : null,
                'accountStatus' => $row['account_status'],
                'isAvailable' => $row['is_available'] !== null ? (bool) $row['is_available'] : null,
            ];
        }

        return $payload;
    }

    private function allocatePublicCode(PDO $pdo): string
    {
        for ($i = 0; $i < 12; $i++) {
            $code = 'PAT-' . (string) random_int(1000, 9999);
            $check = $pdo->prepare('SELECT id FROM patients WHERE public_code = ? LIMIT 1');
            $check->execute([$code]);
            if (!$check->fetch()) {
                return $code;
            }
        }
        return 'PAT-' . bin2hex(random_bytes(4));
    }
}
