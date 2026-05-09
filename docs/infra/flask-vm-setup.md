# FLASK-VM Setup

## Environment

| Item | Value |
|---|---|
| Hostname | Flask-VM |
| IP | 192.168.0.187 |
| OS | Ubuntu 24.04.4 LTS |
| Python | 3.12.3 |
| Flask | 3.1.3 |
| SQLAlchemy | 2.0.49 |
| PyMySQL | 1.1.3 |
| Flask-SocketIO | 5.6.1 |

## Installed Packages

    sudo apt install -y git curl vim net-tools default-mysql-client python3-venv python3-dev python3-pip build-essential

## Project Checkout

    cd ~

    git clone --filter=blob:none --no-checkout https://github.com/staccato-ai-highway-control/staccato-ai-highway-control.git staccato-flask

    cd staccato-flask

    git sparse-checkout init --cone
    git sparse-checkout set flask-server docs .python-version
    git checkout develop

## Virtual Environment

    cd ~/staccato-flask/flask-vm

    python3 -m venv .venv
    source .venv/bin/activate

    pip install --upgrade pip
    pip install -r requirements.txt

## DB Connection Test

    mysql -h 192.168.0.190 -P 3306 -u staccato_user -p staccato

Verification SQL:

    SHOW TABLES;

    SELECT id, cctv_code, cctv_name, road_name, is_active FROM cctvs;

Expected result:

- 25 tables
- CCTV-TEST-001 seed data exists

## Health Check

    curl http://localhost:5000/health
    curl http://localhost:5000/auth/health

Expected result:

- /health: status ok
- /auth/health: status ok

## Listen Check

    sudo ss -tulnp | grep 5000

Expected result:

    0.0.0.0:5000

## Firewall Policy

FLASK-VM allows Flask API access only from FRONTEND-VM.

    sudo ufw allow from 192.168.0.188 to any port 5000 proto tcp

Expected UFW rule:

    5000/tcp ALLOW 192.168.0.188

## Notes

- Do not commit .env.
- Do not commit .venv.
- Flask server currently runs by python run.py.
- If the terminal running Flask is closed, the server stops.
