"""
beaTTer - High-Performance Vision & Landmark Detection Module
Wraps MediaPipe Tasks Python API with sub-20ms frame processing.
"""
import os
import time
from typing import List, Optional, Tuple, Any
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class HandTracker:
    def __init__(self, model_path: str = "hand_landmarker.task", max_hands: int = 1):
        if not os.path.exists(model_path):
            # Fallback path if run from subdirectory
            alt_path = os.path.join(os.path.dirname(__file__), "..", model_path)
            if os.path.exists(alt_path):
                model_path = alt_path

        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=max_hands,
            min_hand_detection_confidence=0.6,
            min_hand_presence_confidence=0.6,
            min_tracking_confidence=0.6,
            running_mode=vision.RunningMode.IMAGE
        )
        self.detector = vision.HandLandmarker.create_from_options(options)
        self.last_latency_ms: float = 0.0

    def process_frame(self, frame_bgr: np.ndarray):
        """
        Processes a BGR OpenCV frame and returns hand landmarks and latency.
        Returns:
            landmarks_list: List of 21 landmarks for each detected hand (or None)
            latency_ms: Time taken to process the frame in milliseconds
        """
        t0 = time.perf_counter()

        # Convert OpenCV BGR to RGB
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

        result = self.detector.detect(mp_image)
        t1 = time.perf_counter()
        self.last_latency_ms = (t1 - t0) * 1000.0

        if result and result.hand_landmarks and len(result.hand_landmarks) > 0:
            return result.hand_landmarks[0], self.last_latency_ms

        return None, self.last_latency_ms

    @staticmethod
    def draw_skeleton(frame_bgr: np.ndarray, landmarks, color=(0, 255, 230)) -> np.ndarray:
        """
        Draws high-tech glowing landmarks and interconnecting bones on frame.
        """
        if not landmarks:
            return frame_bgr

        h, w, _ = frame_bgr.shape
        coords = []
        for lm in landmarks:
            cx, cy = int(lm.x * w), int(lm.y * h)
            coords.append((cx, cy))

        # Finger bone connection sequences
        connections = [
            # Thumb
            [0, 1, 2, 3, 4],
            # Index
            [0, 5, 6, 7, 8],
            # Middle
            [0, 9, 10, 11, 12],
            # Ring
            [0, 13, 14, 15, 16],
            # Pinky
            [0, 17, 18, 19, 20],
            # Palm base cross-links
            [5, 9, 13, 17]
        ]

        # Draw bones
        for chain in connections:
            for i in range(len(chain) - 1):
                pt1 = coords[chain[i]]
                pt2 = coords[chain[i + 1]]
                cv2.line(frame_bgr, pt1, pt2, (40, 40, 40), 4, cv2.LINE_AA)
                cv2.line(frame_bgr, pt1, pt2, color, 2, cv2.LINE_AA)

        # Draw joints
        for i, (cx, cy) in enumerate(coords):
            # Fingertips larger
            radius = 6 if i in [4, 8, 12, 16, 20] else 3
            pt_color = (0, 255, 0) if i in [4, 8, 12, 16, 20] else (255, 255, 255)
            cv2.circle(frame_bgr, (cx, cy), radius + 1, (0, 0, 0), -1, cv2.LINE_AA)
            cv2.circle(frame_bgr, (cx, cy), radius, pt_color, -1, cv2.LINE_AA)

        return frame_bgr
