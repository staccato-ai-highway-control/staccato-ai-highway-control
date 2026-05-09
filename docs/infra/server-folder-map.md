# Server Folder Map

## Overview

This project uses a single Git repository with separated VM runtime servers.

The repository contains multiple server folders, but each VM should only check out and run the folders required for its role.

## VM and Folder Mapping

| VM | IP | Repository Folders | Runtime |
|---|---:|---|---|
| AI-VM | 192.168.0.186 | ai-vm, docs | Docker |
| FLASK-VM | 192.168.0.187 | flask-vm, docs | Python venv |
| FRONTEND-VM | 192.168.0.188 | frontend-vm, docs | Node.js/npm |
| ITS-VM | 192.168.0.189 | its-vm, docs | Python/FastAPI |
| DB-VM | 192.168.0.190 | db-vm, docs | MySQL direct install |

## Important Rule

There are 5 VMs, and each VM has one primary runtime folder.

`ai-vm/llm-server` is not a root-level server folder and does not have a separate VM.

`ai-vm/llm-server` runs inside AI-VM.

## Recommended Sparse Checkout

### AI-VM

    git sparse-checkout set ai-vm docs

### FLASK-VM

    git sparse-checkout set flask-server docs .python-version

### FRONTEND-VM

    git sparse-checkout set frontend-server docs .nvmrc

### ITS-VM

    git sparse-checkout set its-server docs .python-version

### DB-VM

    git sparse-checkout set db-server docs

## Runtime Responsibility

### DB-VM

- Owns MySQL database runtime
- Applies SQL files from db-vm/init
- Allows MySQL port only from FLASK-VM

### FLASK-VM

- Owns backend API gateway
- Connects to DB-VM
- Connects to AI-VM LLM server
- Exposes Flask API to FRONTEND-VM

### FRONTEND-VM

- Owns Next.js frontend runtime
- Connects to FLASK-VM API

### AI-VM

- Owns AI-VM Docker runtime
- Owns LLM mock/report server
- Uses Docker runtime

### ITS-VM

- Owns ITS traffic/weather integration server

## Do Not Commit

- .env
- .env.local
- .venv/
- node_modules/
- __pycache__/
- *.pyc
- .next/
- runtime storage files

## Legacy / Review Required

The following files may exist for local development or previous Docker-based development.

Do not delete them without team agreement.

- root docker-compose.yml
- root .dockerignore
- server-specific Dockerfiles not currently used by VM runtime
- old local development instructions
