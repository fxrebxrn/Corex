#!/bin/sh

echo "Waiting for database..."

alembic upgrade head

echo "Database is up to date."

echo "Starting FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000