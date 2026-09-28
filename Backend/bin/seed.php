<?php

declare(strict_types=1);

use MedQueue\Auth\PasswordHasher;
use MedQueue\Database\Connection;

$app = require dirname(__DIR__) . '/bootstrap.php';
unset($app);

$pdo = Connection::get();
$pdo->beginTransaction();

try {
    $now = gmdate('Y-m-d H:i:s');

    $specialties = ['Cardiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Medicine'];
    $insertSpecialty = $pdo->prepare('INSERT INTO specialties (name, is_active, created_at, updated_at) VALUES (:name, 1, :created_at, :updated_at) ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = VALUES(updated_at)');
    foreach ($specialties as $specialty) {
        $insertSpecialty->execute(['name' => $specialty, 'created_at' => $now, 'updated_at' => $now]);
    }

    $permissionStmt = $pdo->prepare('INSERT INTO permissions (code, description, created_at) VALUES (:code, :description, :created_at) ON DUPLICATE KEY UPDATE description = VALUES(description)');
    $permissionStmt->execute(['code' => 'reports.read_full', 'description' => 'Read full medical report text', 'created_at' => $now]);

    $adminEmail = 'admin@medqueue.hospital';
    $adminPassword = PasswordHasher::hash('Admin@12345');

    $insertUser = $pdo->prepare(
        'INSERT INTO users (role, name, email, phone, password_hash, is_active, created_at, updated_at)
         VALUES (:role, :name, :email, :phone, :password_hash, :is_active, :created_at, :updated_at)
         ON DUPLICATE KEY UPDATE role = VALUES(role), name = VALUES(name), phone = VALUES(phone), password_hash = VALUES(password_hash), is_active = VALUES(is_active), updated_at = VALUES(updated_at)'
    );

    $insertUser->execute([
        'role' => 'admin',
        'name' => 'MedQueue Admin',
        'email' => $adminEmail,
        'phone' => null,
        'password_hash' => $adminPassword,
        'is_active' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $adminIdStmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $adminIdStmt->execute(['email' => $adminEmail]);
    $adminId = (int) $adminIdStmt->fetchColumn();

    $permissionId = (int) $pdo->query("SELECT id FROM permissions WHERE code = 'reports.read_full' LIMIT 1")->fetchColumn();
    $rolePermStmt = $pdo->prepare('INSERT IGNORE INTO role_permissions (role, permission_id) VALUES (:role, :permission_id)');
    $rolePermStmt->execute(['role' => 'admin', 'permission_id' => $permissionId]);

    $doctorSeeds = [
        ['name' => 'Dr. Sarah Chen', 'email' => 'sarah.chen@medqueue.hospital', 'specialty' => 'Cardiology', 'room' => 'Room 101', 'prefix' => 'CAR', 'photo' => 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2'],
        ['name' => 'Dr. Michael Rodriguez', 'email' => 'michael.rodriguez@medqueue.hospital', 'specialty' => 'Dermatology', 'room' => 'Room 203', 'prefix' => 'DER', 'photo' => 'https://images.unsplash.com/photo-1612276529731-4b21494e6d71'],
        ['name' => 'Dr. Aisha Rahman', 'email' => 'aisha.rahman@medqueue.hospital', 'specialty' => 'Neurology', 'room' => 'Room 305', 'prefix' => 'NEU', 'photo' => 'https://images.unsplash.com/photo-1594824476967-48c8b964273f'],
    ];

    $specialtyIdStmt = $pdo->prepare('SELECT id FROM specialties WHERE name = :name LIMIT 1');
    $doctorProfileStmt = $pdo->prepare(
        'INSERT INTO doctor_profiles (user_id, specialty_id, room, photo_url, work_start, work_end, token_prefix, is_active, created_at, updated_at)
         VALUES (:user_id, :specialty_id, :room, :photo_url, :work_start, :work_end, :token_prefix, :is_active, :created_at, :updated_at)
         ON DUPLICATE KEY UPDATE specialty_id = VALUES(specialty_id), room = VALUES(room), photo_url = VALUES(photo_url), work_start = VALUES(work_start), work_end = VALUES(work_end), token_prefix = VALUES(token_prefix), is_active = VALUES(is_active), updated_at = VALUES(updated_at)'
    );

    foreach ($doctorSeeds as $doctor) {
        $insertUser->execute([
            'role' => 'doctor',
            'name' => $doctor['name'],
            'email' => $doctor['email'],
            'phone' => null,
            'password_hash' => PasswordHasher::hash('Doctor@12345'),
            'is_active' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $userIdStmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $userIdStmt->execute(['email' => $doctor['email']]);
        $doctorUserId = (int) $userIdStmt->fetchColumn();

        $specialtyIdStmt->execute(['name' => $doctor['specialty']]);
        $specialtyId = (int) $specialtyIdStmt->fetchColumn();

        $doctorProfileStmt->execute([
            'user_id' => $doctorUserId,
            'specialty_id' => $specialtyId,
            'room' => $doctor['room'],
            'photo_url' => $doctor['photo'],
            'work_start' => '00:00:00',
            'work_end' => '23:59:00',
            'token_prefix' => $doctor['prefix'],
            'is_active' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    $configDefaults = [
        'queue.daily_limit_per_doctor' => '50',
        'queue.max_waiting_per_doctor' => '100',
        'queue.auto_cancel_called_minutes' => '15',
        'queue.emergency_mode_enabled' => '1',
    ];

    $configStmt = $pdo->prepare('INSERT INTO app_config (config_key, config_value, updated_at) VALUES (:config_key, :config_value, :updated_at) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = VALUES(updated_at)');
    foreach ($configDefaults as $key => $value) {
        $configStmt->execute(['config_key' => $key, 'config_value' => $value, 'updated_at' => $now]);
    }

    $pdo->commit();

    echo "Seed completed successfully.\n";
    echo "Admin login: {$adminEmail} / Admin@12345\n";
} catch (Throwable $exception) {
    $pdo->rollBack();
    throw $exception;
}
