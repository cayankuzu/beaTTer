"""
beaTTer - Game State Machine & Match Controller
Coordinates Vision, Anti-Cheat, Biometrics, Audio, and Hardware Bridge.
"""
from enum import Enum
import random
import time
from typing import Dict, List, Optional, Tuple
from config import GameConfig, DEFAULT_CONFIG
from core.psychological import Gesture, UserProfile, PsychologicalPredictor, RoundRecord
from core.classifier import HandLandmarkClassifier
from core.anti_cheat import AntiCheatEngine, CheatReport
from core.hardware_bridge import HardwareBridge
from ui.sound import SoundEngine

class GameState(str, Enum):
    IDLE = "IDLE"                    # Waiting for player to press SPACE or raise hand
    COUNTDOWN = "COUNTDOWN"          # 3 -> 2 -> 1 -> 0
    CAPTURE = "CAPTURE"              # Millisecond trigger & bot reveal
    VERIFICATION = "VERIFICATION"    # 250ms window checking for mid-air move change (cheat)
    RESULT = "RESULT"                # Display round winner & trash talk
    CHEAT_ALERT = "CHEAT_ALERT"      # Active cheat detected

TRASH_TALK_QUOTES = [
    "İşaret parmağın 15 milimetre açılmadan önce ne yapacağını biliyordum.",
    "Göz kırpman 250ms sürüyor; benim karar vermem ise sadece 26ms sürdü.",
    "Biyometrik profilin bu hamleyi %82 olasılıkla seçeceğini söylemişti.",
    "Fizik yasalarını bükemezsin, parmak tendonların hamleni ele veriyor.",
    "İnsan beyni rastgele seçim yapamaz; bunu artık kabullenmelisin.",
    "Tekrar dene, belki bu sefer ışık hızından daha hızlı hareket edebilirsin.",
    "Kasların 'Taş' derken beynin 'Kağıt' dedi, ikisini de okudum.",
    "Tokyo Üniversitesi robotu 1000 FPS ile yapıyordu, ben sıradan webcam ile seni yendim."
]

class GameController:
    def __init__(self, profile: Optional[UserProfile] = None, config: GameConfig = DEFAULT_CONFIG):
        self.config = config
        self.profile = profile or UserProfile()
        self.predictor = PsychologicalPredictor(self.profile)
        self.anti_cheat = AntiCheatEngine()
        self.hardware = HardwareBridge(
            port=config.ARDUINO_PORT,
            baudrate=config.ARDUINO_BAUD,
            enabled=config.ENABLE_ARDUINO
        )
        self.sound = SoundEngine(enabled=True)

        # State management
        self.state: GameState = GameState.IDLE
        self.state_start_time: float = time.perf_counter()

        # Scoreboard
        self.bot_wins: int = 0
        self.player_wins: int = 0
        self.draws: int = 0
        self.cheats_detected: int = 0

        # Current round variables
        self.countdown_remaining: float = 3.0
        self.last_tick_int: int = -1
        self.current_player_move: Gesture = Gesture.UNKNOWN
        self.current_bot_move: Gesture = Gesture.UNKNOWN
        self.last_decision_latency_ms: float = 0.0
        self.last_round_winner: str = "NONE"
        self.current_trash_talk: str = ""
        self.active_cheat_report: Optional[CheatReport] = None

    def start_round(self):
        """Starts countdown for a new round."""
        self.state = GameState.COUNTDOWN
        self.state_start_time = time.perf_counter()
        self.countdown_remaining = self.config.TIMING.COUNTDOWN_SECONDS
        self.last_tick_int = -1
        self.current_player_move = Gesture.UNKNOWN
        self.current_bot_move = Gesture.UNKNOWN
        self.active_cheat_report = None
        self.anti_cheat.reset()
        self.hardware.send_countdown_tick(3)
        self.sound.play("tick")

    def update(self, landmarks, frame_latency_ms: float):
        """
        Main per-frame state machine tick.
        landmarks: 21 MediaPipe hand landmarks or None
        frame_latency_ms: time taken by vision pipeline
        """
        now = time.perf_counter()
        elapsed = now - self.state_start_time

        # Live classification of what hand is currently doing
        live_gesture = Gesture.UNKNOWN
        if landmarks:
            live_gesture, _, _ = HandLandmarkClassifier.classify_gesture(landmarks)

        # ---------------- STATE 1: IDLE ----------------
        if self.state == GameState.IDLE:
            # Waiting for player to press SPACE or trigger
            pass

        # ---------------- STATE 2: COUNTDOWN ----------------
        elif self.state == GameState.COUNTDOWN:
            total_duration = self.config.TIMING.COUNTDOWN_SECONDS
            # Apply biometric arm inertia offset: heavier arms get slightly delayed trigger window
            inertia_offset_sec = self.profile.recommended_trigger_offset_ms / 1000.0
            adjusted_duration = total_duration + inertia_offset_sec

            self.countdown_remaining = max(0.0, adjusted_duration - elapsed)
            current_int_tick = int(np_ceil := int(self.countdown_remaining + 0.99))

            # Play tick sound on second boundaries (3, 2, 1)
            if current_int_tick in [1, 2, 3] and current_int_tick != self.last_tick_int:
                self.last_tick_int = current_int_tick
                self.sound.play("tick")
                self.hardware.send_countdown_tick(current_int_tick)

            # When countdown hits 0 (or within trigger window), transition to CAPTURE
            if self.countdown_remaining <= 0.02:
                self.sound.play("go")
                self.hardware.send_countdown_tick(0)
                self.state = GameState.CAPTURE
                self.state_start_time = now

        # ---------------- STATE 3: CAPTURE ----------------
        elif self.state == GameState.CAPTURE:
            t0 = time.perf_counter()

            # 1. Vision-based micro-movement prediction
            detected_move = Gesture.UNKNOWN
            unfurl_conf = 0.0

            if landmarks:
                detected_move, unfurl_conf = HandLandmarkClassifier.detect_early_micro_movement(landmarks)

            # 2. If hand is recognized in camera, use counter-move
            if detected_move != Gesture.UNKNOWN:
                self.current_player_move = detected_move
                self.current_bot_move = Gesture.get_winning_counter(detected_move)
            else:
                # Fallback to psychological Bayesian predictor if hand is obscured or player hesitated
                pred_move, counter, conf = self.predictor.get_psychological_counter()
                self.current_player_move = pred_move
                self.current_bot_move = counter

            # Measure algorithmic decision latency (usually < 2ms)
            self.last_decision_latency_ms = (time.perf_counter() - t0) * 1000.0 + frame_latency_ms

            # 3. Reveal bot move & transmit to hardware
            self.hardware.send_gesture(self.current_bot_move)
            self.sound.play("snap")

            # 4. Lock anti-cheat monitor
            self.anti_cheat.lock_initial_move(self.current_player_move, timestamp=now)

            # Transition to verification
            self.state = GameState.VERIFICATION
            self.state_start_time = now

        # ---------------- STATE 4: VERIFICATION ----------------
        elif self.state == GameState.VERIFICATION:
            # Check for retroactive move changes (cayırma)
            cheat_report = self.anti_cheat.observe_frame(live_gesture, timestamp=now)
            if cheat_report and cheat_report.is_cheat:
                self.cheats_detected += 1
                self.active_cheat_report = cheat_report
                self.sound.play("cheat")
                self.state = GameState.CHEAT_ALERT
                self.state_start_time = now
                return

            # Verification window finishes after 250ms
            if elapsed >= (self.config.TIMING.CHEAT_REACTION_THRESHOLD_MS / 1000.0):
                self._finalize_round()

        # ---------------- STATE 5: RESULT / CHEAT ALERT ----------------
        elif self.state in [GameState.RESULT, GameState.CHEAT_ALERT]:
            # Auto-reset after 5 seconds of displaying result if player hasn't pressed SPACE
            if elapsed > 5.0:
                self.state = GameState.IDLE

    def _finalize_round(self):
        """Calculates final winner, logs history, updates scoreboard."""
        winner = Gesture.evaluate_winner(self.current_player_move, self.current_bot_move)
        self.last_round_winner = winner

        if winner == "BOT_WIN":
            self.bot_wins += 1
            self.sound.play("win")
        elif winner == "PLAYER_WIN":
            self.player_wins += 1
        else:
            self.draws += 1

        # Record round in psychological engine
        rec = RoundRecord(
            round_number=len(self.predictor.history) + 1,
            player_move=self.current_player_move,
            bot_move=self.current_bot_move,
            winner=winner,
            reaction_time_ms=self.last_decision_latency_ms
        )
        self.predictor.record_round(rec)

        # Select dynamic trash talk quote
        self.current_trash_talk = random.choice(TRASH_TALK_QUOTES)

        self.state = GameState.RESULT
        self.state_start_time = time.perf_counter()

    def get_psychological_probs(self) -> Dict[Gesture, float]:
        """Returns the current live psychological probabilities for the HUD."""
        _, probs = self.predictor.predict_player_move()
        return probs
