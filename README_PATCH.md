# XtreamUi-R22F-22.04 — Hardened Patch Kit

This kit contains safer drop-in replacements and add-ons for a typical R22F stack on Ubuntu 22.04 (jammy).  
It fixes the most critical problems: wrong MariaDB repo, 0777 permissions, tmpfs too large, lack of systemd unit, non-HTTPS downloads, and fragile port editing.

## Files
- `install_hardened.py` — base installer (idempotent-ish). No HTTP. Uses MariaDB **jammy** repo. Creates systemd unit, tmpfs with default **40%** size, sane permissions.
- `balancer_hardened.py` — writes `nginx/conf.d/xtreamcodes-ports.conf` instead of sed. Set ports via args or env.
- `xtreamcodes.service` — systemd unit if you want to drop-in yourself.
- `geolite2_update.sh` — official MaxMind updater (requires `MAXMIND_LICENSE_KEY`).

## Quick start (fresh Ubuntu 22.04)
```bash
sudo -i
apt update && apt install -y python3 curl
# Upload these files to your server (e.g., /root/patchkit) then:
cd /root/patchkit
python3 install_hardened.py
# (Place your app under /home/xtreamcodes/iptv_xtream_codes)
systemctl enable --now xtreamcodes
```

## Configure ports
```bash
# Example: HTTP=25500 RTMP=25462 API=25461
python3 balancer_hardened.py 25500 25462 25461
# or
XTC_HTTP_PORT=25500 XTC_RTMP_PORT=25462 XTC_API_PORT=25461 python3 balancer_hardened.py
```

## GeoLite2 (optional)
```bash
export MAXMIND_LICENSE_KEY=YOUR_KEY
bash geolite2_update.sh
```

## TLS / Reverse Proxy (strongly recommended)
- Terminate TLS in Nginx at :443 and proxy to your app at :25500.
- Restrict panel access with IP allowlist or HTTP Basic Auth on the reverse proxy.

## Notes
- This kit does not fetch any third‑party zips. Add your own trusted HTTPS URLs and SHA256 checks in `install_hardened.py` where needed.
- Permissions default: dirs 0755, files 0644, `config` 0600. Ownership `xtreamcodes:xtreamcodes`.
- tmpfs defaults to `STREAMS_TMPFS_SIZE=40%`. Override via environment variable if needed.
