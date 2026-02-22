#!/usr/bin/env bash
set -euo pipefail

required=(DEPLOY_PROVIDER DEPLOY_ENVIRONMENT BACKEND_IMAGE FRONTEND_IMAGE)
for var in "${required[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required env var: $var" >&2
    exit 1
  fi
done

case "$DEPLOY_PROVIDER" in
  render)
    script="$(dirname "$0")/deploy-render.sh"
    ;;
  vps)
    script="$(dirname "$0")/deploy-vps.sh"
    ;;
  *)
    echo "Unsupported DEPLOY_PROVIDER: $DEPLOY_PROVIDER" >&2
    echo "Supported providers: render, vps" >&2
    exit 1
    ;;
esac

if [[ ! -x "$script" ]]; then
  chmod +x "$script"
fi

deploy_output="$($script)"
echo "$deploy_output"

# Expected adapter output:
# DEPLOY_STATUS=<success|failed>
# DEPLOY_URL=<https://...>
status_line="$(printf '%s\n' "$deploy_output" | grep '^DEPLOY_STATUS=' || true)"
url_line="$(printf '%s\n' "$deploy_output" | grep '^DEPLOY_URL=' || true)"

status="${status_line#DEPLOY_STATUS=}"
url="${url_line#DEPLOY_URL=}"

if [[ -z "$status" ]]; then
  echo "Adapter did not return DEPLOY_STATUS" >&2
  exit 1
fi

if [[ "$status" != "success" ]]; then
  echo "Deployment failed with status: $status" >&2
  exit 1
fi

if [[ -n "$GITHUB_STEP_SUMMARY" ]]; then
  {
    echo "## Deployment Result"
    echo "- Provider: \`$DEPLOY_PROVIDER\`"
    echo "- Environment: \`$DEPLOY_ENVIRONMENT\`"
    echo "- Backend image: \`$BACKEND_IMAGE\`"
    echo "- Frontend image: \`$FRONTEND_IMAGE\`"
    if [[ -n "${BACKEND_DIGEST:-}" ]]; then
      echo "- Backend digest: \`$BACKEND_DIGEST\`"
    fi
    if [[ -n "${FRONTEND_DIGEST:-}" ]]; then
      echo "- Frontend digest: \`$FRONTEND_DIGEST\`"
    fi
    if [[ -n "$url" ]]; then
      echo "- URL: $url"
    fi
    echo "- Status: \`$status\`"
  } >> "$GITHUB_STEP_SUMMARY"
fi
