"""
beaTTer - AAA Cyberpunk Fighting Game HUD & Telemetry Overlay
Transforms the camera feed into an arcade fighting game (Street Fighter / Cyberpunk style):
- Dual Health/Shield bars (Player vs AI NEXUS-9)
- Hand Lock-on Targeting Reticle with biometric telemetry
- Animated EKG / Oscilloscope stress wave
- Win streak combos ("5x UNSTOPPABLE", "PERFECT PREDICTION")
- Holographic Robot Hand & Fighting Game "VS" banners
"""
import math
import time
from typing import Dict, List, Optional, Tuple
import cv2
import numpy as np

from core.psychological import Gesture, UserProfile
from ui.robot_hand import RobotHandVisualizer

class HUDOverlay:
    # Color Palette (BGR)
    COLOR_NEON_CYAN = (255, 230, 0)
    COLOR_NEON_GOLD = (0, 215, 255)
    COLOR_NEON_GREEN = (50, 255, 80)
    COLOR_NEON_RED = (50, 50, 255)
    COLOR_ELECTRIC_PURPLE = (255, 50, 180)
    COLOR_DARK_BG = (12, 14, 20)
    COLOR_WHITE = (245, 245, 245)
    COLOR_GRAY = (110, 110, 125)

    @classmethod
    def draw_alpha_card(cls, img: np.ndarray, x: int, y: int, w: int, h: int, color=(12, 14, 22), alpha: float = 0.78, border_color=(255, 230, 0)):
        """Draws semi-transparent card with sci-fi cut corners and neon border."""
        x, y = max(0, x), max(0, y)
        w = min(w, img.shape[1] - x)
        h = min(h, img.shape[0] - y)
        if w <= 0 or h <= 0:
            return

        sub_img = img[y:y+h, x:x+w]
        rect = np.full(sub_img.shape, color, dtype=np.uint8)
        res = cv2.addWeighted(sub_img, 1.0 - alpha, rect, alpha, 1.0)
        img[y:y+h, x:x+w] = res

        # Cut-corner sci-fi border
        c = 10
        pts = np.array([
            [x + c, y], [x + w - c, y], [x + w, y + c],
            [x + w, y + h - c], [x + w - c, y + h],
            [x + c, y + h], [x, y + h - c], [x, y + c]
        ], np.int32)
        cv2.polylines(img, [pts], True, border_color, 1, cv2.LINE_AA)

    @classmethod
    def draw_fighting_lifebars(cls, frame: np.ndarray, player_name: str, bot_wins: int, player_wins: int):
        """
        Draws arcade fighting game lifebars across top of screen:
        [ PLAYER HP ]  <--- VS --->  [ AI NEXUS-9 HP ]
        """
        h, w, _ = frame.shape
        bar_w = int(w * 0.36)
        bar_h = 24
        top_y = 22

        # 1. PLAYER BAR (Left)
        p_x = 25
        # Background
        cv2.rectangle(frame, (p_x, top_y), (p_x + bar_w, top_y + bar_h), (25, 25, 35), -1)
        # Player damage calculation (Bot wins deplete player HP!)
        player_health_pct = max(0.05, 1.0 - (bot_wins * 0.15) % 1.0)
        fill_w = int(bar_w * player_health_pct)
        # Health gradient
        cv2.rectangle(frame, (p_x + bar_w - fill_w, top_y), (p_x + bar_w, top_y + bar_h), (50, 120, 255), -1)
        cv2.rectangle(frame, (p_x, top_y), (p_x + bar_w, top_y + bar_h), cls.COLOR_NEON_CYAN, 2)
        # Player Label
        cv2.putText(frame, f"1P // {player_name.upper()}", (p_x + 5, top_y - 6),
                    cv2.FONT_HERSHEY_DUPLEX, 0.55, cls.COLOR_WHITE, 1, cv2.LINE_AA)

        # 2. CENTER "VS" BADGE
        cx = w // 2
        cls.draw_alpha_card(frame, cx - 45, top_y - 12, 90, 48, color=(20, 10, 10), alpha=0.9, border_color=cls.COLOR_NEON_RED)
        cv2.putText(frame, "VS", (cx - 24, top_y + 24), cv2.FONT_HERSHEY_DUPLEX, 1.1, cls.COLOR_NEON_RED, 3, cv2.LINE_AA)
        cv2.putText(frame, "VS", (cx - 24, top_y + 24), cv2.FONT_HERSHEY_DUPLEX, 1.1, cls.COLOR_WHITE, 1, cv2.LINE_AA)

        # 3. AI NEXUS-9 BAR (Right)
        b_x = w - bar_w - 25
        cv2.rectangle(frame, (b_x, top_y), (b_x + bar_w, top_y + bar_h), (25, 25, 35), -1)
        # AI HP is always full (invincible!)
        cv2.rectangle(frame, (b_x, top_y), (b_x + bar_w, top_y + bar_h), cls.COLOR_NEON_GREEN, -1)
        cv2.rectangle(frame, (b_x, top_y), (b_x + bar_w, top_y + bar_h), cls.COLOR_NEON_GOLD, 2)
        # AI Label
        cv2.putText(frame, "2P // NEXUS-9 (UNBEATABLE)", (b_x + bar_w - 240, top_y - 6),
                    cv2.FONT_HERSHEY_DUPLEX, 0.55, cls.COLOR_NEON_GOLD, 1, cv2.LINE_AA)

    @classmethod
    def draw_hand_targeting_reticle(cls, frame: np.ndarray, landmarks):
        """
        Draws high-tech fighter jet targeting brackets around the player's hand
        with real-time biometric and micro-velocity tracking readouts.
        """
        if not landmarks:
            return

        h, w, _ = frame.shape
        xs = [int(lm.x * w) for lm in landmarks]
        ys = [int(lm.y * h) for lm in landmarks]

        min_x, max_x = max(0, min(xs) - 25), min(w, max(xs) + 25)
        min_y, max_y = max(0, min(ys) - 25), min(h, max(ys) + 25)
        box_w = max_x - min_x
        box_h = max_y - min_y
        corner_len = min(25, box_w // 4)

        col = cls.COLOR_NEON_CYAN

        # 4 Corner brackets [ ]
        # Top-Left
        cv2.line(frame, (min_x, min_y), (min_x + corner_len, min_y), col, 2, cv2.LINE_AA)
        cv2.line(frame, (min_x, min_y), (min_x, min_y + corner_len), col, 2, cv2.LINE_AA)
        # Top-Right
        cv2.line(frame, (max_x, min_y), (max_x - corner_len, min_y), col, 2, cv2.LINE_AA)
        cv2.line(frame, (max_x, min_y), (max_x, min_y + corner_len), col, 2, cv2.LINE_AA)
        # Bottom-Left
        cv2.line(frame, (min_x, max_y), (min_x + corner_len, max_y), col, 2, cv2.LINE_AA)
        cv2.line(frame, (min_x, max_y), (min_x, max_y - corner_len), col, 2, cv2.LINE_AA)
        # Bottom-Right
        cv2.line(frame, (max_x, max_y), (max_x - corner_len, max_y), col, 2, cv2.LINE_AA)
        cv2.line(frame, (max_x, max_y), (max_x, max_y - corner_len), col, 2, cv2.LINE_AA)

        # Center Crosshair
        cx, cy = (min_x + max_x) // 2, (min_y + max_y) // 2
        cv2.circle(frame, (cx, cy), 5, col, 1, cv2.LINE_AA)
        cv2.line(frame, (cx - 12, cy), (cx + 12, cy), col, 1, cv2.LINE_AA)
        cv2.line(frame, (cx, cy - 12), (cx, cy + 12), col, 1, cv2.LINE_AA)

        # Floating HUD Telemetry Flag
        tag_x = min(w - 180, max_x + 8)
        tag_y = min_y + 15
        cv2.putText(frame, "TARGET // HUMAN HAND", (tag_x, tag_y), cv2.FONT_HERSHEY_SIMPLEX, 0.40, cls.COLOR_NEON_GREEN, 1, cv2.LINE_AA)
        cv2.putText(frame, "LOCK: 100% // TRACKING", (tag_x, tag_y + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.38, cls.COLOR_WHITE, 1, cv2.LINE_AA)
        cv2.putText(frame, "TENSION: 84% // 60 FPS", (tag_x, tag_y + 32), cv2.FONT_HERSHEY_SIMPLEX, 0.38, cls.COLOR_NEON_GOLD, 1, cv2.LINE_AA)

    @classmethod
    def draw_ecg_pulse_wave(cls, frame: np.ndarray, x: int, y: int, w: int, h: int):
        """Draws a moving cyberpunk heart-rate / biometrics oscilloscope wave."""
        cls.draw_alpha_card(frame, x, y, w, h, color=(10, 15, 20), alpha=0.8)
        cv2.putText(frame, "STRESS / BIOMETRICS", (x + 10, y + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.40, cls.COLOR_NEON_CYAN, 1, cv2.LINE_AA)

        t = time.perf_counter() * 4.0
        pts = []
        mid_y = y + h // 2 + 6
        step = 4
        for px in range(0, w - 20, step):
            # Base rhythm with periodic QRS spike
            phase = (px / float(w) + t * 0.4) % 1.0
            val = 0.0
            if 0.45 < phase < 0.50:
                val = -18.0 * math.sin((phase - 0.45) * math.pi / 0.05)
            elif 0.50 < phase < 0.55:
                val = 24.0 * math.sin((phase - 0.50) * math.pi / 0.05)
            else:
                val = math.sin(px * 0.1 + t) * 3.0
            pts.append((x + 10 + px, int(mid_y + val)))

        if len(pts) > 1:
            for i in range(len(pts) - 1):
                cv2.line(frame, pts[i], pts[i+1], cls.COLOR_NEON_GREEN, 1, cv2.LINE_AA)

    @classmethod
    def draw_left_telemetry(cls, frame: np.ndarray, profile: UserProfile, probs: Dict[Gesture, float]):
        """Draws Biometric profile & live psychological odds."""
        x, y, w, h = 20, 62, 280, 240
        cls.draw_alpha_card(frame, x, y, w, h)

        cv2.putText(frame, "BIOMETRIC MATRIX", (x + 12, y + 24), cv2.FONT_HERSHEY_DUPLEX, 0.55, cls.COLOR_NEON_CYAN, 1, cv2.LINE_AA)
        cv2.line(frame, (x + 10, y + 30), (x + w - 10, y + 30), cls.COLOR_NEON_CYAN, 1)

        line1 = f"SUBJ: {profile.name} ({profile.gender[0].upper()}/{profile.age})"
        line2 = f"BODY: {profile.height_cm:.0f}cm | {profile.weight_kg:.0f}kg"
        line3 = f"INERTIA: {profile.estimated_swing_inertia:.3f} kg*m2"
        line4 = f"OFFSET:  {profile.recommended_trigger_offset_ms:+.0f}ms (PHYSICAL)"

        cv2.putText(frame, line1, (x + 12, y + 52), cv2.FONT_HERSHEY_SIMPLEX, 0.44, cls.COLOR_WHITE, 1, cv2.LINE_AA)
        cv2.putText(frame, line2, (x + 12, y + 72), cv2.FONT_HERSHEY_SIMPLEX, 0.44, cls.COLOR_WHITE, 1, cv2.LINE_AA)
        cv2.putText(frame, line3, (x + 12, y + 92), cv2.FONT_HERSHEY_SIMPLEX, 0.44, cls.COLOR_GRAY, 1, cv2.LINE_AA)
        cv2.putText(frame, line4, (x + 12, y + 112), cv2.FONT_HERSHEY_SIMPLEX, 0.44, cls.COLOR_NEON_GREEN, 1, cv2.LINE_AA)

        # Odds header
        cv2.putText(frame, "PSYCHOLOGICAL PREDICTION", (x + 12, y + 138), cv2.FONT_HERSHEY_SIMPLEX, 0.45, cls.COLOR_NEON_GOLD, 1, cv2.LINE_AA)

        gauges = [
            ("ROCK", probs.get(Gesture.ROCK, 0.33), (80, 180, 255)),
            ("PAPER", probs.get(Gesture.PAPER, 0.33), (255, 200, 80)),
            ("SCIS", probs.get(Gesture.SCISSORS, 0.33), (120, 255, 120))
        ]

        bar_y = y + 158
        for name, prob, col in gauges:
            pct = int(prob * 100)
            text = f"{name}: {pct}%"
            cv2.putText(frame, text, (x + 12, bar_y + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.40, cls.COLOR_WHITE, 1, cv2.LINE_AA)

            bx, by, bw, bh = x + 85, bar_y, 175, 12
            cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), (30, 30, 40), -1)
            fill_w = int(bw * prob)
            cv2.rectangle(frame, (bx, by), (bx + fill_w, by + bh), col, -1)
            cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), cls.COLOR_NEON_CYAN, 1)
            bar_y += 24

        # Add ECG Wave right below telemetry
        cls.draw_ecg_pulse_wave(frame, x, y + h + 8, w, 70)

    @classmethod
    def draw_scoreboard(cls, frame: np.ndarray, bot_wins: int, player_wins: int, draws: int, cheats: int):
        """Draws current match score and win-streak combo badge."""
        w_frame = frame.shape[1]
        x, y, w, h = w_frame - 240, 62, 220, 190
        cls.draw_alpha_card(frame, x, y, w, h)

        cv2.putText(frame, "COMBAT METRICS", (x + 12, y + 24), cv2.FONT_HERSHEY_DUPLEX, 0.55, cls.COLOR_NEON_CYAN, 1, cv2.LINE_AA)
        cv2.line(frame, (x + 10, y + 30), (x + w - 10, y + 30), cls.COLOR_NEON_CYAN, 1)

        total_games = bot_wins + player_wins + draws
        win_rate = (bot_wins / total_games * 100.0) if total_games > 0 else 100.0

        cv2.putText(frame, f"AI WINS:    {bot_wins}", (x + 12, y + 58), cv2.FONT_HERSHEY_SIMPLEX, 0.50, cls.COLOR_NEON_GREEN, 2, cv2.LINE_AA)
        cv2.putText(frame, f"HUMAN WINS: {player_wins}", (x + 12, y + 82), cv2.FONT_HERSHEY_SIMPLEX, 0.50, cls.COLOR_NEON_RED if player_wins > 0 else cls.COLOR_WHITE, 1, cv2.LINE_AA)
        cv2.putText(frame, f"DRAWS:      {draws}", (x + 12, y + 106), cv2.FONT_HERSHEY_SIMPLEX, 0.48, cls.COLOR_GRAY, 1, cv2.LINE_AA)
        cv2.putText(frame, f"CHEATS:     {cheats}", (x + 12, y + 130), cv2.FONT_HERSHEY_SIMPLEX, 0.48, cls.COLOR_NEON_RED, 1, cv2.LINE_AA)

        # Win Streak Combo Badge
        streak = bot_wins
        if streak >= 3:
            streak_text = f"🔥 {streak}x WIN STREAK"
            cv2.putText(frame, streak_text, (x + 12, y + 158), cv2.FONT_HERSHEY_DUPLEX, 0.50, cls.COLOR_ELECTRIC_PURPLE, 2, cv2.LINE_AA)
        else:
            badge_text = f"WIN RATE: {win_rate:.1f}%"
            cv2.putText(frame, badge_text, (x + 12, y + 158), cv2.FONT_HERSHEY_DUPLEX, 0.50, cls.COLOR_NEON_GOLD, 2, cv2.LINE_AA)

        cv2.putText(frame, "STATUS: INVINCIBLE", (x + 12, y + 180), cv2.FONT_HERSHEY_SIMPLEX, 0.38, cls.COLOR_NEON_GREEN, 1, cv2.LINE_AA)

    @classmethod
    def draw_countdown(cls, frame: np.ndarray, remaining_sec: float):
        """Draws arcade fighting game countdown ring and FIGHT blast."""
        h, w, _ = frame.shape
        cx, cy = w // 2, h // 2 - 20

        if remaining_sec > 0.05:
            display_num = str(int(np.ceil(remaining_sec)))
            progress = (remaining_sec % 1.0)
            radius = int(85 + 25 * progress)
            cv2.circle(frame, (cx, cy), radius, cls.COLOR_NEON_CYAN, 3, cv2.LINE_AA)
            cv2.circle(frame, (cx, cy), 72, (15, 18, 28), -1)

            cv2.putText(frame, display_num, (cx - 28, cy + 32), cv2.FONT_HERSHEY_DUPLEX, 3.6, cls.COLOR_NEON_GOLD, 7, cv2.LINE_AA)
            cv2.putText(frame, display_num, (cx - 28, cy + 32), cv2.FONT_HERSHEY_DUPLEX, 3.6, cls.COLOR_WHITE, 2, cv2.LINE_AA)
        else:
            cls.draw_alpha_card(frame, cx - 190, cy - 55, 380, 110, color=(30, 10, 10), alpha=0.9, border_color=cls.COLOR_NEON_GREEN)
            cv2.putText(frame, "SHOOT! / HAMLE!", (cx - 165, cy + 18), cv2.FONT_HERSHEY_DUPLEX, 1.6, cls.COLOR_NEON_GREEN, 4, cv2.LINE_AA)

    @classmethod
    def draw_robot_avatar(cls, frame: np.ndarray, bot_move: Gesture):
        """Draws the holographic AI robot hand in the right arena."""
        w = frame.shape[1]
        rx = w - 130
        ry = 370
        RobotHandVisualizer.draw_ai_hand(frame, bot_move, rx, ry, scale=0.88)

    @classmethod
    def draw_result_card(cls, frame: np.ndarray, player_move: Gesture, bot_move: Gesture, winner: str, latency_ms: float, trash_talk: str):
        """Draws dramatic arcade KO / Winner banner."""
        h, w, _ = frame.shape
        box_w, box_h = 640, 225
        x, y = (w - box_w) // 2, h - box_h - 25

        bg_col = (10, 35, 15) if winner == "BOT_WIN" else ((10, 10, 45) if winner == "PLAYER_WIN" else (25, 25, 25))
        border_col = cls.COLOR_NEON_GREEN if winner == "BOT_WIN" else cls.COLOR_NEON_GOLD
        cls.draw_alpha_card(frame, x, y, box_w, box_h, color=bg_col, alpha=0.92, border_color=border_col)

        # Winner header
        header = "AI K.O. VICTORIOUS! // KAZANDIM" if winner == "BOT_WIN" else ("DRAW // BERABERE!" if winner == "TIE" else "PLAYER WON!")
        header_col = cls.COLOR_NEON_GREEN if winner == "BOT_WIN" else cls.COLOR_NEON_GOLD
        cv2.putText(frame, header, (x + 25, y + 42), cv2.FONT_HERSHEY_DUPLEX, 1.05, header_col, 2, cv2.LINE_AA)

        # Move comparisons
        p_txt = f"SEN: {player_move.value}"
        b_txt = f"AI : {bot_move.value}"
        cv2.putText(frame, p_txt, (x + 25, y + 85), cv2.FONT_HERSHEY_DUPLEX, 0.72, cls.COLOR_WHITE, 2, cv2.LINE_AA)
        cv2.putText(frame, b_txt, (x + 25, y + 120), cv2.FONT_HERSHEY_DUPLEX, 0.78, cls.COLOR_NEON_GOLD, 2, cv2.LINE_AA)

        # Reaction benchmark
        meta_txt = f"Analiz Reaksiyon Hizi: {latency_ms:.1f}ms // Tendon Mikro-Hareketi Dogrulandi"
        cv2.putText(frame, meta_txt, (x + 25, y + 155), cv2.FONT_HERSHEY_SIMPLEX, 0.46, cls.COLOR_NEON_CYAN, 1, cv2.LINE_AA)

        # Dynamic AI commentary
        if trash_talk:
            cv2.putText(frame, f'"{trash_talk}"', (x + 25, y + 192), cv2.FONT_HERSHEY_SIMPLEX, 0.48, cls.COLOR_NEON_GREEN, 1, cv2.LINE_AA)

    @classmethod
    def draw_cheat_alert(cls, frame: np.ndarray, message: str):
        """Draws flashing alert box when retroactive move changes are detected."""
        h, w, _ = frame.shape
        box_w, box_h = 660, 140
        x, y = (w - box_w) // 2, (h - box_h) // 2
        cls.draw_alpha_card(frame, x, y, box_w, box_h, color=(10, 10, 50), alpha=0.95, border_color=cls.COLOR_NEON_RED)

        cv2.putText(frame, "DIKKAT: HILE TESPIT EDILDI!", (x + 25, y + 45), cv2.FONT_HERSHEY_DUPLEX, 0.9, cls.COLOR_NEON_RED, 2, cv2.LINE_AA)
        cv2.putText(frame, message, (x + 25, y + 85), cv2.FONT_HERSHEY_SIMPLEX, 0.52, cls.COLOR_WHITE, 1, cv2.LINE_AA)
        cv2.putText(frame, "[SPACE: Yeniden Oyna]", (x + 25, y + 115), cv2.FONT_HERSHEY_SIMPLEX, 0.50, cls.COLOR_NEON_GOLD, 1, cv2.LINE_AA)

    @classmethod
    def draw_profile_selector_modal(cls, frame: np.ndarray):
        """Draws on-screen interactive profile presets menu."""
        h, w, _ = frame.shape
        box_w, box_h = 580, 290
        x, y = (w - box_w) // 2, (h - box_h) // 2
        cls.draw_alpha_card(frame, x, y, box_w, box_h, color=(14, 18, 30), alpha=0.96, border_color=cls.COLOR_NEON_GOLD)

        cv2.putText(frame, "BIOMETRIC PROFILE PRESETS", (x + 25, y + 38), cv2.FONT_HERSHEY_DUPLEX, 0.8, cls.COLOR_NEON_GOLD, 2, cv2.LINE_AA)
        cv2.line(frame, (x + 20, y + 48), (x + box_w - 20, y + 48), cls.COLOR_NEON_CYAN, 1)

        presets = [
            ("1", "Standart Erkek", "24y, 178cm, 75kg  (Tas egilimi: %54, Denge: Normal)"),
            ("2", "Standart Kadin", "24y, 166cm, 58kg  (Makas/Kagit dengeli, Eylemsizlik: Dusuk)"),
            ("3", "Genc / Refleks Hizli", "16y, 172cm, 62kg  (Yuksek Tas refleksi, Hizli atis)"),
            ("4", "Agir Kol / Atlet", "28y, 192cm, 95kg  (Yuksek Eylemsizlik, +22ms Gecikme)"),
        ]

        item_y = y + 82
        for key, name, desc in presets:
            cv2.putText(frame, f"[{key}] {name}", (x + 25, item_y), cv2.FONT_HERSHEY_SIMPLEX, 0.58, cls.COLOR_NEON_GREEN, 2, cv2.LINE_AA)
            cv2.putText(frame, desc, (x + 45, item_y + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.43, cls.COLOR_GRAY, 1, cv2.LINE_AA)
            item_y += 46

        cv2.putText(frame, "[1-4 tusuna basarak secin | P: Kapat]", (x + 25, y + box_h - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.50, cls.COLOR_NEON_CYAN, 1, cv2.LINE_AA)
