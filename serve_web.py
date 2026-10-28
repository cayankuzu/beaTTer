"""
beaTTer - Mobile & Local Network Web Server Launcher
Hosts the Web/Mobile Cyberpunk Client so you can play on your smartphone or browser.
"""
import http.server
import os
import socket
import socketserver
import sys

PORT = 8000
DIRECTORY = os.path.join(os.path.dirname(__file__), "web")

def get_local_ip():
    """Finds the local LAN IP address of this machine."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't actually have to connect
        s.connect(('8.8.8.8', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and Cache-Control for fast mobile streaming
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    local_ip = get_local_ip()
    print("=" * 65)
    print("   beaTTer // MOBIL & WEB SUNUCUSU BASLATILDI 📱")
    print("=" * 65)
    print(f"  [Bilgisayardan]:  http://localhost:{PORT}")
    print(f"  [Telefondan]   :  http://{local_ip}:{PORT}")
    print("-" * 65)
    print("  * Ayni Wi-Fi agina bagli herhangi bir telefondan (iPhone/Android)")
    print(f"    yukaridaki http://{local_ip}:{PORT} adresini tarayicinizda acin!")
    print("  * Kamera ve yapay zeka dogrudan telefonunuzda calisacaktir.")
    print("  * Durdurmak icin: Ctrl + C")
    print("=" * 65)

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[beaTTer Web] Sunucu kapatildi.")

if __name__ == "__main__":
    main()
