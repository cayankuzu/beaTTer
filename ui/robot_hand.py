"""
beaTTer - Holographic AI Robot Hand Visualizer
Draws high-tech, futuristic vector representations of the AI's robotic hand:
- Fist (Rock)
- Open Palm (Paper)
- Extended Index & Middle (Scissors)
With neon glows, joint servos, and hydraulic linkages.
"""
import math
from typing import Tuple
import cv2
import numpy as np
from core.psychological import Gesture

class RobotHandVisualizer:
    COLOR_FRAME = (40, 40, 55)
    COLOR_NEON_CYAN = (255, 230, 0)
    COLOR_NEON_GOLD = (0, 215, 255)
    COLOR_NEON_GREEN = (50, 255, 80)
    COLOR_NEON_RED = (50, 50, 255)
    COLOR_WHITE = (245, 245, 245)

    @classmethod
    def draw_ai_hand(cls, frame: np.ndarray, gesture: Gesture, center_x: int, center_y: int, scale: float = 1.0):
        """
        Renders a crisp sci-fi robotic hand at (center_x, center_y).
        Shows servo joints, knuckles, and metallic bone links.
        """
        if gesture == Gesture.UNKNOWN:
            # Draw idle pulsing scanning ring
            cv2.circle(frame, (center_x, center_y), int(45 * scale), cls.COLOR_NEON_CYAN, 2, cv2.LINE_AA)
            cv2.putText(frame, "AI READY", (center_x - int(32 * scale), center_y + int(5 * scale)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45 * scale, cls.COLOR_NEON_CYAN, 1, cv2.LINE_AA)
            return

        # Base Palm plate (octagonal chassis)
        palm_w = int(70 * scale)
        palm_h = int(60 * scale)
        pts = np.array([
            [center_x - palm_w // 2, center_y - palm_h // 2],
            [center_x + palm_w // 2, center_y - palm_h // 2],
            [center_x + palm_w // 2 + 10, center_y],
            [center_x + palm_w // 2, center_y + palm_h // 2],
            [center_x - palm_w // 2, center_y + palm_h // 2],
            [center_x - palm_w // 2 - 10, center_y]
        ], np.int32)
        cv2.fillPoly(frame, [pts], (25, 25, 35))
        cv2.polylines(frame, [pts], True, cls.COLOR_NEON_CYAN, 2, cv2.LINE_AA)

        # Core CPU indicator
        core_color = cls.COLOR_NEON_GREEN if gesture != Gesture.UNKNOWN else cls.COLOR_NEON_GOLD
        cv2.circle(frame, (center_x, center_y), int(12 * scale), core_color, -1, cv2.LINE_AA)
        cv2.circle(frame, (center_x, center_y), int(16 * scale), cls.COLOR_WHITE, 1, cv2.LINE_AA)

        # Fingers configuration: [Thumb, Index, Middle, Ring, Pinky]
        # For each finger: (base_offset_x, base_offset_y, is_extended, angle_deg)
        if gesture == Gesture.ROCK:
            # All fingers curled down into tight fist
            fingers = [
                (-35, 10, False, 25),    # Thumb folded inward
                (-25, -25, False, -15),  # Index curled
                (-8, -28, False, -5),    # Middle curled
                (10, -26, False, 5),     # Ring curled
                (26, -20, False, 15)     # Pinky curled
            ]
            badge_text = "AI: ROCK (TAS)"
            badge_col = cls.COLOR_NEON_GOLD

        elif gesture == Gesture.PAPER:
            # All 5 fingers extended outward
            fingers = [
                (-45, 0, True, 45),      # Thumb wide open
                (-25, -30, True, -12),   # Index long extend
                (-2, -32, True, -2),     # Middle long extend
                (20, -30, True, 8),      # Ring long extend
                (38, -25, True, 22)      # Pinky long extend
            ]
            badge_text = "AI: PAPER (KAGIT)"
            badge_col = cls.COLOR_NEON_GREEN

        elif gesture == Gesture.SCISSORS:
            # Index & Middle extended in V-shape, others curled
            fingers = [
                (-35, 10, False, 30),    # Thumb tucked
                (-18, -30, True, -18),   # Index extended out-left
                (12, -30, True, 16),     # Middle extended out-right
                (12, -18, False, 5),     # Ring curled
                (28, -14, False, 15)     # Pinky curled
            ]
            badge_text = "AI: SCISSORS (MAKAS)"
            badge_col = cls.COLOR_NEON_CYAN
        else:
            return

        # Draw fingers
        for ox, oy, extended, angle in fingers:
            bx = center_x + int(ox * scale)
            by = center_y + int(oy * scale)
            rad = math.radians(angle - 90)  # Upward is -90 deg

            seg_len = (35 * scale) if extended else (14 * scale)
            num_segs = 3 if extended else 2

            curr_x, curr_y = bx, by
            cv2.circle(frame, (int(curr_x), int(curr_y)), int(4 * scale), cls.COLOR_NEON_CYAN, -1)

            for s in range(num_segs):
                # Calculate next joint
                next_x = curr_x + math.cos(rad) * seg_len
                next_y = curr_y + math.sin(rad) * seg_len

                # Draw hydraulic bone
                cv2.line(frame, (int(curr_x), int(curr_y)), (int(next_x), int(next_y)), (10, 10, 15), int(6 * scale), cv2.LINE_AA)
                cv2.line(frame, (int(curr_x), int(curr_y)), (int(next_x), int(next_y)), cls.COLOR_WHITE if extended else cls.COLOR_FRAME, int(3 * scale), cv2.LINE_AA)

                # Draw servo joint
                joint_col = cls.COLOR_NEON_GREEN if extended else cls.COLOR_NEON_GOLD
                cv2.circle(frame, (int(next_x), int(next_y)), int(4 * scale), joint_col, -1, cv2.LINE_AA)

                curr_x, curr_y = next_x, next_y
                if not extended:
                    rad += math.radians(35)  # Curl inward

        # Badge under hand
        cv2.putText(frame, badge_text, (center_x - int(65 * scale), center_y + palm_h // 2 + int(32 * scale)),
                    cv2.FONT_HERSHEY_DUPLEX, 0.55 * scale, badge_col, 2, cv2.LINE_AA)
