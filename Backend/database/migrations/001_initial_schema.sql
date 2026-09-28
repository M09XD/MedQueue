CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('patient', 'doctor', 'admin') NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    phone VARCHAR(40) NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CHECK (email <> '')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS specialties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doctor_profiles (
    user_id INT PRIMARY KEY,
    specialty_id INT NOT NULL,
    room VARCHAR(40) NOT NULL,
    photo_url VARCHAR(512) NULL,
    work_start TIME NOT NULL DEFAULT '00:00:00',
    work_end TIME NOT NULL DEFAULT '23:59:00',
    token_prefix VARCHAR(6) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uq_doctor_prefix (token_prefix),
    CONSTRAINT fk_doctor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_doctor_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (token_prefix REGEXP '^[A-Z0-9]{1,6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(120) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role ENUM('patient', 'doctor', 'admin') NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role, permission_id),
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_config (
    config_key VARCHAR(120) PRIMARY KEY,
    config_value VARCHAR(255) NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_id INT NULL,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    diagnosis TEXT NOT NULL,
    prescription TEXT NOT NULL,
    follow_up_at DATETIME NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_reports_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_reports_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS queue_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_uid CHAR(24) NOT NULL UNIQUE,
    token_number VARCHAR(20) NOT NULL,
    sequence_no INT NOT NULL,
    business_date DATE NOT NULL,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    status ENUM('waiting', 'called', 'in_progress', 'completed', 'cancelled', 'skipped', 'auto_skipped') NOT NULL,
    is_emergency TINYINT(1) NOT NULL DEFAULT 0,
    called_at DATETIME NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    cancel_reason VARCHAR(255) NULL,
    report_id INT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    active_patient_id INT AS (CASE WHEN status IN ('waiting', 'called', 'in_progress') THEN patient_id ELSE NULL END) STORED,
    active_doctor_serving_id INT AS (CASE WHEN status = 'in_progress' THEN doctor_id ELSE NULL END) STORED,
    UNIQUE KEY uq_token_per_doctor_day_seq (doctor_id, business_date, sequence_no),
    UNIQUE KEY uq_token_per_doctor_day_number (doctor_id, business_date, token_number),
    UNIQUE KEY uq_one_active_token_per_patient (active_patient_id),
    UNIQUE KEY uq_one_in_progress_per_doctor (active_doctor_serving_id),
    KEY idx_doctor_status_sequence (doctor_id, status, sequence_no),
    KEY idx_patient_history (patient_id, id),
    CONSTRAINT fk_queue_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_queue_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_queue_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE reports
    ADD CONSTRAINT fk_reports_token FOREIGN KEY (token_id) REFERENCES queue_tokens(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id INT NULL,
    meta_json JSON NULL,
    created_at DATETIME NOT NULL,
    KEY idx_audit_entity (entity_type, entity_id),
    KEY idx_audit_actor_time (actor_user_id, created_at),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
