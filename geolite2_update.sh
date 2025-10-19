#!/usr/bin/env bash
set -euo pipefail
# Download GeoLite2 databases using MaxMind official endpoint.
# REQUIRE: export MAXMIND_LICENSE_KEY=XXXX before running.
# Files installed under /usr/share/GeoIP
: "${MAXMIND_LICENSE_KEY:?Please export MAXMIND_LICENSE_KEY}"
INSTALL_DIR="/usr/share/GeoIP"
TMP="$(mktemp -d)"
mkdir -p "$INSTALL_DIR"

download() {
  local name="$1"
  local url="https://download.maxmind.com/app/geoip_download?edition_id=${name}&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz"
  echo "Downloading $name ..."
  curl -fsSL "$url" -o "$TMP/${name}.tar.gz"
  tar -C "$TMP" -xzf "$TMP/${name}.tar.gz"
  local dir
  dir="$(find "$TMP" -maxdepth 1 -type d -name "${name}_*")"
  install -m 0644 -D "$dir/${name}.mmdb" "$INSTALL_DIR/${name}.mmdb"
}

download "GeoLite2-Country"
download "GeoLite2-City"
chmod 0644 "$INSTALL_DIR"/*.mmdb
echo "[OK] GeoLite2 updated in $INSTALL_DIR"
