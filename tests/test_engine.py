"""
beaTTer - Unit & Integration Test Suite
Validates Classifier, Prediction Engine, Markov dynamics, and Anti-Cheat without needing a live camera.
"""
from dataclasses import dataclass
import unittest
from core.psychological import Gesture, UserProfile, PsychologicalPredictor, RoundRecord
from core.classifier import HandLandmarkClassifier
from core.anti_cheat import AntiCheatEngine

@dataclass
class MockLandmark:
    x: float
    y: float
    z: float = 0.0

class TestBeaTTer(unittest.TestCase):

    def test_winning_counter_logic(self):
        """Validates fundamental game rules."""
        self.assertEqual(Gesture.get_winning_counter(Gesture.ROCK), Gesture.PAPER)
        self.assertEqual(Gesture.get_winning_counter(Gesture.PAPER), Gesture.SCISSORS)
        self.assertEqual(Gesture.get_winning_counter(Gesture.SCISSORS), Gesture.ROCK)

        self.assertEqual(Gesture.evaluate_winner(Gesture.ROCK, Gesture.PAPER), "BOT_WIN")
        self.assertEqual(Gesture.evaluate_winner(Gesture.PAPER, Gesture.SCISSORS), "BOT_WIN")
        self.assertEqual(Gesture.evaluate_winner(Gesture.SCISSORS, Gesture.ROCK), "BOT_WIN")
        self.assertEqual(Gesture.evaluate_winner(Gesture.ROCK, Gesture.ROCK), "TIE")

    def test_demographic_biometrics(self):
        """Validates arm length, inertia, and timing offset calculations."""
        profile = UserProfile(name="Test User", age=25, gender="male", height_cm=180.0, weight_kg=80.0)
        self.assertAlmostEqual(profile.estimated_arm_length_m, 1.80 * 0.44, places=2)
        self.assertGreater(profile.estimated_arm_mass_kg, 4.0)
        self.assertGreater(profile.estimated_swing_inertia, 0.05)
        # Should yield a valid offset in [-35, 35] ms
        self.assertTrue(-35.0 <= profile.recommended_trigger_offset_ms <= 35.0)

    def test_psychological_bayesian_priors(self):
        """Validates that demographic priors favor Rock for young males on round 1."""
        male_profile = UserProfile(name="Ahmet", age=20, gender="male", height_cm=175.0, weight_kg=70.0)
        predictor = PsychologicalPredictor(male_profile)
        best_move, probs = predictor.predict_player_move()
        self.assertEqual(best_move, Gesture.ROCK)
        self.assertGreater(probs[Gesture.ROCK], probs[Gesture.PAPER])
        self.assertGreater(probs[Gesture.ROCK], probs[Gesture.SCISSORS])

    def test_markov_sequence_learning(self):
        """Validates that the engine learns when a user repeats moves."""
        profile = UserProfile()
        predictor = PsychologicalPredictor(profile)

        # Simulate user repeatedly throwing Scissors after losing
        for r in range(1, 5):
            rec = RoundRecord(
                round_number=r,
                player_move=Gesture.SCISSORS,
                bot_move=Gesture.ROCK,
                winner="BOT_WIN"
            )
            predictor.record_round(rec)

        pred_move, probs = predictor.predict_player_move()
        # Engine should predict Scissors and prepare Rock to counter it
        self.assertEqual(pred_move, Gesture.SCISSORS)
        _, counter, _ = predictor.get_psychological_counter()
        self.assertEqual(counter, Gesture.ROCK)

    def test_anti_cheat_detection(self):
        """Validates retroactive move changes ("cayırma") detection."""
        engine = AntiCheatEngine(late_change_threshold_ms=250.0)
        t_zero = 1000.0

        # Player committed Rock at t = 1000.0
        engine.lock_initial_move(Gesture.ROCK, timestamp=t_zero)

        # 50ms later, hand is still Rock -> No cheat
        report1 = engine.observe_frame(Gesture.ROCK, timestamp=t_zero + 0.05)
        self.assertIsNone(report1)

        # 120ms later, player hastily switches to Paper ("cayırma") -> Flagged!
        report2 = engine.observe_frame(Gesture.PAPER, timestamp=t_zero + 0.12)
        self.assertIsNotNone(report2)
        self.assertTrue(report2.is_cheat)
        self.assertEqual(report2.cheat_type, "LATE_CHANGE")
        self.assertEqual(report2.initial_move, Gesture.ROCK)
        self.assertEqual(report2.modified_move, Gesture.PAPER)

    def test_synthetic_hand_classifier(self):
        """Validates geometric classification with simulated landmarks."""
        # Simulated closed fist (Rock)
        # Wrist at (0.5, 0.8), all tips clustered close to MCPs
        rock_lms = [MockLandmark(0.5, 0.8)] * 21
        # Set wrist at (0.5, 0.8) and middle MCP at (0.5, 0.5)
        rock_lms[0] = MockLandmark(0.5, 0.8)
        rock_lms[HandLandmarkClassifier.MIDDLE_MCP] = MockLandmark(0.5, 0.5)

        # Tips curled closer to wrist than PIPs
        for tip, pip in [(8, 6), (12, 10), (16, 14), (20, 18)]:
            rock_lms[pip] = MockLandmark(0.5, 0.45)
            rock_lms[tip] = MockLandmark(0.5, 0.52)  # curled back down

        gesture, conf, _ = HandLandmarkClassifier.classify_gesture(rock_lms)
        self.assertEqual(gesture, Gesture.ROCK)

if __name__ == "__main__":
    unittest.main()
