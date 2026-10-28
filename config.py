"""
beaTTer - Configuration and Hyperparameters
Never-Lose Rock-Paper-Scissors AI
"""
from dataclasses import dataclass, field
from typing import Tuple

@dataclass
class VisionConfig:
    # Camera settings
    CAMERA_INDEX: int = 0
    TARGET_WIDTH: int = 1280
    TARGET_HEIGHT: int = 720
    FPS_TARGET: int = 60
    
    # MediaPipe Hand detection parameters
    STATIC_IMAGE_MODE: bool = False
    MAX_NUM_HANDS: int = 1
    MIN_DETECTION_CONFIDENCE: float = 0.65
    MIN_TRACKING_CONFIDENCE: float = 0.65
    MODEL_COMPLEXITY: int = 0  # 0 is faster (lower latency), 1 is more accurate

@dataclass
class TimingConfig:
    # Countdown duration in seconds
    COUNTDOWN_SECONDS: float = 3.0
    
    # Micro-window right around "0" where the throw happens (in seconds)
    THROW_WINDOW_START: float = -0.05  # 50ms before "0"
    THROW_WINDOW_END: float = 0.25     # 250ms after "0" (human physiological reaction limit)
    
    # Cheat detection: if hand changes gesture after bot has revealed its move
    CHEAT_REACTION_THRESHOLD_MS: float = 120.0  # ms after reveal

@dataclass
class GameConfig:
    VISION: VisionConfig = field(default_factory=VisionConfig)
    TIMING: TimingConfig = field(default_factory=TimingConfig)
    
    # Colors (BGR for OpenCV)
    COLOR_BG: Tuple[int, int, int] = (15, 15, 20)
    COLOR_CYAN: Tuple[int, int, int] = (255, 235, 0)      # High-tech cyan
    COLOR_NEON_GREEN: Tuple[int, int, int] = (50, 255, 50)
    COLOR_NEON_RED: Tuple[int, int, int] = (50, 50, 255)
    COLOR_GOLD: Tuple[int, int, int] = (0, 215, 255)
    COLOR_WHITE: Tuple[int, int, int] = (245, 245, 245)
    COLOR_GRAY: Tuple[int, int, int] = (120, 120, 120)

    # Hardware (Arduino) Serial Settings
    ARDUINO_PORT: str = "AUTO"  # or specific COM port like "COM3"
    ARDUINO_BAUD: int = 115200
    ENABLE_ARDUINO: bool = False

# Global shared instance
DEFAULT_CONFIG = GameConfig()
