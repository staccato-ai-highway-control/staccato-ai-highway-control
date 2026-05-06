# STACCATO Development Environment

## 1. Runtime Versions

| Area | Version |
|---|---|
| Python | 3.11.x |
| Node.js | 20.x |
| MySQL | 8.0.x |
| Docker Compose | v2 |

## 2. Docker Base Images

| Service | Base Image |
|---|---|
| flask-server | python:3.11-slim |
| ai-server | python:3.11-slim |
| llm-server | python:3.11-slim |
| its-server | python:3.11-slim |
| frontend-server | node:20-alpine |
| db-server | mysql:8.0 |

## 3. Verified Versions

| Area | Version |
|---|---|
| Python | 3.11.15 |
| Node.js | 20.20.2 |
| MySQL | 8.0.46 |

## 4. Version Check Commands

### Local

```powershell
python --version
node -v
npm -v
docker --version
docker compose version