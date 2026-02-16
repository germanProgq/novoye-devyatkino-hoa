# HOA Backend (C++)

Lightweight C++ HTTP backend that serves the real HOA documents bundled in `documents/`.

## Build

```
cmake -S backend -B backend/build
cmake --build backend/build
```

Requires CMake 3.14+ and a C++17 compiler (tested with clang on macOS).

## Run

```
cd backend
./build/hoa_backend
```

Defaults to port `8080`. Override with `PORT=3001 ./build/hoa_backend`. The server tries to locate `documents/manifest.json` automatically; override with `HOA_DOCS_ROOT=/absolute/path/to/backend/documents`.
If `HOA_JWT_SECRET` is not provided, the backend now generates one and saves it to `backend/documents/.jwt_secret` so that refresh tokens continue to work across restarts (delete the file to rotate the secret).

## Docker (frontend + backend + Postgres)

```
docker compose up --build
```

- Frontend is exposed on `http://localhost:3000`
- Backend is not exposed to the host; frontend proxies backend requests via `/backend/*`
- Postgres is not exposed to the host and is reachable only by backend on internal Docker network (`db:5432`)
- Seed data comes from `backend/db/init.sql` and documents are baked into the image at `/app/documents/files`

Auto-rebuild on C++ changes during development:

```
docker compose watch backend
```

This uses the `develop.watch` rule in `docker-compose.yml` to rebuild and restart the backend container whenever files in `./backend` change.

## VPS deploy + auto-heal

From the repository root on the VPS:

```
sudo ./scripts/deploy_vps.sh
```

If your app is served on a domain (recommended for production), run:

```
sudo DOMAIN=example.com DOMAIN_SCHEME=https ./scripts/deploy_vps.sh
```

This enables public-domain health checks in addition to local checks.

What it does:

- deploys the full Docker stack and waits for health endpoints to respond
- installs `hoa-compose.service` (start stack on boot)
- installs `hoa-self-heal.timer` (checks every minute, recovers stack, reboots host after repeated failures)

Useful checks:

```
sudo systemctl status hoa-compose.service
sudo systemctl status hoa-self-heal.timer
sudo journalctl -u hoa-self-heal.service -n 50 --no-pager
```

Environment overrides (defaults shown) for backend container:

- `PORT=8080`
- `HOA_DB_HOST=db`
- `HOA_DB_PORT=5432`
- `HOA_DB_NAME=hoa`
- `HOA_DB_USER=hoa`
- `HOA_DB_PASSWORD=hoa_pass`
- `HOA_JWT_SECRET=change-me-in-prod`
- `HOA_ADMIN_USERNAME=admin` / `HOA_ADMIN_PASSWORD=admin`
- `HOA_USER_USERNAME=user` / `HOA_USER_PASSWORD=user`
- `HOA_JWT_SECURE_COOKIES=0` (set to `1` behind HTTPS so cookies are `Secure`)
- `HOA_JWT_SAMESITE=Lax` (use `None` with secure cookies if frontend and backend are on different origins)
- `HOA_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:4173,http://localhost:8080`

## API

- `GET /api/documents` – JSON list of documents with metadata, size, and download URLs.
- `GET /api/documents/:id/download` – binary download of the requested document with the original filename.
- `GET /api/contributions` – список взносов жильцов (POST для добавления), `.../parse` для подсказок по ФИО/квартире, `.../summary` для графиков.
- `GET /api/debtors` – список должников (POST/PUT/DELETE для управления записями).
- `POST /auth/login` / `/auth/refresh` / `/auth/logout` / `/auth/me` – JWT-based session endpoints (access/refresh tokens are stored in httpOnly cookies).
- `POST /auth/users` – admin registration by house + phone/full name; returns login + password.
- `PUT /auth/users/:username` – admin phone update; resets password when phone changes or is removed.
- `GET/POST /api/requests` – заявки жителей (создать может пользователь, обрабатывать – админ), `PUT .../:id/status` и `POST .../:id/comments` для смены статуса и комментариев.

CORS is open for GET/OPTIONS to simplify local frontend development.
