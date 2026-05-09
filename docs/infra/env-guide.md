# Environment Variable Guide

This document describes required environment variables for each server.

Actual .env files must not be committed.

## FLASK-VM .env

Location:

    ~/staccato-flask/flask-vm/.env

Example:

    FLASK_ENV=development
    FLASK_DEBUG=1

    DATABASE_URL=mysql+pymysql://staccato_user:<DB_PASSWORD_URL_ENCODED>@192.168.0.190:3306/staccato

    AI_SERVER_URL=http://192.168.0.186:8001
    ITS_SERVER_URL=http://192.168.0.189:8002

    SECRET_KEY=change-me
    JWT_SECRET_KEY=change-me
    JWT_EXPIRES_HOURS=12

    STORAGE_ROOT=/home/staccato/staccato-flask/storage

## Important Notes

- Do not commit actual passwords.
- If the DB password contains #, encode it as %23 in DATABASE_URL.
- Keep actual .env files only on each VM.
- Use .env.example or documentation for shared examples.
