# Repository Cleanup Policy

## Current Runtime Standard

The current project runtime is based on separated VMs.

| Server | Runtime |
|---|---|
| DB-VM | MySQL direct install |
| FLASK-VM | Python venv |
| FRONTEND-VM | Node.js/npm |
| AI-VM | Docker |
| ITS-VM | Python/FastAPI |
| LLM Server | AI-VM internal service |

## Docker Runtime Policy

Docker is officially used only inside AI-VM.

- AI-VM uses Docker for services under `ai-vm/`, including `ai-vm/llm-server`.
- DB-VM, FLASK-VM, FRONTEND-VM, and ITS-VM do not use Docker in the current VM runtime.
- Non-AI Docker files are kept only for legacy/local development reference unless the team agrees to remove them.

## Keep

The following directories are part of the current project structure.

- db-vm/
- flask-vm/
- frontend-vm/
- its-vm/
- ai-vm/
- docs/infra/

## Do Not Commit

The following files and directories are runtime/local-only files and must not be committed.

- .env
- .env.local
- .venv/
- node_modules/
- __pycache__/
- *.pyc
- .next/
- runtime files under storage/

## Legacy / Review Required

The following files may include previous local or Docker-based development assumptions.
Do not delete them without team agreement.

- root docker-compose.yml
- root .dockerignore
- flask-vm/Dockerfile
- flask-vm/.dockerignore
- old local development instructions
- version files that conflict with actual VM runtime

## Current Verified Connections

- FRONTEND-VM -> FLASK-VM: success
- FLASK-VM -> DB-VM: success
- FLASK-VM -> AI-VM LLM 8000: success
- FLASK-VM -> AI-VM AI 8001: currently not running or not exposed

## Cleanup Direction

1. Keep VM-based runtime documents under docs/infra.
2. Mark old local/Docker instructions as legacy if still needed.
3. Remove or move legacy files only after team agreement.
4. Do not commit actual environment files or runtime-generated files.

## Related Documents

- docs/infra/server-folder-map.md
- docs/infra/vm-server-status.md
- docs/infra/env-guide.md
