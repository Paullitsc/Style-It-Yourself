#!/usr/bin/env bash
set -euo pipefail

# Placeholder adapter for VPS deploys.
# Replace with SSH + docker compose pull/up implementation.
# Recommended inputs:
# - DEPLOY_VPS_HOST
# - DEPLOY_VPS_USER
# - DEPLOY_VPS_SSH_KEY
# - BACKEND_IMAGE
# - FRONTEND_IMAGE

if [[ -z "${DEPLOY_VPS_HOST:-}" || -z "${DEPLOY_VPS_USER:-}" || -z "${DEPLOY_VPS_SSH_KEY:-}" ]]; then
  echo "DEPLOY_STATUS=failed"
  echo "DEPLOY_URL="
  echo "Missing VPS credentials for vps adapter" >&2
  exit 1
fi

echo "Deploying to VPS (placeholder)"
echo "Environment: ${DEPLOY_ENVIRONMENT}"
echo "Backend image: ${BACKEND_IMAGE}"
echo "Frontend image: ${FRONTEND_IMAGE}"

echo "DEPLOY_STATUS=success"
echo "DEPLOY_URL=https://example-vps-deployment-url.invalid"
