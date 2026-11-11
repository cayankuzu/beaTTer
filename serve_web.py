"""
beaTTer - Local / LAN Web Server
- HTTP  : http://localhost:8000          (PC: camera works on localhost)
- HTTPS : https://<LAN-IP>:8443          (phone/tablet: camera requires a secure context)
Multi-threaded so the 8 MB gesture model + JS modules load in parallel on mobile.
"""
import datetime
import http.server
import ipaddress
import os
import socket
import ssl
import sys
import threading

HTTP_PORT = 8000
HTTPS_PORT = 8443
ROOT = os.path.dirname(os.path.abspath(__file__))
DIRECTORY = os.path.join(ROOT, "web")
CERT_DIR = os.path.join(ROOT, ".localcert")
CERT_FILE = os.path.join(CERT_DIR, "cert.pem")
KEY_FILE = os.path.join(CERT_DIR, "key.pem")

# Keep in sync with vercel.json (the model URLs carry ?v=..., so /models/ may be cached for long there).
# script-src / connect-src name the one package version and the one Supabase project the app uses,
# not the whole CDN or every project.
CSP = (
    "default-src 'self'; "
    "script-src 'self' https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/ 'wasm-unsafe-eval'; "
    "style-src 'self' https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; "
    "img-src 'self' data: blob:; "
    "media-src 'self' blob: mediastream:; "
    "connect-src 'self' https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/ https://znfvjfafkcahpkkcbdjc.supabase.co; "
    "worker-src 'self' blob:; "
    "object-src 'none'; "
    "base-uri 'none'; "
    "form-action 'none'; "
    "frame-ancestors 'none'"
)

MIME_OVERRIDES = {
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
    ".task": "application/octet-stream",
    ".tflite": "application/octet-stream",
}


def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 1))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **MIME_OVERRIDES}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Same security headers as production (vercel.json), so policy violations show up locally.
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("Permissions-Policy", "camera=(self), microphone=(), geolocation=()")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_POST(self):
        # The app never posts to its own origin; answer quietly instead of the default 501.
        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


def ensure_cert(local_ip):
    """Creates a self-signed certificate for LAN HTTPS (needed for camera on phones)."""
    if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        return True
    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.x509.oid import NameOID
    except ImportError:
        return False
    os.makedirs(CERT_DIR, exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "beaTTer Local")])
    alt = [x509.DNSName("localhost"), x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]
    try:
        alt.append(x509.IPAddress(ipaddress.ip_address(local_ip)))
    except ValueError:
        pass
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name).issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=825))
        .add_extension(x509.SubjectAlternativeName(alt), critical=False)
        .sign(key, hashes.SHA256())
    )
    with open(KEY_FILE, "wb") as f:
        f.write(key.private_bytes(serialization.Encoding.PEM,
                                  serialization.PrivateFormat.TraditionalOpenSSL,
                                  serialization.NoEncryption()))
    with open(CERT_FILE, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    return True


def serve(port, use_tls=False):
    httpd = http.server.ThreadingHTTPServer(("", port), Handler)
    httpd.daemon_threads = True
    if use_tls:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(CERT_FILE, KEY_FILE)
        httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()


def main():
    local_ip = get_local_ip()
    has_tls = ensure_cert(local_ip)
    print("=" * 66, flush=True)
    print("   beaTTer // YEREL SUNUCU AKTIF", flush=True)
    print("=" * 66, flush=True)
    print(f"  [Bilgisayar]      : http://localhost:{HTTP_PORT}", flush=True)
    if has_tls:
        print(f"  [Telefon/Tablet]  : https://{local_ip}:{HTTPS_PORT}", flush=True)
        print("    (Ilk girişte 'Gelişmiş > Siteye devam et' deyin; kamera HTTPS ister.)", flush=True)
    print("=" * 66, flush=True)

    if has_tls:
        threading.Thread(target=serve, args=(HTTPS_PORT, True), daemon=True).start()
    try:
        serve(HTTP_PORT)
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
