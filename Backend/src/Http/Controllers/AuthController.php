<?php

declare(strict_types=1);

namespace MedQueue\Http\Controllers;

use MedQueue\Auth\PasswordHasher;
use MedQueue\Auth\SessionAuth;
use MedQueue\Core\HttpException;
use MedQueue\Core\Request;
use MedQueue\Core\Response;
use MedQueue\Database\Connection;
use PDO;

final class AuthController
{
    public function csrf(Request $request): Response
    {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(24));
        }

        return Response::json([
            'ok' => true,
            'data' => [
                'csrfToken' => $_SESSION['csrf_token'],
            ],
        ]);
    }

    public function register(Request $request): Response
    {
        $name = trim((string) $request->input('name', ''));
        $email = strtolower(trim((string) $request->input('email', '')));
        $phone = trim((string) $request->input('phone', ''));
        $password = (string) $request->input('password', '');

        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            throw new HttpException(422, 'Invalid registration input.', 'validation_error');
        }

        $pdo = Connection::get();
        $existsStmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $existsStmt->execute(['email' => $email]);
        if ($existsStmt->fetchColumn()) {
            throw new HttpException(409, 'An account already exists for this email.', 'email_exists');
        }

        $hash = PasswordHasher::hash($password);
        $now = gmdate('Y-m-d H:i:s');
        $insertStmt = $pdo->prepare(
            'INSERT INTO users (role, name, email, phone, password_hash, is_active, created_at, updated_at)
             VALUES (\'patient\', :name, :email, :phone, :password_hash, 1, :created_at, :updated_at)'
        );
        $insertStmt->execute([
            'name' => $name,
            'email' => $email,
            'phone' => $phone !== '' ? $phone : null,
            'password_hash' => $hash,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $userId = (int) $pdo->lastInsertId();
        $user = $this->findUserById($userId);
        SessionAuth::login($user);
        session_regenerate_id(true);

        return Response::json(['ok' => true, 'data' => ['user' => $user]], 201);
    }

    public function login(Request $request): Response
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
            throw new HttpException(422, 'Email and password are required.', 'validation_error');
        }

        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT id, role, name, email, phone, password_hash, is_active, created_at FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || (int) $row['is_active'] !== 1 || !PasswordHasher::verify($password, (string) $row['password_hash'])) {
            throw new HttpException(401, 'Invalid credentials.', 'invalid_credentials');
        }

        $user = [
            'id' => (int) $row['id'],
            'role' => (string) $row['role'],
            'name' => (string) $row['name'],
            'email' => (string) $row['email'],
            'phone' => $row['phone'] !== null ? (string) $row['phone'] : null,
            'created_at' => (string) $row['created_at'],
        ];

        SessionAuth::login($user);
        session_regenerate_id(true);

        return Response::json([
            'ok' => true,
            'data' => ['user' => $user],
        ]);
    }

    public function me(Request $request): Response
    {
        $user = SessionAuth::user();
        return Response::json(['ok' => true, 'data' => ['user' => $user]]);
    }

    public function logout(Request $request): Response
    {
        SessionAuth::logout();
        return Response::json(['ok' => true, 'data' => ['loggedOut' => true]]);
    }

    private function findUserById(int $id): array
    {
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT id, role, name, email, phone, created_at FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            throw new HttpException(404, 'User not found.', 'user_not_found');
        }

        return [
            'id' => (int) $user['id'],
            'role' => (string) $user['role'],
            'name' => (string) $user['name'],
            'email' => (string) $user['email'],
            'phone' => $user['phone'] !== null ? (string) $user['phone'] : null,
            'created_at' => (string) $user['created_at'],
        ];
    }
}
