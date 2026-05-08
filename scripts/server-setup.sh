#!/usr/bin/env bash
# One-command backend setup for a fresh Ubuntu 22.04 VPS.
# Run as root: bash <(curl -fsSL https://raw.githubusercontent.com/newajme/hearthline/main/scripts/server-setup.sh)
set -euo pipefail

echo "=== Hearthline backend setup ==="

# ── 1. Install Docker ────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[1/6] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "[1/6] Docker already installed."
fi

# ── 2. Clone repo ────────────────────────────────────────────────────────────
echo "[2/6] Cloning repo..."
if [ -d /opt/hearthline ]; then
  cd /opt/hearthline && git pull origin main
else
  git clone https://github.com/newajme/hearthline.git /opt/hearthline
  cd /opt/hearthline
fi

# ── 3. Write .env ────────────────────────────────────────────────────────────
echo "[3/6] Writing .env..."
SERVER_IP=$(curl -fsSL https://api.ipify.org)

cat > /opt/hearthline/.env <<EOF
# ── Postgres (runs in Docker on this host) ───────────────────────────────────
POSTGRES_DB=hearthline
POSTGRES_USER=hearthline
POSTGRES_PASSWORD=pA22jrOxSvKh3xutKAr69N_QEVsLQUhE
POSTGRES_HOST=db
POSTGRES_PORT=5432

# ── Django ───────────────────────────────────────────────────────────────────
DJANGO_SECRET_KEY=04740+^m#yxvh)9apx@r&sncp3*!5g8aiig)#zavvtl@%1t_yax1j@3oi*7#
DJANGO_DEBUG=0
HEARTHLINE_ENCRYPTION_KEY=FWren1Z1wjuu-kZOtxib1Xw8l58EKo7B5BcM5vCN26I=
HEARTHLINE_LOG_LEVEL=INFO
HEARTHLINE_ADMIN_PASSWORD=-wNCVVQNfR9j4IVlIvVVnw

# ── Vapi ─────────────────────────────────────────────────────────────────────
VAPI_WEBHOOK_SECRET=61b92de2da4b54b3ac365f29088484e5adbe73df1806de0d16d06cda9a0136f1

# ── AI (add your keys) ───────────────────────────────────────────────────────
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# ── Voice (add your keys) ────────────────────────────────────────────────────
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# ── Domains ──────────────────────────────────────────────────────────────────
API_DOMAIN=api.hearthline.${SERVER_IP}.nip.io
APP_DOMAIN=app.hearthline.${SERVER_IP}.nip.io
FRONTEND_ORIGIN=https://frontend-kohl-nine-86.vercel.app,https://app.hearthline.${SERVER_IP}.nip.io

# ── CORS ─────────────────────────────────────────────────────────────────────
DJANGO_ALLOWED_HOSTS=api.hearthline.${SERVER_IP}.nip.io,localhost,127.0.0.1,backend
DJANGO_CORS_ALLOWED_ORIGINS=https://frontend-kohl-nine-86.vercel.app,https://app.hearthline.${SERVER_IP}.nip.io

# ── Frontend → Backend ───────────────────────────────────────────────────────
INTERNAL_API_URL=http://backend:8000/api
NEXT_PUBLIC_API_URL=https://api.hearthline.${SERVER_IP}.nip.io/api
NEXT_PUBLIC_ADMIN_URL=https://api.hearthline.${SERVER_IP}.nip.io/admin
EOF

echo "    Server IP: $SERVER_IP"
echo "    API will be at: https://api.hearthline.${SERVER_IP}.nip.io"

# ── 4. Add Postgres to prod compose ─────────────────────────────────────────
# docker-compose.prod.yml expects an external DB by default.
# We patch in a local Postgres service so no external DB is needed.
echo "[4/6] Patching docker-compose for local Postgres..."
cat > /opt/hearthline/docker-compose.server.yml <<'COMPOSE'
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file: .env
    volumes:
      - hearthline_pgdata:/var/lib/postgresql/data
    expose:
      - "5432"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    env_file: .env
    environment:
      DJANGO_DEBUG: "0"
      DJANGO_ALLOWED_HOSTS: ${API_DOMAIN},backend,localhost,127.0.0.1
      DJANGO_CORS_ALLOWED_ORIGINS: ${FRONTEND_ORIGIN}
      QUOTE_PDF_DIR: /var/data/quotes
      DJANGO_CACHE_DIR: /var/data/django-cache
      DATABASE_URL: postgres://hearthline:${POSTGRES_PASSWORD}@db:5432/hearthline
    volumes:
      - hearthline_quote_pdfs:/var/data/quotes
      - hearthline_django_cache:/var/data/django-cache
    expose:
      - "8000"
    depends_on:
      - db

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    environment:
      API_DOMAIN: ${API_DOMAIN}
      APP_DOMAIN: ${APP_DOMAIN}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend

volumes:
  caddy_data:
  caddy_config:
  hearthline_pgdata:
  hearthline_quote_pdfs:
  hearthline_django_cache:
COMPOSE

# ── 5. Start stack ───────────────────────────────────────────────────────────
echo "[5/6] Starting Docker stack..."
cd /opt/hearthline
docker compose -f docker-compose.server.yml up -d --build

echo "    Waiting 20s for DB to be ready..."
sleep 20

# ── 6. Seed data ─────────────────────────────────────────────────────────────
echo "[6/6] Running migrations and seeding demo data..."
docker compose -f docker-compose.server.yml exec -T backend python manage.py migrate --noinput
docker compose -f docker-compose.server.yml exec -T backend python manage.py seed_demo --wipe
docker compose -f docker-compose.server.yml exec -T backend python manage.py seed_admin

SERVER_IP=$(curl -fsSL https://api.ipify.org)
echo ""
echo "============================================================"
echo "  Hearthline backend is running!"
echo ""
echo "  API:    https://api.hearthline.${SERVER_IP}.nip.io/api"
echo "  Admin:  https://api.hearthline.${SERVER_IP}.nip.io/admin"
echo ""
echo "  Login:  admin / -wNCVVQNfR9j4IVlIvVVnw"
echo "============================================================"
echo ""
echo "  Next: update your Vercel env var NEXT_PUBLIC_API_URL to:"
echo "  https://api.hearthline.${SERVER_IP}.nip.io/api"
echo "============================================================"
