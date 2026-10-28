"""
beaTTer - Real-Time Hand & Gesture Inspector
Monitors live telemetry from the user's browser, displaying exact 3D finger kinematics,
neural predictions, and gesture classifications as the user performs Rock, Paper, Scissors.
"""
import json
import os
import time

DEBUG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "debug_live")
TEL_FILE = os.path.join(DEBUG_DIR, "telemetry.json")

def monitor():
    print("=" * 65)
    print("   beaTTer // CANLI KAMERA VE PARMAK TAKIP GOZLEMCISI 👁️")
    print("=" * 65)
    print("  Kullanicinin kamerasi ve hareketleri bekleniyor...")
    print("  Tarayicida http://localhost:8080 adresini acin ve")
    print("  sirayla TAS -> KAGIT -> MAKAS yapin.")
    print("=" * 65)

    last_ts = 0
    last_g = None
    last_det = None

    while True:
        if os.path.exists(TEL_FILE):
            try:
                with open(TEL_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)

                ts = data.get("server_timestamp", 0)
                if ts != last_ts:
                    last_ts = ts
                    det = data.get("handDetected", False)
                    g = data.get("gesture")
                    conf = data.get("confidence", 0)
                    neural = data.get("neuralGesture", "UNKNOWN")
                    raw_neural = data.get("rawNeuralCategory", "None")
                    n_score = data.get("neuralScore", 0)
                    kinematic = data.get("kinematicGesture", "NONE")
                    fingers = data.get("fingerStates", {})
                    scores = data.get("fingerScores", {})
                    step = data.get("swingStep", 0)

                    # Only log on change or hand presence
                    if det != last_det or g != last_g or det:
                        f_str = f"T:{'AÇIK' if fingers.get('thumb') else 'KAPALI'} | " \
                                f"İşaret:{'AÇIK' if fingers.get('index') else 'KAPALI'} | " \
                                f"Orta:{'AÇIK' if fingers.get('middle') else 'KAPALI'} | " \
                                f"Yüzük:{'AÇIK' if fingers.get('ring') else 'KAPALI'} | " \
                                f"Serçe:{'AÇIK' if fingers.get('pinky') else 'KAPALI'}"

                        scores_str = f"I={scores.get('index', 0):.2f} " \
                                     f"M={scores.get('middle', 0):.2f} " \
                                     f"R={scores.get('ring', 0):.2f} " \
                                     f"P={scores.get('pinky', 0):.2f}"

                        print(f"[{time.strftime('%H:%M:%S')}] El: {'VAR' if det else 'YOK'} | "
                              f"Karar: {g:8s} (%{conf*100:.1f}) | Neural: {raw_neural} ({n_score:.2f}) | "
                              f"Kin: {kinematic:8s} | {scores_str} | Ritim: {step}", flush=True)

                        last_g = g
                        last_det = det
            except Exception:
                pass
        time.sleep(0.15)

if __name__ == '__main__':
    monitor()
