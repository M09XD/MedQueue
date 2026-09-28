INSERT INTO specialties (name, is_active, created_at, updated_at) VALUES
('Cardiology', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Neurology', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Orthopedics', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Pediatrics', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Dermatology', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('ENT', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('General Medicine', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active), updated_at = UTC_TIMESTAMP();

-- Demo admin account password: Admin#12345 (hash generated for development only)
INSERT INTO users (email, password_hash, role, status, created_at, updated_at) VALUES
('admin@medqueue.local', '$2y$10$CdwuWQXj2f0WbQJ9Mg7y6eWpTtEkulhqE6f6xv6rRP4h4f3A46KfK', 'admin', 'active', UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE email = VALUES(email), role = VALUES(role), status = VALUES(status), updated_at = UTC_TIMESTAMP();

INSERT INTO system_settings (setting_key, value_json, updated_by, updated_at) VALUES
('queue.daily_limit', CAST('50' AS JSON), NULL, UTC_TIMESTAMP()),
('queue.max_queue_size', CAST('100' AS JSON), NULL, UTC_TIMESTAMP()),
('queue.auto_skip_called_minutes', CAST('15' AS JSON), NULL, UTC_TIMESTAMP()),
('queue.emergency_enabled', CAST('true' AS JSON), NULL, UTC_TIMESTAMP()),
('app.timezone', CAST('"Asia/Dhaka"' AS JSON), NULL, UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = UTC_TIMESTAMP();

INSERT INTO user_permissions (user_id, permission, created_at)
SELECT id, 'reports.read_full', UTC_TIMESTAMP() FROM users WHERE email = 'admin@medqueue.local'
ON DUPLICATE KEY UPDATE created_at = VALUES(created_at);
