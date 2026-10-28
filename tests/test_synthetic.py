"""
beaTTer - End-to-End Simulation Test
Simulates full game cycles: countdown, micro-movement capture, bot victory, and cheat detection.
"""
import time
import unittest
from core.game_state import GameController, GameState
from core.psychological import Gesture, UserProfile
from tests.test_engine import MockLandmark
from core.classifier import HandLandmarkClassifier

def create_synthetic_hand(gesture: Gesture):
    """Generates synthetic landmarks corresponding to a gesture."""
    lms = [MockLandmark(0.5, 0.8) for _ in range(21)]
    lms[0] = MockLandmark(0.5, 0.8)  # Wrist
    lms[HandLandmarkClassifier.MIDDLE_MCP] = MockLandmark(0.5, 0.5)  # Palm center

    # Setup base MCPs
    lms[5] = MockLandmark(0.45, 0.52)   # Index MCP
    lms[9] = MockLandmark(0.50, 0.50)   # Middle MCP
    lms[13] = MockLandmark(0.55, 0.52)  # Ring MCP
    lms[17] = MockLandmark(0.60, 0.55)  # Pinky MCP

    if gesture == Gesture.ROCK:
        for tip, pip, mcp in [(8, 6, 5), (12, 10, 9), (16, 14, 13), (20, 18, 17)]:
            lms[pip] = MockLandmark(lms[mcp].x, 0.55)
            lms[tip] = MockLandmark(lms[mcp].x, 0.60)  # curled back down close to wrist
    elif gesture == Gesture.PAPER:
        for tip, pip, mcp in [(8, 6, 5), (12, 10, 9), (16, 14, 13), (20, 18, 17)]:
            lms[pip] = MockLandmark(lms[mcp].x, 0.35)
            lms[tip] = MockLandmark(lms[mcp].x, 0.20)  # extended high up
    elif gesture == Gesture.SCISSORS:
        # Index & Middle extended
        for tip, pip, mcp in [(8, 6, 5), (12, 10, 9)]:
            lms[pip] = MockLandmark(lms[mcp].x, 0.35)
            lms[tip] = MockLandmark(lms[mcp].x, 0.20)
        # Ring & Pinky curled
        for tip, pip, mcp in [(16, 14, 13), (20, 18, 17)]:
            lms[pip] = MockLandmark(lms[mcp].x, 0.55)
            lms[tip] = MockLandmark(lms[mcp].x, 0.60)

    return lms

class TestEndToEndSimulation(unittest.TestCase):

    def test_full_round_paper_vs_bot_scissors(self):
        controller = GameController(profile=UserProfile(name="TestPlayer"))
        controller.start_round()
        self.assertEqual(controller.state, GameState.COUNTDOWN)

        # Fast forward time to trigger countdown end
        controller.state_start_time = time.perf_counter() - 4.0
        controller.update(landmarks=None, frame_latency_ms=10.0)
        self.assertEqual(controller.state, GameState.CAPTURE)

        # In CAPTURE state, feed synthetic PAPER landmarks
        paper_lms = create_synthetic_hand(Gesture.PAPER)
        controller.update(landmarks=paper_lms, frame_latency_ms=10.0)

        # Bot should have instantly reacted and played SCISSORS!
        self.assertEqual(controller.current_bot_move, Gesture.SCISSORS)
        self.assertEqual(controller.state, GameState.VERIFICATION)

        # Fast forward past 250ms verification window
        controller.state_start_time = time.perf_counter() - 0.35
        controller.update(landmarks=paper_lms, frame_latency_ms=10.0)

        # Should reach RESULT with BOT_WIN
        self.assertEqual(controller.state, GameState.RESULT)
        self.assertEqual(controller.last_round_winner, "BOT_WIN")
        self.assertEqual(controller.bot_wins, 1)

    def test_cheat_detection_flow(self):
        controller = GameController()
        controller.start_round()
        controller.state_start_time = time.perf_counter() - 4.0
        controller.update(landmarks=None, frame_latency_ms=10.0)  # Transitions to CAPTURE

        # Lock initial move as ROCK
        rock_lms = create_synthetic_hand(Gesture.ROCK)
        controller.update(landmarks=rock_lms, frame_latency_ms=10.0)  # Transitions to VERIFICATION
        self.assertEqual(controller.current_bot_move, Gesture.PAPER)

        # Now mid-verification, player hurriedly changes to SCISSORS!
        scissors_lms = create_synthetic_hand(Gesture.SCISSORS)
        controller.update(landmarks=scissors_lms, frame_latency_ms=10.0)

        # Cheat should be flagged immediately
        self.assertEqual(controller.state, GameState.CHEAT_ALERT)
        self.assertEqual(controller.cheats_detected, 1)
        self.assertIsNotNone(controller.active_cheat_report)
        self.assertEqual(controller.active_cheat_report.cheat_type, "LATE_CHANGE")

if __name__ == "__main__":
    unittest.main()
