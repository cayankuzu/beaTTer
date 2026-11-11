"""
beaTTer - Offline Video & Photo Benchmark Tool
Analyzes pre-recorded videos or images, measures frame-by-frame latency,
evaluates early-unfurl detection curves, and outputs annotated benchmark reports.
"""
import argparse
import os
import sys
import time
from typing import List, Dict, Tuple

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import cv2
import numpy as np

from core.vision import HandTracker
from core.classifier import HandLandmarkClassifier
from core.psychological import Gesture

def run_video_benchmark(video_path: str, output_path: str = "benchmark_output.mp4"):
    if not os.path.exists(video_path):
        print(f"[HATA] Video dosyasi bulunamadi: {video_path}")
        return

    tracker = HandTracker()
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"[Benchmark] Video baslatildi: {video_path}")
    print(f"[Format]    : {width}x{height} @ {fps:.1f} FPS, Toplam Kare: {total_frames}")

    # Video writer for annotated benchmark
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    latencies: List[float] = []
    detected_gestures: List[Tuple[int, Gesture, float]] = []

    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        t0 = time.perf_counter()
        landmarks, cv_lat = tracker.process_frame(frame)
        total_lat = (time.perf_counter() - t0) * 1000.0
        latencies.append(total_lat)

        current_gest = Gesture.UNKNOWN
        unfurl_conf = 0.0

        if landmarks:
            # Draw skeleton
            HandTracker.draw_skeleton(frame, landmarks)
            # Detect gesture & micro movement
            current_gest, unfurl_conf = HandLandmarkClassifier.detect_early_micro_movement(landmarks)
            detected_gestures.append((frame_idx, current_gest, unfurl_conf))

        # Annotate benchmark overlay
        counter = Gesture.get_winning_counter(current_gest) if current_gest != Gesture.UNKNOWN else Gesture.UNKNOWN
        cv2.rectangle(frame, (10, 10), (450, 120), (15, 15, 20), -1)
        cv2.rectangle(frame, (10, 10), (450, 120), (0, 220, 255), 1)

        cv2.putText(frame, f"KARE: {frame_idx}/{total_frames} ({frame_idx/fps:.2f}s)", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
        cv2.putText(frame, f"GECIKME: {total_lat:.1f}ms", (20, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (50, 255, 50), 1)
        cv2.putText(frame, f"TESPIT: {current_gest.value} (Guven: {unfurl_conf*100:.0f}%)", (20, 85),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 215, 255), 1)
        cv2.putText(frame, f"AI KARSILIK: {counter.value}", (20, 110),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 180, 50), 2)

        out.write(frame)

    cap.release()
    out.release()

    # Generate Statistical Report
    if latencies:
        avg_lat = sum(latencies) / len(latencies)
        min_lat = min(latencies)
        max_lat = max(latencies)
        p95_lat = np.percentile(latencies, 95)

        print("\n" + "=" * 55)
        print("          BENCHMARK RAPORU // SONUCLAR")
        print("=" * 55)
        print(f"Toplam Kare       : {frame_idx}")
        print(f"Ortalama Gecikme  : {avg_lat:.2f} ms")
        print(f"Min Gecikme       : {min_lat:.2f} ms")
        print(f"Max Gecikme       : {max_lat:.2f} ms")
        print(f"95. Yuzdelik (P95): {p95_lat:.2f} ms")
        print(f"Cikti Videosu     : {output_path}")
        print("=" * 55 + "\n")

def run_image_test(image_path: str):
    """Tests single static photo gesture classification."""
    if not os.path.exists(image_path):
        print(f"[HATA] Fotoğraf bulunamadı: {image_path}")
        return

    tracker = HandTracker()
    frame = cv2.imread(image_path)
    if frame is None:
        print("[HATA] Görüntü okunamadı.")
        return

    t0 = time.perf_counter()
    landmarks, latency = tracker.process_frame(frame)
    if not landmarks:
        print("[Sonuç] El tespit edilemedi.")
        return

    gesture, conf, states = HandLandmarkClassifier.classify_gesture(landmarks)
    counter = Gesture.get_winning_counter(gesture)
    total_time = (time.perf_counter() - t0) * 1000.0

    print("=" * 45)
    print("       FOTOGRAF ANALIZ SONUCU")
    print("=" * 45)
    print(f"Tespit Edilen Hamle : {gesture.value}")
    print(f"Güven Skoru         : %{conf * 100:.1f}")
    print(f"Yapay Zeka Karşılığı: {counter.value}")
    print(f"Analiz Süresi       : {total_time:.2f} ms")
    print(f"Parmak Durumları    : {states}")
    print("=" * 45)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="beaTTer Benchmark Tool")
    parser.add_argument("--video", type=str, help="Path to video file")
    parser.add_argument("--image", type=str, help="Path to image file")
    parser.add_argument("--out", type=str, default="benchmark_output.mp4", help="Output annotated video path")
    args = parser.parse_args()

    if args.video:
        run_video_benchmark(args.video, args.out)
    elif args.image:
        run_image_test(args.image)
    else:
        print("Kullanim: python tools/benchmark.py --video video.mp4 VEYA --image foto.jpg")
