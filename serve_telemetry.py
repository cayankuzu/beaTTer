"""
beaTTer - Live Telemetry & Real-Time Monitoring Web Server
Serves static web arena files on port 8080 and ingests live computer vision telemetry and video frames.
"""
import base64
import http.server
import json
import os
import socket
import sys
import time

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
DEBUG_DIR = os.path.join(BASE_DIR, "debug_live")
os.makedirs(DEBUG_DIR, exist_ok=True)

TELEMETRY_FILE = os.path.join(DEBUG_DIR, "telemetry.json")
FRAME_FILE = os.path.join(DEBUG_DIR, "frame.jpg")
EVENTS_FILE = os.path.join(DEBUG_DIR, "events.log")

last_logged_gesture = None
last_logged_step = None
frame_counter = 0

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class LiveTelemetryHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def log_message(self, format, *args):
        # Suppress verbose GET logging, only log critical events
        if "/api/telemetry" in (args[0] if len(args) > 0 else ""):
            return
        # sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        global last_logged_gesture, last_logged_step, frame_counter
        if self.path == "/api/telemetry":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode('utf-8'))
                frame_counter += 1

                # Save base64 snapshot image if provided
                if "snapshot" in data and data["snapshot"]:
                    try:
                        img_data = data["snapshot"]
                        if "," in img_data:
                            img_data = img_data.split(",")[1]
                        with open(FRAME_FILE, "wb") as f_img:
                            f_img.write(base64.b64decode(img_data))
                    except Exception as e:
                        pass
                    # Remove snapshot from JSON file to keep it lightweight
                    data.pop("snapshot", None)

                # Save latest telemetry
                data["server_timestamp"] = time.time()
                data["frame_counter"] = frame_counter
                with open(TELEMETRY_FILE, "w", encoding="utf-8") as f_tel:
                    json.dump(data, f_tel, indent=2)

                # Check for gesture or step change to log event
                curr_g = str(data.get("gesture") or "NONE")
                curr_s = data.get("swingStep", 0)
                curr_neural = str(data.get("neuralGesture") or "UNKNOWN")
                fingers = data.get("fingerStates") or {}
                scores = data.get("fingerScores") or {}

                f_str = f"T:{'A' if fingers.get('thumb') else 'K'} " \
                        f"I:{'A' if fingers.get('index') else 'K'} " \
                        f"M:{'A' if fingers.get('middle') else 'K'} " \
                        f"R:{'A' if fingers.get('ring') else 'K'} " \
                        f"P:{'A' if fingers.get('pinky') else 'K'}"

                if curr_g != last_logged_gesture or curr_s != last_logged_step or frame_counter % 20 == 0:
                    idx_s = float(scores.get('index', 0) or 0)
                    mid_s = float(scores.get('middle', 0) or 0)
                    rng_s = float(scores.get('ring', 0) or 0)
                    pnk_s = float(scores.get('pinky', 0) or 0)
                    event_line = f"[{time.strftime('%H:%M:%S')}] #{frame_counter:04d} | " \
                                 f"HAMLE: {curr_g:8s} (Neural: {curr_neural:8s}) | " \
                                 f"Parmaklar: [{f_str}] | " \
                                 f"Ritim Adımı: {curr_s} | " \
                                 f"Skorlar: Idx={idx_s:.2f} Mid={mid_s:.2f} " \
                                 f"Rng={rng_s:.2f} Pnk={pnk_s:.2f}"
                    print(event_line, flush=True)

                    with open(EVENTS_FILE, "a", encoding="utf-8") as f_ev:
                        f_ev.write(event_line + "\n")

                    last_logged_gesture = curr_g
                    last_logged_step = curr_s

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as ex:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(f'{{"error":"{str(ex)}"}}'.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def main():
    local_ip = get_local_ip()
    print("=" * 70, flush=True)
    print("   beaTTer // CANLI KAMERA VE TELEMETRİ İZLEME SUNUCUSU AKTİF 📡", flush=True)
    print("=" * 70, flush=True)
    print(f"  [Yerel Tarayıcı]:  http://localhost:{PORT}", flush=True)
    print(f"  [Ağ / Telefon]  :  http://{local_ip}:{PORT}", flush=True)
    print("-" * 70, flush=True)
    print("  Kullanıcı hamleleri ve kamera anlık görüntüleri canlı kaydediliyor...", flush=True)
    print("=" * 70, flush=True)

    server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), LiveTelemetryHandler)
    server.serve_forever()

if __name__ == '__main__':
    main()
