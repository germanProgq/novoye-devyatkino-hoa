# novoye-devyatkino-hoa

Resident services portal for a homeowners association (HOA / ТСЖ). A C++17 backend serves HOA documents and resident data over HTTP, backed by PostgreSQL, with a React frontend for residents and admins.

## What it does

- Document downloads from a bundled document set
- News posts
- Service requests with status tracking
- Meter readings
- Contributions and account records
- Authentication with JWT sessions and a bootstrap admin account

## Layout

- `backend`: C++17 HTTP server (cpp-httplib), PostgreSQL via libpq, JWT and hashing via OpenSSL. Modules: `auth`, `documents`, `news`, `contributions`, `meters`, `accounts`, `requests`.
- `frontend`: React 19 with Vite, React Router, Tailwind, and Recharts. Pages for the dashboard, documents, news, requests, meter readings, resident info, login, and admin.
- `docker-compose.yml`: runs PostgreSQL, the backend, and the frontend together.
- `scripts`: VPS deploy and self-heal helpers.

## Backend build

Requires CMake 3.14+, a C++17 compiler, PostgreSQL client libraries, and OpenSSL.

```bash
cmake -S backend -B backend/build
cmake --build backend/build
```

## Backend run

```bash
cd backend
HOA_JWT_SECRET=your-secret ./build/hoa_backend
```

Defaults to port `8080`. Override with `PORT=3001`. `HOA_JWT_SECRET` is required. The server locates `documents/manifest.json` automatically, or set `HOA_DOCS_ROOT` to an absolute path.

## Full stack with Docker

```bash
cp .env.example .env
# edit .env and replace every example secret with your own value
docker compose up --build
```

If you change database credentials after the volume already exists, reset the `db_data` volume once so Postgres reinitializes.

## Notes

`.env.example` ships with placeholder secrets only. Set your own values before deploying and keep real secrets out of version control. CORS origins and the public domain are configured through `.env`.
