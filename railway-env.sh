#!/usr/bin/env bash
# Set Clerk environment variables on the Railway "ai-teammates" service.
# Values are read from .env.local and never printed.
set -euo pipefail
cd "$(dirname "$0")"

set -a
. ./.env.local
set +a

export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:7897}"
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:7897}"
export RAILWAY_CALLER="skill:use-railway@1.6.1"
export RAILWAY_AGENT_SESSION="railway-skill-env"

railway variables set --service ai-teammates \
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL" \
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL" \
  "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL" \
  "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL" \
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
  "CLERK_SECRET_KEY=$CLERK_SECRET_KEY" \
  > /dev/null

echo "VARS_SET_OK"
