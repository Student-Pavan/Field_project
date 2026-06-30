# Cable Automation Workflow Simulator

A production-ready platform for designing, simulating, and monitoring cable manufacturing automation workflows. Built with React + FastAPI, real-time WebSocket updates, and SimPy-based discrete-event simulation.

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Frontend     | React 18, Vite, Material UI, React Flow |
| Backend      | FastAPI, Python 3.12                |
| Database     | PostgreSQL 16, SQLAlchemy (async), Alembic |
| Real-time    | WebSockets                          |
| Simulation   | SimPy (async discrete-event engine) |
| Auth         | JWT (python-jose, passlib/bcrypt)   |
| Containers   | Docker, Docker Compose              |

## Project Structure

```
.
├── docker-compose.yml          # Single-command dev stack
├── docker-compose.prod.yml     # Production overrides
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── api/v1/endpoints/   # REST handlers
│   │   ├── models/             # SQLAlchemy ORM
│   │   ├── schemas/            # Pydantic DTOs
│   │   ├── services/simulation/# SimPy engine
│   │   └── websockets/         # Live simulation events
│   ├── alembic/                # Database migrations
│   └── tests/
└── frontend/
    └── src/
        ├── api/                # Axios client
        ├── auth/               # JWT auth context
        ├── components/         # UI building blocks
        ├── pages/              # Route views
        └── hooks/              # useWebSocket, useAsyncData
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended), **or**
- Python 3.12+, Node.js 22+, PostgreSQL 16

## Quick Start (Docker)

```bash
# 1. Enter the project
cd cable-automation-simulator   # or project_feild

# 2. Create environment file
cp .env.example .env

# 3. Start all services (migrations + seed run automatically)
docker compose up --build

# 4. Open the app
# Frontend:  http://localhost:5173
# API docs:  http://localhost:8000/docs
# Health:    http://localhost:8000/health
```

Login with seeded credentials: **`admin@cablesim.local`** / **`CableSim123!`**

### Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Frontend is served on port **80** via nginx with API/WebSocket proxying.

## Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp ../.env.example .env
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## API Overview

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/api/v1/auth/register` | Register user |
| `POST` | `/api/v1/auth/login` | Obtain JWT |
| `POST` | `/api/v1/auth/refresh` | Refresh token |
| `GET`  | `/api/v1/auth/me` | Current user |
| `GET`  | `/api/v1/production-orders` | List orders |
| `GET`  | `/api/v1/machines` | List machines |
| `GET`  | `/api/v1/workflows` | List workflow steps |
| `GET/POST` | `/api/v1/workflow-templates` | Template CRUD |
| `POST` | `/api/v1/simulations/start` | Start simulation |
| `POST` | `/api/v1/reports/generate` | Generate report |
| `WS`   | `/ws/simulations/{session_id}` | Real-time events |

Full interactive docs: http://localhost:8000/docs

## Testing

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm run test && npm run lint
```

## Environment Variables

See [`.env.example`](.env.example). Change `SECRET_KEY` and `POSTGRES_PASSWORD` before production.

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE.md)

## License

MIT
