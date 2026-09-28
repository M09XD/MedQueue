# MedQueue demo credentials (v1, not production)

These accounts are created by `Backend/scripts/seed.php`. Passwords are stored as hashes only. Do not reuse them outside this course demo.

| Role | Email | Password | Notes |
|------|-------|----------|--------|
| Admin | `admin@medqueue.demo` | `AdminDemo!23` | Seed grants `can_view_clinical_reports`. The admin **role alone** does not grant report access in code. |
| Patient | `patient@medqueue.demo` | `PatientDemo!23` | Public code `PAT-1023`. |
| Doctor | `sarah.chen@medqueue.hospital` | `DoctorDemo!23` | Same password for all eight seeded doctors. |
| Doctor | `marcus.reid@medqueue.hospital` | `DoctorDemo!23` | |
| Doctor | `priya.nair@medqueue.hospital` | `DoctorDemo!23` | |
| Doctor | `james.okafor@medqueue.hospital` | `DoctorDemo!23` | Shift `is_available = 0` in seed (matches prototype). |
| Doctor | `layla.hassan@medqueue.hospital` | `DoctorDemo!23` | |
| Doctor | `tom.eriksson@medqueue.hospital` | `DoctorDemo!23` | |
| Doctor | `aisha.mbeki@medqueue.hospital` | `DoctorDemo!23` | |
| Doctor | `carlos.vega@medqueue.hospital` | `DoctorDemo!23` | |

Doctors created later by an admin receive a **server-generated** temporary password and `must_change_password = 1`.
