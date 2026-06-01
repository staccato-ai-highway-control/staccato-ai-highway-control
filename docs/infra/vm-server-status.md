# STACCATO VM Server Status

## Server Map

| Role | Hostname | IP | Status |
|---|---|---:|---|
| AI-VM | AI-VM | 192.168.0.186 | Pending |
| FLASK-VM | Flask-VM | 192.168.0.187 | 1st setup done |
| FRONTEND-VM | FRONTEND-VM | 192.168.0.188 | Pending |
| DB-VM | DB-VM | 192.168.0.190 | Done |

## Completed Scope

### DB-VM

- MySQL 8.0.45 installed
- `staccato` database created
- DB schema imported from `db-vm/init`
- Table count verified: 25
- Seed data verified: `CCTV-TEST-001`
- Charset: `utf8mb4`
- Collation: `utf8mb4_unicode_ci`
- Timezone: `+09:00`
- Port `3306` allows only FLASK-VM

### FLASK-VM

- Git installed
- MySQL client installed
- Python virtual environment configured
- Python version: 3.12.3
- Flask dependencies installed
- FLASK-VM to DB-VM connection verified
- Flask `/health` verified
- Flask `/auth/health` verified
- Port `5000` allows only FRONTEND-VM

## Network Policy

| Source | Target | Port | Purpose |
|---|---|---:|---|
| FLASK-VM `192.168.0.187` | DB-VM `192.168.0.190` | 3306 | MySQL access |
| FRONTEND-VM `192.168.0.188` | FLASK-VM `192.168.0.187` | 5000 | Flask API access |
