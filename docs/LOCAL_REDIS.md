# Local Redis with Docker (macOS)

This guide shows how to run a local Redis server for development using Docker on macOS. It is tailored for this repo (ai-chatbot) and explains how to set your `.env.local`.

If you use Docker Desktop, you can skip Colima. If you prefer a lightweight runtime, use Colima (recommended for Apple Silicon).

## Prerequisites

- One container runtime:
  - EITHER Docker Desktop for Mac (just install and ensure it's running), OR
  - Colima via Homebrew: `brew install colima` → start: `colima start`
- Docker CLI on your PATH (comes with Docker Desktop; for Colima: `brew install docker`)
- Optional but recommended: `redis-cli`
  - `brew install redis`
  - Verify: `redis-cli --version`

## Option A — One-liner (docker run)

This starts a local Redis 7 container with a persistent Docker volume.

```bash
# Adjust values if you like; the defaults match examples below
export REDIS_PORT=6379
# Optional password (uncomment to enable auth)
# export REDIS_PASSWORD=devpassword

# Create/run container (no password)
docker run -d \
  --name ai-chatbot-redis \
  -p "$REDIS_PORT":6379 \
  -v ai_chatbot_redisdata:/data \
  --health-cmd="redis-cli ping" \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=5 \
  redis:7-alpine \
  redis-server --save 60 1 --loglevel warning


# If you want a password, stop/remove the above and use this instead:
# docker run -d \
#   --name ai-chatbot-redis \
#   -e REDIS_PASSWORD="$REDIS_PASSWORD" \
#   -p "$REDIS_PORT":6379 \
#   -v ai_chatbot_redisdata:/data \
#   --health-cmd="redis-cli -a $REDIS_PASSWORD ping" \
#   --health-interval=10s \
#   --health-timeout=5s \
#   --health-retries=5 \
#   redis:7-alpine \
#   sh -c 'redis-server --save 60 1 --loglevel warning --requirepass "$REDIS_PASSWORD"'

# Watch for healthy status
watch -n 1 'docker ps --filter name=ai-chatbot-redis --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

Quick check:

```bash
# no password
redis-cli -p "$REDIS_PORT" ping
# with password
# redis-cli -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping
```

## Option B — docker-compose.yml

Create a file named `docker-compose.yml` anywhere (e.g. project root) with:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: ai-chatbot-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - ai_chatbot_redisdata:/data
    command: ["redis-server", "--save", "60", "1", "--loglevel", "warning"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
# If you want to enable a password, use this instead:
#  redis:
#    image: redis:7-alpine
#    container_name: ai-chatbot-redis
#    restart: unless-stopped
#    environment:
#      REDIS_PASSWORD: devpassword
#    ports:
#      - "6379:6379"
#    volumes:
#      - ai_chatbot_redisdata:/data
#    command: ["sh", "-c", "exec redis-server --save 60 1 --loglevel warning --requirepass \"$REDIS_PASSWORD\""]
#    healthcheck:
#      test: ["CMD", "sh", "-c", "redis-cli -a $REDIS_PASSWORD ping"]
#      interval: 10s
#      timeout: 5s
#      retries: 5
volumes:
  ai_chatbot_redisdata:
```

Then run:

```bash
docker compose up -d
```

## Configure this project (.env.local)

This repository reads `REDIS_URL` from `.env.local` (see `.env.example`). Set:

```
# .env.local
# No password
REDIS_URL=redis://localhost:6379

# With password (default username is "default")
# REDIS_URL=redis://default:devpassword@localhost:6379
```

Tip: copy the example file first:

```bash
cp .env.example .env.local
# then edit .env.local to set REDIS_URL and other keys you need
```

## Verifying the connection

- Ping using redis-cli:
  ```bash
  redis-cli -u "$REDIS_URL" ping
  # should print: PONG
  ```
- App-level check:
  ```bash
  pnpm dev
  # start a chat; streaming should work without REDIS_URL errors
  ```

## Common issues and fixes

- Port already in use (6379):
  - Find process: `lsof -i :6379`
  - Stop it or map another port: change `-p 6380:6379` and use `redis://localhost:6380` in REDIS_URL
- Reset data completely:
  ```bash
  docker stop ai-chatbot-redis && docker rm ai-chatbot-redis
  docker volume rm ai_chatbot_redisdata
  # then start the container again
  ```
- Check logs: `docker logs -f ai-chatbot-redis`
- Container unhealthy: ensure your password in REDIS_URL matches the container config if you enabled auth.
- Apple Silicon (M1/M2/M3): `redis:7-alpine` works natively on arm64.

## Notes

- These instructions work with Docker Desktop or Colima. If using Colima, make sure it’s started before `docker` commands: `colima start`.
- The connection string format is standard `redis://[user:password@]host:port`.
- For hosted environments (e.g. Upstash, Vercel Redis), you’ll typically use a passworded URL; keep local dev without a password for simplicity unless you need parity.
