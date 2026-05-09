# Legacy Notice:
# FLASK-VM currently runs with Python venv, not Docker.
# This Dockerfile is kept for legacy/local development reference only.
# Current official Docker runtime is limited to AI-VM.
# See docs/infra/server-folder-map.md.
﻿FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "run.py"]
