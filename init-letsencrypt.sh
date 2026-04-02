#!/bin/bash

# ------------------------------------------------------------------
# Let's Encrypt SSL Certificate Initialization
# Run this ONCE on the server after DNS is configured and pointing
# to this machine's IP address.
#
# Usage: ./init-letsencrypt.sh
# ------------------------------------------------------------------

set -e

DOMAINS=(styleit.me www.styleit.me api.styleit.me)
EMAIL=""  # Set your email for Let's Encrypt notifications
STAGING=0 # Set to 1 to use Let's Encrypt staging (for testing, avoids rate limits)

DATA_PATH="./certbot"
COMPOSE_FILE="docker-compose.prod.yml"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Let's Encrypt SSL Initialization ===${NC}"

# Prompt for email if not set
if [ -z "$EMAIL" ]; then
  read -p "Enter your email for Let's Encrypt notifications: " EMAIL
  if [ -z "$EMAIL" ]; then
    echo -e "${RED}Error: Email is required for Let's Encrypt.${NC}"
    exit 1
  fi
fi

# Check if certificates already exist
if [ -d "$DATA_PATH/conf/live/styleit.me" ]; then
  echo -e "${YELLOW}Existing certificates found. Do you want to replace them? (y/N)${NC}"
  read -p "" decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    echo "Keeping existing certificates."
    exit 0
  fi
fi

# Download recommended TLS parameters
echo -e "${GREEN}Downloading recommended TLS parameters...${NC}"
mkdir -p "$DATA_PATH/conf"
if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ] || [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    > "$DATA_PATH/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    > "$DATA_PATH/conf/ssl-dhparams.pem"
fi

# Create dummy certificate so Nginx can start
echo -e "${GREEN}Creating temporary self-signed certificate...${NC}"
CERT_PATH="$DATA_PATH/conf/live/styleit.me"
mkdir -p "$CERT_PATH"
openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
  -keyout "$CERT_PATH/privkey.pem" \
  -out "$CERT_PATH/fullchain.pem" \
  -subj "/CN=localhost" 2>/dev/null

# Start Nginx with the dummy certificate
echo -e "${GREEN}Starting Nginx with temporary certificate...${NC}"
docker compose -f "$COMPOSE_FILE" up -d nginx

# Wait for Nginx to be ready
echo "Waiting for Nginx to start..."
sleep 5

# Remove dummy certificate
echo -e "${GREEN}Removing temporary certificate...${NC}"
rm -rf "$CERT_PATH"

# Request real certificates from Let's Encrypt
echo -e "${GREEN}Requesting Let's Encrypt certificates...${NC}"

# Build domain args
DOMAIN_ARGS=""
for domain in "${DOMAINS[@]}"; do
  DOMAIN_ARGS="$DOMAIN_ARGS -d $domain"
done

# Set staging flag if needed
STAGING_ARG=""
if [ $STAGING -eq 1 ]; then
  STAGING_ARG="--staging"
  echo -e "${YELLOW}Using Let's Encrypt STAGING environment (certificates won't be trusted)${NC}"
fi

docker compose -f "$COMPOSE_FILE" run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  $STAGING_ARG \
  $DOMAIN_ARGS

# Reload Nginx with real certificates
echo -e "${GREEN}Reloading Nginx with real certificates...${NC}"
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

echo ""
echo -e "${GREEN}=== SSL setup complete! ===${NC}"
echo -e "Certificates installed for: ${DOMAINS[*]}"
echo -e "Auto-renewal is handled by the certbot container."
echo ""
echo -e "Start the full stack with:"
echo -e "  docker compose -f $COMPOSE_FILE up -d"
