#!/usr/bin/env bash
# Sync the environment variables the app needs onto the Railway "ai-teammates"
# service. Values are read from .env.local, piped over stdin, and never printed
# or placed on a command line.
set -euo pipefail
cd "$(dirname "$0")"

set -a
. ./.env.local
set +a

export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:7897}"
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:7897}"
export RAILWAY_CALLER="skill:use-railway@1.7.0"
export RAILWAY_AGENT_SESSION="railway-skill-env"

PROJECT_ID="a47afd85-b066-480a-b522-6752a8508b0a"
ENVIRONMENT_ID="276be4bf-8c4f-41d2-817b-a9cd49e2e49a"
SERVICE="ai-teammates"

KEYS=(
  NEXT_PUBLIC_CLERK_SIGN_IN_URL
  NEXT_PUBLIC_CLERK_SIGN_UP_URL
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  DATABASE_URL
  DATABASE_URL_UNPOOLED
  ALIBABA_API_KEY
  ALIBABA_BASE_URL
  TRIGGER_SECRET_KEY
)

# Set everything in one go so Railway triggers a single redeploy.
for key in "${KEYS[@]}"; do
  printf "%s" "${!key}" | railway variable set "$key" --stdin \
    --project "$PROJECT_ID" \
    --environment "$ENVIRONMENT_ID" \
    --service "$SERVICE" \
    --skip-deploys \
    --json > /dev/null
done

echo "VARS_SET_OK"
