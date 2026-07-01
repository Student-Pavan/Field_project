#!/bin/sh
set -e

PORT="${PORT:-8000}"
MAX_DB_WAIT="${MAX_DB_WAIT:-120}"
WAITED=0

echo "Waiting for database (max ${MAX_DB_WAIT}s)..."
until python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def check():
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as conn:
        await conn.execute(text('SELECT 1'))
    await engine.dispose()

asyncio.run(check())
"; do
  if [ "$WAITED" -ge "$MAX_DB_WAIT" ]; then
    echo "ERROR: Database not reachable after ${MAX_DB_WAIT}s."
    echo "Check DATABASE_URL on Render (postgresql+asyncpg://...?ssl=require)."
    exit 1
  fi
  sleep 2
  WAITED=$((WAITED + 2))
done

echo "Database is ready."

echo "Running migrations..."
alembic upgrade head

echo "Seeding database (if empty)..."
python -m app.db.seed

echo "Starting server on 0.0.0.0:${PORT}..."
if [ "$BACKEND_RELOAD" = "true" ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
else
  WORKERS="${WEB_CONCURRENCY:-1}"
  exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --workers "$WORKERS"
fi
