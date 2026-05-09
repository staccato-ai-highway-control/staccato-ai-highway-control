# DB-VM Setup

## Environment

| Item | Value |
|---|---|
| Hostname | DB-VM |
| IP | 192.168.0.190 |
| OS | Ubuntu 24.04.4 LTS |
| MySQL | 8.0.45 |
| Database | staccato |

## Applied SQL Files

The following SQL files were applied in order.

1. db-vm/init/01_schema.sql
2. db-vm/init/02_seed.sql
3. db-vm/init/03_indexes.sql
4. db-vm/init/04_mvp_extension.sql
5. db-vm/init/05_mvp_extension_indexes.sql

## Verification Result

| Check | Result |
|---|---|
| Table count | 25 |
| Seed data | CCTV-TEST-001 |
| Charset | utf8mb4 |
| Collation | utf8mb4_unicode_ci |
| Timezone | +09:00 |

## Firewall Policy

DB-VM allows MySQL access only from FLASK-VM.

Command used:

    sudo ufw allow from 192.168.0.187 to any port 3306 proto tcp

Expected rule:

    3306/tcp ALLOW 192.168.0.187

## Notes

- Do not allow 3306 from Anywhere.
- Do not commit actual DB passwords.
- Do not re-run init SQL files unless database reset is required.
