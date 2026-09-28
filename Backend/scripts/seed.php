<?php

declare(strict_types=1);

use MedQueue\Auth\PasswordHasher;
use MedQueue\Infra\PdoConnection;
use MedQueue\Support\Env;

$root = dirname(__DIR__);
require $root . '/vendor/autoload.php';

$envFile = is_readable($root . '/.env') ? $root . '/.env' : $root . '/.env.example';
Env::load($envFile);

$pdo = PdoConnection::get();

$existing = $pdo->query("SELECT COUNT(*) FROM users WHERE email = 'admin@medqueue.demo'")->fetchColumn();
if ((int) $existing > 0) {
    fwrite(STDOUT, "Seed already applied (admin@medqueue.demo exists). Skipping.\n");
    exit(0);
}

$specialties = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Dermatology',
    'ENT',
    'General Medicine',
];

$insSpec = $pdo->prepare('INSERT INTO specialties (name) VALUES (?)');
$specIds = [];
foreach ($specialties as $name) {
    $insSpec->execute([$name]);
    $specIds[$name] = (int) $pdo->lastInsertId();
}

$patientPassword = PasswordHasher::hash('PatientDemo!23');
$doctorPassword = PasswordHasher::hash('DoctorDemo!23');
$adminPassword = PasswordHasher::hash('AdminDemo!23');

$pdo->beginTransaction();
try {
    $insUser = $pdo->prepare(
        'INSERT INTO users (email, password_hash, role, display_name, must_change_password, can_view_clinical_reports)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $insDoctor = $pdo->prepare(
        'INSERT INTO doctors (id, user_id, specialty_id, room, avg_wait_minutes, rating, photo_ref, is_available, account_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'active\')'
    );

    $insUser->execute(['admin@medqueue.demo', $adminPassword, 'admin', 'Admin', 0, 1]);

    $insUser->execute(['patient@medqueue.demo', $patientPassword, 'patient', 'Ratan Mitra', 0, 0]);
    $patientUserId = (int) $pdo->lastInsertId();
    $insPatient = $pdo->prepare(
        'INSERT INTO patients (user_id, public_code, phone, condition_note, joined_at)
         VALUES (?, \'PAT-1023\', \'+91 55500 01023\', \'Routine cardiology follow-up\', NOW())'
    );
    $insPatient->execute([$patientUserId]);

    $doctors = [
        [1, 'sarah.chen@medqueue.hospital', 'Dr. Sarah Chen', 'Cardiology', 'Room 201', 12, 4.9, 'photo-1559839734-2b71ea197ec2', 1],
        [2, 'marcus.reid@medqueue.hospital', 'Dr. Marcus Reid', 'Neurology', 'Room 305', 18, 4.7, 'photo-1612349317150-e413f6a5b16d', 1],
        [3, 'priya.nair@medqueue.hospital', 'Dr. Priya Nair', 'Pediatrics', 'Room 102', 8, 4.8, 'photo-1582750433449-648ed127bb54', 1],
        [4, 'james.okafor@medqueue.hospital', 'Dr. James Okafor', 'Orthopedics', 'Room 410', 0, 4.6, 'photo-1537368910025-700350fe46c7', 0],
        [5, 'layla.hassan@medqueue.hospital', 'Dr. Layla Hassan', 'Dermatology', 'Room 208', 15, 4.9, 'photo-1594824476967-48c8b964273f', 1],
        [6, 'tom.eriksson@medqueue.hospital', 'Dr. Tom Eriksson', 'ENT', 'Room 316', 10, 4.5, 'photo-1622253692010-333f2da6031d', 1],
        [7, 'aisha.mbeki@medqueue.hospital', 'Dr. Aisha Mbeki', 'General Medicine', 'Room 101', 6, 4.7, 'photo-1551601651-2a8555f1a136', 1],
        [8, 'carlos.vega@medqueue.hospital', 'Dr. Carlos Vega', 'Cardiology', 'Room 202', 14, 4.8, 'photo-1480429370139-e0132c086e2a', 1],
    ];

    foreach ($doctors as $d) {
        [$id, $email, $name, $spec, $room, $wait, $rating, $photo, $available] = $d;
        $insUser->execute([$email, $doctorPassword, 'doctor', $name, 0, 0]);
        $userId = (int) $pdo->lastInsertId();
        $insDoctor->execute([$id, $userId, $specIds[$spec], $room, $wait, $rating, $photo, $available]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

fwrite(STDOUT, "Seed complete. Demo credentials: docs/DEMO_CREDENTIALS.md\n");
