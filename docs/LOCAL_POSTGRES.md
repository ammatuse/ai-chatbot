# Local PostgreSQL with Docker (macOS)

This guide shows how to run a local PostgreSQL database for development using Docker on macOS. It is tailored for this repo (ai-chatbot) and explains how to set your `.env.local` and run database migrations.

If you use Docker Desktop, you can skip Colima. If you prefer a lightweight runtime, use Colima (recommended for Apple Silicon).

## Prerequisites

- One container runtime:
  - EITHER Docker Desktop for Mac (just install and ensure it's running), OR
  - Colima via Homebrew: `brew install colima` → start: `colima start`
- Docker CLI on your PATH (comes with Docker Desktop; for Colima: `brew install docker`)
- Optional but recommended: `psql` client
  - `brew install libpq`
  - Add to PATH (zsh): `echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc && exec zsh`
  - Verify: `psql --version`

## Option A — One-liner (docker run)

This starts a local Postgres 16 container with a persistent Docker volume.

```bash
# Adjust values if you like; these defaults match examples below
export PG_NAME=chatbot
export PG_USER=ai
export PG_PASSWORD=ai_password
export PG_PORT=5432

# Create/run container
docker run -d \
  --name ai-chatbot-postgres \
  -e POSTGRES_DB="$PG_NAME" \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD="$PG_PASSWORD" \
  -p "$PG_PORT":5432 \
  -v ai_chatbot_pgdata:/var/lib/postgresql/data \
  --health-cmd="pg_isready -U $PG_USER -d $PG_NAME" \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=5 \
  postgres:16

# Wait until healthy
watch -n 1 'docker ps --filter name=ai-chatbot-postgres --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

Connect with psql:

```bash
psql "postgres://$PG_USER:$PG_PASSWORD@localhost:$PG_PORT/$PG_NAME"
# or via container: docker exec -it ai-chatbot-postgres psql -U "$PG_USER" -d "$PG_NAME"
```

## Option B — docker-compose.yml

Create a file named `docker-compose.yml` anywhere (e.g. project root) with:

```yaml
services:
  db:
    image: postgres:16
    container_name: ai-chatbot-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: chatbot
      POSTGRES_USER: ai
      POSTGRES_PASSWORD: ai_password
    ports:
      - "5432:5432"
    volumes:
      - ai_chatbot_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai -d chatbot"]
      interval: 10s
      timeout: 5s
      retries: 5
volumes:
  ai_chatbot_pgdata:
```

Then run:

```bash
docker compose up -d
```

## Configure this project (.env.local)

This repository reads POSTGRES_URL from `.env.local` (see `drizzle.config.ts` and `.env.example`). For the defaults above, set:

```
# .env.local
POSTGRES_URL=postgres://ai:ai_password@localhost:5432/chatbot
```

Tip: copy the example file first:

```bash
cp .env.example .env.local
# then edit .env.local to set POSTGRES_URL and other keys you need
```

No SSL is required for local Postgres. If you previously set `sslmode=require` (for hosted DBs), remove it for local use.

## Initialize database schema

Install dependencies and run migrations using the included scripts:

```bash
pnpm install

# Option 1: apply existing migrations
pnpm db:migrate

# Option 2: push current schema to DB (Drizzle)
# (useful on a fresh DB if you want Drizzle to create tables directly)
pnpm db:push
```

You can inspect the DB using Drizzle Studio:

```bash
pnpm db:studio
```

## Verifying the connection

- Quick SQL check:
  ```bash
  psql "${POSTGRES_URL}"
  # then run: \dt  -- should list tables after migrations
  ```
- App-level check:
  ```bash
  pnpm dev
  # ensure the app can read/write chats and users without DB errors
  ```

## Common issues and fixes

- Port already in use (5432):
  - Find process: `lsof -i :5432`
  - Stop it or map another port: change `-p 5433:5432` and use `localhost:5433` in POSTGRES_URL
- Reset database completely:
  ```bash
  docker stop ai-chatbot-postgres && docker rm ai-chatbot-postgres
  docker volume rm ai_chatbot_pgdata
  # then start the container again
  ```
- Check logs: `docker logs -f ai-chatbot-postgres`
- Container unhealthy: ensure you didn’t change credentials; try `psql` with the same URL to confirm.
- Apple Silicon (M1/M2/M3): `postgres:16` works natively on arm64; if you hit image issues, try `postgres:16-alpine`.

## Notes

- These instructions work with Docker Desktop or Colima. If using Colima, make sure it’s started before `docker` commands: `colima start`.
- The app uses `postgres` (postgres-js) and Drizzle ORM. The connection string format is standard `postgres://user:pass@host:port/db`.
- For hosted environments (Neon/Vercel Postgres), you’ll typically need SSL; keep local dev without SSL for simplicity.


## URL to connect in IntelliJ
jdbc:postgresql://localhost:5432/chatbot?user=ai&password=ai_password