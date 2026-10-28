"""
beaTTer - Anti-Cheat & Verification Engine
Detects retroactive move modification ("cayırma"), delay abuse, and out-of-frame trickery.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
import time
from core.psychological import Gesture

@dataclass
class CheatReport:
    is_cheat: bool
    cheat_type: str = ""        # "LATE_CHANGE", "DELAY_EXCEEDED", "HAND_HIDDEN"
    evidence_ms: float = 0.0
    initial_move: Gesture = Gesture.UNKNOWN
    modified_move: Gesture = Gesture.UNKNOWN
    message: str = ""

class AntiCheatEngine:
    def __init__(self, late_change_threshold_ms: float = 250.0):
        self.late_change_threshold_ms = late_change_threshold_ms
        self.locked_move: Gesture = Gesture.UNKNOWN
        self.lock_timestamp: float = 0.0
        self.post_lock_observations: List[Tuple[float, Gesture]] = []
        self.is_monitoring: bool = False

    def lock_initial_move(self, move: Gesture, timestamp: Optional[float] = None):
        """Called the exact millisecond the bot commits and reveals its counter."""
        self.locked_move = move
        self.lock_timestamp = timestamp or time.perf_counter()
        self.post_lock_observations = [(self.lock_timestamp, move)]
        self.is_monitoring = True

    def observe_frame(self, current_move: Gesture, timestamp: Optional[float] = None) -> Optional[CheatReport]:
        """
        Continuously observes frames for 200-300ms after the initial lock.
        If the player swaps from Rock to Scissors, flags cheating instantly.
        """
        if not self.is_monitoring:
            return None

        now = timestamp or time.perf_counter()
        elapsed_ms = (now - self.lock_timestamp) * 1000.0

        if elapsed_ms > self.late_change_threshold_ms:
            self.is_monitoring = False
            return None

        # Check if gesture changed from a valid gesture to another valid gesture
        if current_move != Gesture.UNKNOWN and self.locked_move != Gesture.UNKNOWN:
            if current_move != self.locked_move:
                self.is_monitoring = False
                return CheatReport(
                    is_cheat=True,
                    cheat_type="LATE_CHANGE",
                    evidence_ms=elapsed_ms,
                    initial_move=self.locked_move,
                    modified_move=current_move,
                    message=f"HİLE TESPİT EDİLDİ! Hamleni {elapsed_ms:.1f}ms sonra {self.locked_move.value}'tan {current_move.value}'a değiştirdin!"
                )

        return None

    def reset(self):
        self.locked_move = Gesture.UNKNOWN
        self.lock_timestamp = 0.0
        self.post_lock_observations.clear()
        self.is_monitoring = False
