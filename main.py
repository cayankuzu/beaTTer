"""
beaTTer - Asla Kaybetmeyen Taş-Kağıt-Makas Yapay Zekası
AAA Arcade / Cyberpunk Fighting Game Main Runner
"""
import argparse
import sys
import time
import cv2
import numpy as np

from config import DEFAULT_CONFIG, GameConfig
from core.psychological import UserProfile, Gesture
from core.game_state import GameController, GameState
from core.vision import HandTracker
from ui.overlay import HUDOverlay

PROFILE_PRESETS = {
    ord('1'): UserProfile(name="Standart Erkek", age=24, gender="male", height_cm=178.0, weight_kg=75.0),
    ord('2'): UserProfile(name="Standart Kadin", age=24, gender="female", height_cm=166.0, weight_kg=58.0),
    ord('3'): UserProfile(name="Genc / Hizli", age=16, gender="male", height_cm=172.0, weight_kg=62.0),
    ord('4'): UserProfile(name="Agir Kol / Atlet", age=28, gender="male", height_cm=192.0, weight_kg=95.0),
}

def parse_args():
    parser = argparse.ArgumentParser(description="beaTTer - AAA Cyberpunk RPS Fighting Game")
    parser.add_argument("--name", type=str, default="Oyuncu 1", help="Player name")
    parser.add_argument("--age", type=int, default=24, help="Player age")
    parser.add_argument("--gender", type=str, default="male", choices=["male", "female", "other"], help="Gender")
    parser.add_argument("--height", type=float, default=178.0, help="Height in cm")
    parser.add_argument("--weight", type=float, default=74.0, help="Weight in kg")
    parser.add_argument("--camera", type=int, default=0, help="Camera device index")
    parser.add_argument("--arduino", action="store_true", help="Enable physical Arduino communication")
    parser.add_argument("--port", type=str, default="AUTO", help="Arduino COM port")
    parser.add_argument("--demo", action="store_true", help="Run with synthetic simulated camera feed")
    return parser.parse_args()

class SyntheticCamera:
    """Provides a synthetic animated camera frame if no physical webcam is available."""
    def __init__(self, width=1280, height=720):
        self.width = width
        self.height = height
        self.frame_idx = 0

    def read(self):
        self.frame_idx += 1
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        # Background sci-fi grid
        for y in range(0, self.height, 40):
            cv2.line(frame, (0, y), (self.width, y), (18, 20, 28), 1)
        for x in range(0, self.width, 40):
            cv2.line(frame, (x, 0), (x, self.height), (18, 20, 28), 1)

        cv2.putText(frame, "[SIMULASYON MODU: Fiziksel Kamera Yok]", (self.width // 2 - 250, self.height // 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.72, (80, 160, 240), 2, cv2.LINE_AA)
        cv2.putText(frame, "SPACE tusuna basarak yapay zekanin savas motorunu test edebilirsiniz.", 
                    (self.width // 2 - 290, self.height // 2 + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (160, 160, 160), 1, cv2.LINE_AA)
        return True, frame

    def release(self):
        pass

def main():
    args = parse_args()

    # 1. Initialize Profile
    profile = UserProfile(
        name=args.name,
        age=args.age,
        gender=args.gender,
        height_cm=args.height,
        weight_kg=args.weight
    )

    # 2. Configure Game
    config = DEFAULT_CONFIG
    config.ENABLE_ARDUINO = args.arduino
    config.ARDUINO_PORT = args.port
    config.VISION.CAMERA_INDEX = args.camera

    print("=" * 65)
    print("      beaTTer // AAA CYBERPUNK FIGHTING GAME PROTOCOL")
    print("=" * 65)
    print(f"[Profil]       : {profile.name} ({profile.gender}, {profile.age} yas)")
    print(f"[Biyometri]    : Boy {profile.height_cm:.0f}cm | Kilo {profile.weight_kg:.0f}kg")
    print(f"[Kol Kütlesi]  : ~{profile.estimated_arm_mass_kg:.2f} kg | Boy: ~{profile.estimated_arm_length_m:.2f} m")
    print(f"[Eylemsizlik]  : {profile.estimated_swing_inertia:.4f} kg*m^2 (Zamanlama ofseti: {profile.recommended_trigger_offset_ms:+.1f}ms)")
    print(f"[Arduino]      : {'AKTIF' if config.ENABLE_ARDUINO else 'KAPALI (Sanal Donanim Modu)'}")
    print("-" * 65)
    print("KONTROLLER:")
    print("  [SPACE]      : Dövüşü / Geri Sayımı Başlat (FIGHT!)")
    print("  [P]          : Ekranda Hızlı Profil Menüsünü Aç / Kapat")
    print("  [1-4]        : Profil Menüsü Açıkken Hazır Profilleri Seç")
    print("  [C]          : Skorları ve Geçmişi Sıfırla")
    print("  [Q] / [ESC]  : Çıkış")
    print("=" * 65)

    # 3. Initialize Vision Tracker
    print("[Vision] MediaPipe El Takibi baslatiliyor...")
    try:
        tracker = HandTracker()
        print("[Vision] MediaPipe HandLandmarker yuklendi!")
    except Exception as e:
        print(f"[HATA] El takip modeli yuklenemedi: {e}")
        return

    # 4. Initialize Camera
    cap = None
    if not args.demo:
        print(f"[Kamera] Kamera indeksi {config.VISION.CAMERA_INDEX} aciliyor...")
        cap = cv2.VideoCapture(config.VISION.CAMERA_INDEX)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.VISION.TARGET_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.VISION.TARGET_HEIGHT)

        if not cap.isOpened():
            print("[UYARI] Fiziksel kamera bulunamadi veya acilamadi! Otomatik Simulasyon Moduna geciliyor...")
            cap = SyntheticCamera()
    else:
        print("[Kamera] Simulasyon Modu secildi.")
        cap = SyntheticCamera()

    # 5. Initialize Controller
    controller = GameController(profile=profile, config=config)

    window_name = "beaTTer - AAA Cyberpunk Fighting Game"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 1280, 720)

    prev_frame_time = time.perf_counter()
    fps = 60.0
    profile_modal_open = False

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                print("[Kamera] Görüntü alınamadı, çıkılıyor...")
                break

            # Mirror frame horizontally for intuitive mirror effect
            frame = cv2.flip(frame, 1)

            # Measure FPS
            curr_time = time.perf_counter()
            dt = curr_time - prev_frame_time
            prev_frame_time = curr_time
            if dt > 0:
                fps = 0.9 * fps + 0.1 * (1.0 / dt)

            # Vision pipeline
            landmarks, cv_latency = tracker.process_frame(frame)

            # Draw glowing skeleton
            if landmarks:
                HandTracker.draw_skeleton(frame, landmarks)
                # Draw fighter-jet targeting reticle around player's hand!
                HUDOverlay.draw_hand_targeting_reticle(frame, landmarks)

            # State machine tick
            controller.update(landmarks, cv_latency)

            # Render Game HUD
            hw_status = controller.hardware.get_status_str()
            probs = controller.get_psychological_probs()

            # 1. Top Fighting Game Lifebars (Human vs AI NEXUS-9)
            HUDOverlay.draw_fighting_lifebars(
                frame,
                player_name=controller.profile.name,
                bot_wins=controller.bot_wins,
                player_wins=controller.player_wins
            )

            # 2. Biometric & Odds panel + ECG Wave
            HUDOverlay.draw_left_telemetry(frame, controller.profile, probs)

            # 3. Scoreboard & Win-Streak
            HUDOverlay.draw_scoreboard(
                frame,
                bot_wins=controller.bot_wins,
                player_wins=controller.player_wins,
                draws=controller.draws,
                cheats=controller.cheats_detected
            )

            # 4. Robot Avatar in upper-right arena
            HUDOverlay.draw_robot_avatar(frame, controller.current_bot_move)

            # 5. Contextual center state overlays
            if controller.state == GameState.COUNTDOWN:
                HUDOverlay.draw_countdown(frame, controller.countdown_remaining)
            elif controller.state == GameState.RESULT:
                HUDOverlay.draw_result_card(
                    frame,
                    player_move=controller.current_player_move,
                    bot_move=controller.current_bot_move,
                    winner=controller.last_round_winner,
                    latency_ms=controller.last_decision_latency_ms,
                    trash_talk=controller.current_trash_talk
                )
            elif controller.state == GameState.CHEAT_ALERT and controller.active_cheat_report:
                HUDOverlay.draw_cheat_alert(frame, controller.active_cheat_report.message)
            elif controller.state == GameState.IDLE and not profile_modal_open:
                # Bottom prompt
                h, w, _ = frame.shape
                cv2.putText(frame, "[SPACE: DOVUSU BASLAT | P: PROFIL | C: SIFIRLA | Q: CIKIS]",
                            (w // 2 - 290, h - 30), cv2.FONT_HERSHEY_DUPLEX, 0.58, HUDOverlay.COLOR_NEON_GOLD, 2, cv2.LINE_AA)

            # 6. Profile selector modal if open
            if profile_modal_open:
                HUDOverlay.draw_profile_selector_modal(frame)

            # Show window
            cv2.imshow(window_name, frame)

            # Key handling
            key = cv2.waitKey(1) & 0xFF
            if key in [ord('q'), ord('Q'), 27]:  # Q or ESC
                break
            elif key == ord(' '):  # SPACE
                if not profile_modal_open and controller.state in [GameState.IDLE, GameState.RESULT, GameState.CHEAT_ALERT]:
                    controller.start_round()
            elif key in [ord('c'), ord('C')]:  # C to clear
                controller.bot_wins = 0
                controller.player_wins = 0
                controller.draws = 0
                controller.cheats_detected = 0
                controller.predictor.history.clear()
                print("[Bilgi] Skorlar ve oyun geçmişi sıfırlandı.")
            elif key in [ord('p'), ord('P')]:  # Toggle on-screen profile modal
                profile_modal_open = not profile_modal_open
            elif profile_modal_open and key in PROFILE_PRESETS:
                selected = PROFILE_PRESETS[key]
                controller.profile = selected
                controller.predictor.profile = selected
                print(f"[Profil Seçildi] {selected.name} (Ofset: {selected.recommended_trigger_offset_ms:+.1f}ms)")
                profile_modal_open = False

    finally:
        cap.release()
        controller.hardware.close()
        cv2.destroyAllWindows()
        print("\n[beaTTer] Program kapatıldı. Teşekkürler!")

if __name__ == "__main__":
    main()
