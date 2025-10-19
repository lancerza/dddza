#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Hardened installer for XtreamUi-R22F on Ubuntu 22.04 (jammy).
# - Uses MariaDB official repo for jammy (not noble).
# - Avoids 0777 permissions; config is 0600, dirs 0755/files 0644.
# - No HTTP downloads; supports SHA256 verification for remote assets.
# - Creates a proper systemd service instead of relying on init.d.
# - Makes /streams tmpfs size configurable via STREAMS_TMPFS_SIZE env (default 40%).
# - Does NOT modify /etc/hosts to block domains.
# - Does NOT rewrite index.php to external redirects.
# - Avoids Python 2, builds only what is needed on Python 3.
# - Leaves placeholders for where to put YOUR trusted HTTPS asset URLs and checksums.

import os, subprocess, sys, hashlib, urllib.request, tempfile, pathlib
from textwrap import dedent as _dedent

UBUNTU_CODENAME = "jammy"
STREAMS_TMPFS_DEFAULT = os.environ.get("STREAMS_TMPFS_SIZE", "40%")
XTC_HOME = pathlib.Path("/home/xtreamcodes")
XTC_DIR  = XTC_HOME / "iptv_xtream_codes"
XTC_USER = "xtreamcodes"
XTC_GROUP = "xtreamcodes"

def run(cmd, check=True):
    print("+", cmd)
    subprocess.run(cmd, shell=True, check=check)

def apt_update():
    run("apt-get update -y")

def ensure_user():
    run(f"id -u {XTC_USER} || useradd -r -m -d {XTC_HOME} -s /usr/sbin/nologin {XTC_USER}")

def add_mariadb_repo():
    run("apt-get install -y curl ca-certificates gnupg lsb-release software-properties-common")
    run("install -d -m 0755 /usr/share/keyrings")
    run("curl -fsSL https://mariadb.org/mariadb_release_signing_key.asc | gpg --dearmor -o /usr/share/keyrings/mariadb-archive-keyring.gpg")
    repo = _dedent(f"""
    deb [arch=amd64,arm64,ppc64el,s390x signed-by=/usr/share/keyrings/mariadb-archive-keyring.gpg]     https://mirrors.xtom.com/mariadb/repo/11.5/ubuntu {UBUNTU_CODENAME} main
    """).strip()
    with open("/etc/apt/sources.list.d/mariadb-11.5.list","w") as f:
        f.write(repo + "\n")
    apt_update()

def install_packages():
    pkgs = [
        "mariadb-server", "mariadb-client",
        "nginx", "php8.1-fpm", "php8.1-cli", "php8.1-mysql", "php8.1-curl", "php8.1-xml",
        "php8.1-zip", "php8.1-mbstring", "php8.1-bcmath",
        "curl", "zip", "unzip", "xz-utils", "git", "jq", "ufw",
        "python3", "python3-pip", "python3-venv",
    ]
    run("apt-get install -y " + " ".join(pkgs))

def write_systemd_unit():
    unit = _dedent(f"""
    [Unit]
    Description=Xtream Codes Services
    After=network.target mariadb.service php8.1-fpm.service nginx.service

    [Service]
    Type=forking
    User={XTC_USER}
    Group={XTC_GROUP}
    PIDFile={XTC_DIR}/tmp/xtreamcodes.pid
    ExecStart={XTC_DIR}/start_services.sh
    ExecStop={XTC_DIR}/stop_services.sh
    Restart=always
    RestartSec=5s
    LimitNOFILE=1048576

    [Install]
    WantedBy=multi-user.target
    """).strip()
    p = pathlib.Path("/etc/systemd/system/xtreamcodes.service")
    p.write_text(unit)
    run("systemctl daemon-reload")

def secure_permissions():
    if not XTC_DIR.exists():
        XTC_DIR.mkdir(parents=True, exist_ok=True)
    run(f"chown -R {XTC_USER}:{XTC_GROUP} {XTC_HOME}")
    # Directories 0755, files 0644; sensitive config 0600
    for dpath, dnames, fnames in os.walk(XTC_HOME):
        for d in dnames:
            os.chmod(os.path.join(dpath, d), 0o755)
        for f in fnames:
            os.chmod(os.path.join(dpath, f), 0o644)
    cfg = XTC_DIR / "config"
    if cfg.exists():
        os.chmod(cfg, 0o600)

def setup_tmpfs():
    fstab_line_streams = f"tmpfs {XTC_DIR}/streams tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size={STREAMS_TMPFS_DEFAULT} 0 0"
    fstab_line_tmp     = f"tmpfs {XTC_DIR}/tmp     tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size=2G 0 0"

    with open("/etc/fstab","a+") as f:
        f.seek(0)
        content = f.read()
        if fstab_line_streams not in content:
            f.write("\n" + fstab_line_streams + "\n")
        if fstab_line_tmp not in content:
            f.write(fstab_line_tmp + "\n")
    run("systemctl daemon-reload || true")

def ufw_hardening():
    # Optional: open only required ports; adjust as needed
    run("ufw allow 22/tcp || true")
    # Example app port (change if you reverse proxy): 25500
    run("ufw allow 25500/tcp || true")
    run("ufw --force enable || true")

def download_https(url, sha256=None, dst=None):
    if not url.startswith("https://"):
        raise RuntimeError(f"Refusing non-HTTPS URL: {url}")
    with urllib.request.urlopen(url) as r:
        data = r.read()
    if sha256:
        h = hashlib.sha256(data).hexdigest()
        if h.lower() != sha256.lower():
            raise RuntimeError(f"SHA256 mismatch for {url}: got {h}, expected {sha256}")
    if dst is None:
        import tempfile
        fd, tmp = tempfile.mkstemp()
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        return tmp
    else:
        pathlib.Path(dst).write_bytes(data)
        return dst

def place_placeholder_scripts():
    # Create placeholder start/stop scripts if absent
    start = XTC_DIR / "start_services.sh"
    stop  = XTC_DIR / "stop_services.sh"
    (XTC_DIR / "tmp").mkdir(parents=True, exist_ok=True)
    if not start.exists():
        start.write_text(_dedent("""
        #!/usr/bin/env bash
        set -euo pipefail
        # TODO: start php-fpm workers, ffmpeg, nginx upstreams etc.
        touch "$(dirname "$0")/tmp/xtreamcodes.pid"
        """ ).strip()+"
")
        os.chmod(start, 0o755)
    if not stop.exists():
        stop.write_text(_dedent("""
        #!/usr/bin/env bash
        set -euo pipefail
        # TODO: stop services gracefully
        rm -f "$(dirname "$0")/tmp/xtreamcodes.pid"
        """ ).strip()+"
")
        os.chmod(stop, 0o755)

def main():
    if os.geteuid() != 0:
        print("Please run as root.", file=sys.stderr)
        sys.exit(1)
    apt_update()
    ensure_user()
    add_mariadb_repo()
    install_packages()
    (XTC_DIR / "streams").mkdir(parents=True, exist_ok=True)
    place_placeholder_scripts()
    write_systemd_unit()
    secure_permissions()
    setup_tmpfs()
    ufw_hardening()
    print("\n[OK] Hardened base installed. Next steps:")
    print(" - Put your application files under /home/xtreamcodes/iptv_xtream_codes")
    print(" - Configure Nginx reverse proxy with TLS")
    print(" - systemctl enable --now xtreamcodes")

if __name__ == "__main__":
    main()
