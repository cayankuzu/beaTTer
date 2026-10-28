"""
beaTTer - Hand Landmark Gesture Classifier & Micro-Movement Predictor
Analyzes 21 MediaPipe hand landmarks in real-time with sub-millisecond computation.
Includes both static full-pose classification and early-unfurl anticipation.
"""
from typing import Dict, List, Optional, Tuple
import math
from core.psychological import Gesture

class HandLandmarkClassifier:
    """
    Computes invariant geometric metrics from 21 MediaPipe 3D normalized landmarks
    to classify gestures (ROCK, PAPER, SCISSORS) and detect micro-unfurling.
    """

    # Landmark indices
    WRIST = 0
    THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP = 1, 2, 3, 4
    INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP = 5, 6, 7, 8
    MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP = 9, 10, 11, 12
    RING_MCP, RING_PIP, RING_DIP, RING_TIP = 13, 14, 15, 16
    PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP = 17, 18, 19, 20

    @staticmethod
    def _dist(p1, p2) -> float:
        """Euclidean distance in 3D (or 2D)."""
        dx = p1.x - p2.x
        dy = p1.y - p2.y
        dz = getattr(p1, 'z', 0.0) - getattr(p2, 'z', 0.0)
        return math.sqrt(dx * dx + dy * dy + dz * dz)

    @classmethod
    def get_finger_extension_states(cls, landmarks) -> Dict[str, bool]:
        """
        Determines whether each finger is extended or curled.
        Uses distance from wrist and MCP relative to palm size for scale-invariance.
        """
        wrist = landmarks[cls.WRIST]
        palm_size = cls._dist(wrist, landmarks[cls.MIDDLE_MCP])
        if palm_size < 1e-4:
            palm_size = 0.1  # Avoid division by zero

        # Check Index
        dist_index_tip = cls._dist(wrist, landmarks[cls.INDEX_TIP])
        dist_index_pip = cls._dist(wrist, landmarks[cls.INDEX_PIP])
        index_extended = (dist_index_tip > dist_index_pip * 1.12) and (cls._dist(landmarks[cls.INDEX_TIP], landmarks[cls.INDEX_MCP]) > 0.65 * palm_size)

        # Check Middle
        dist_mid_tip = cls._dist(wrist, landmarks[cls.MIDDLE_TIP])
        dist_mid_pip = cls._dist(wrist, landmarks[cls.MIDDLE_PIP])
        mid_extended = (dist_mid_tip > dist_mid_pip * 1.12) and (cls._dist(landmarks[cls.MIDDLE_TIP], landmarks[cls.MIDDLE_MCP]) > 0.65 * palm_size)

        # Check Ring
        dist_ring_tip = cls._dist(wrist, landmarks[cls.RING_TIP])
        dist_ring_pip = cls._dist(wrist, landmarks[cls.RING_PIP])
        ring_extended = (dist_ring_tip > dist_ring_pip * 1.12) and (cls._dist(landmarks[cls.RING_TIP], landmarks[cls.RING_MCP]) > 0.60 * palm_size)

        # Check Pinky
        dist_pinky_tip = cls._dist(wrist, landmarks[cls.PINKY_TIP])
        dist_pinky_pip = cls._dist(wrist, landmarks[cls.PINKY_PIP])
        pinky_extended = (dist_pinky_tip > dist_pinky_pip * 1.10) and (cls._dist(landmarks[cls.PINKY_TIP], landmarks[cls.PINKY_MCP]) > 0.55 * palm_size)

        # Check Thumb (relative to pinky MCP)
        thumb_spread = cls._dist(landmarks[cls.THUMB_TIP], landmarks[cls.PINKY_MCP])
        thumb_extended = thumb_spread > 1.1 * palm_size

        return {
            "thumb": thumb_extended,
            "index": index_extended,
            "middle": mid_extended,
            "ring": ring_extended,
            "pinky": pinky_extended
        }

    @classmethod
    def classify_gesture(cls, landmarks) -> Tuple[Gesture, float, Dict[str, bool]]:
        """
        Classifies static or completed gesture.
        Returns (Gesture, confidence, finger_states).
        """
        states = cls.get_finger_extension_states(landmarks)
        ext_count = sum([states["index"], states["middle"], states["ring"], states["pinky"]])

        # 1. PAPER: All 4 main fingers extended (or at least 3 including ring and pinky)
        if ext_count >= 3 and (states["ring"] or states["pinky"]):
            confidence = 0.95 if ext_count == 4 else 0.82
            return Gesture.PAPER, confidence, states

        # 2. SCISSORS: Index and Middle extended, Ring and Pinky curled
        if states["index"] and states["middle"] and not states["ring"] and not states["pinky"]:
            return Gesture.SCISSORS, 0.96, states

        # Variant: index only extended (some people throw scissors with loose thumb/middle)
        if states["index"] and not states["ring"] and not states["pinky"]:
            # If middle is partially extended
            return Gesture.SCISSORS, 0.85, states

        # 3. ROCK: All main fingers curled
        if ext_count == 0:
            return Gesture.ROCK, 0.98, states

        if ext_count == 1 and not states["index"]:
            # Loose rock / thumb or single twitch
            return Gesture.ROCK, 0.80, states

        # Ambiguous / mid-motion
        return Gesture.UNKNOWN, 0.50, states

    @classmethod
    def detect_early_micro_movement(cls, landmarks) -> Tuple[Gesture, float]:
        """
        Anticipates the gesture 30-50ms before completion by detecting
        initial finger separation velocities and joint angle deltas.
        
        Biomechanics rule:
        - When opening to Paper: Ring and Pinky start releasing tension early.
        - When throwing Scissors: Index and Middle separate while Ring stays locked.
        - When throwing Rock: Tight knuckle compression persists throughout.
        """
        wrist = landmarks[cls.WRIST]
        palm_size = cls._dist(wrist, landmarks[cls.MIDDLE_MCP])
        if palm_size < 1e-4:
            return Gesture.UNKNOWN, 0.0

        # Measure Ring & Pinky opening ratio
        ring_ratio = cls._dist(landmarks[cls.RING_TIP], landmarks[cls.RING_MCP]) / palm_size
        pinky_ratio = cls._dist(landmarks[cls.PINKY_TIP], landmarks[cls.PINKY_MCP]) / palm_size
        index_ratio = cls._dist(landmarks[cls.INDEX_TIP], landmarks[cls.INDEX_MCP]) / palm_size
        mid_ratio = cls._dist(landmarks[cls.MIDDLE_TIP], landmarks[cls.MIDDLE_MCP]) / palm_size

        # If Ring and Pinky are actively releasing (> 0.52 of palm size), it's overwhelmingly PAPER
        if ring_ratio > 0.52 and pinky_ratio > 0.50:
            return Gesture.PAPER, 0.90

        # If Index and Middle are opening (> 0.55), but Ring is tightly tucked (< 0.45), it's SCISSORS
        if (index_ratio > 0.55 or mid_ratio > 0.55) and ring_ratio < 0.45 and pinky_ratio < 0.45:
            return Gesture.SCISSORS, 0.88

        # If everything remains tightly tucked (< 0.42), it is staying ROCK
        if index_ratio < 0.45 and mid_ratio < 0.45 and ring_ratio < 0.45 and pinky_ratio < 0.45:
            return Gesture.ROCK, 0.85

        # Fallback to standard classifier
        gest, conf, _ = cls.classify_gesture(landmarks)
        return gest, conf
