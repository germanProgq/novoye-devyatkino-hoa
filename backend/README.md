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

## Docker (backend + Postgres)

```
docker-compose up --build
```

- Backend listens on `http://localhost:8080`
- Postgres exposed on host port `55432` (internal 5432), credentials: `hoa/hoa_pass`, db `hoa`
- Seed data comes from `backend/db/init.sql` and documents are baked into the image at `/app/documents/files`

Auto-rebuild on C++ changes during development:

```
docker compose watch backend
```

This uses the `develop.watch` rule in `docker-compose.yml` to rebuild and restart the backend container whenever files in `./backend` change.

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
- `GET/POST /api/requests` – заявки жителей (создать может пользователь, обрабатывать – админ), `PUT .../:id/status` и `POST .../:id/comments` для смены статуса и комментариев.

CORS is open for GET/OPTIONS to simplify local frontend development.
