CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('patient','doctor','admin') NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS specialties (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS patients (
  user_id INT UNSIGNED PRIMARY KEY,
  patient_code VARCHAR(32) NOT NULL UNIQUE,
  full_name VARCHAR(140) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  condition_text TEXT NULL,
  joined_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS doctors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  specialty_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(140) NOT NULL,
  room_no VARCHAR(40) NOT NULL,
  photo_url VARCHAR(500) NULL,
  token_prefix VARCHAR(4) NOT NULL,
  avg_wait_minutes INT UNSIGNED NOT NULL DEFAULT 10,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  work_start TIME NOT NULL DEFAULT '00:00:00',
  work_end TIME NOT NULL DEFAULT '23:59:59',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_doctors_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_doctors_token_prefix UNIQUE (token_prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS queue_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token_number VARCHAR(32) NOT NULL,
  token_sequence INT UNSIGNED NOT NULL,
  queue_date DATE NOT NULL,
  doctor_id INT UNSIGNED NOT NULL,
  patient_user_id INT UNSIGNED NOT NULL,
  status ENUM('waiting','called','in_progress','completed','skipped','cancelled') NOT NULL,
  is_emergency TINYINT(1) NOT NULL DEFAULT 0,
  estimated_wait_minutes INT UNSIGNED NOT NULL DEFAULT 0,
  called_at DATETIME NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancel_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  active_patient_key VARCHAR(120) AS (
    CASE WHEN status IN ('waiting','called','in_progress')
      THEN CONCAT('P', patient_user_id)
      ELSE NULL
    END
  ) STORED,
  active_doctor_service_key VARCHAR(120) AS (
    CASE WHEN status IN ('called','in_progress')
      THEN CONCAT('D', doctor_id)
      ELSE NULL
    END
  ) STORED,
  CONSTRAINT fk_tokens_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_tokens_patient FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_token_sequence UNIQUE (doctor_id, queue_date, token_sequence),
  CONSTRAINT uq_token_number UNIQUE (doctor_id, queue_date, token_number),
  CONSTRAINT uq_active_patient_key UNIQUE (active_patient_key),
  CONSTRAINT uq_active_doctor_service_key UNIQUE (active_doctor_service_key),
  INDEX idx_tokens_doctor_status (doctor_id, status),
  INDEX idx_tokens_patient_created (patient_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medical_reports (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  queue_token_id INT UNSIGNED NOT NULL UNIQUE,
  doctor_user_id INT UNSIGNED NOT NULL,
  patient_user_id INT UNSIGNED NOT NULL,
  diagnosis TEXT NOT NULL,
  prescription TEXT NOT NULL,
  follow_up VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_reports_token FOREIGN KEY (queue_token_id) REFERENCES queue_tokens(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reports_doctor_user FOREIGN KEY (doctor_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reports_patient_user FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_reports_patient_updated (patient_user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  value_json JSON NOT NULL,
  updated_by INT UNSIGNED NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INT UNSIGNED NOT NULL,
  permission VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, permission),
  CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id INT UNSIGNED NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_audit_actor_time (actor_user_id, created_at),
  INDEX idx_audit_action_time (action, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key VARCHAR(190) PRIMARY KEY,
  window_start DATETIME NOT NULL,
  hits INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
