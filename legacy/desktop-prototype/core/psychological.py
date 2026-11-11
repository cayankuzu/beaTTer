"""
beaTTer - Psychological & Biomechanical Prediction Engine
Combines Bayesian priors from demographic/body metrics with a Markov chain
for sequence pattern recognition (Win-Stay, Lose-Shift behavior).
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple
import numpy as np

class Gesture(str, Enum):
    ROCK = "ROCK"
    PAPER = "PAPER"
    SCISSORS = "SCISSORS"
    UNKNOWN = "UNKNOWN"

    @classmethod
    def get_winning_counter(cls, move: "Gesture") -> "Gesture":
        """Returns the move that BEATS the opponent's move."""
        if move == cls.ROCK:
            return cls.PAPER
        elif move == cls.PAPER:
            return cls.SCISSORS
        elif move == cls.SCISSORS:
            return cls.ROCK
        return cls.ROCK  # Default fallback

    @classmethod
    def evaluate_winner(cls, player_move: "Gesture", bot_move: "Gesture") -> str:
        """Evaluates round: 'BOT_WIN', 'PLAYER_WIN', or 'TIE'."""
        if player_move == bot_move:
            return "TIE"
        if cls.get_winning_counter(player_move) == bot_move:
            return "BOT_WIN"
        return "PLAYER_WIN"


@dataclass
class UserProfile:
    name: str = "Player 1"
    age: int = 25
    gender: str = "male"       # "male", "female", "other"
    height_cm: float = 175.0   # Height in cm
    weight_kg: float = 75.0    # Weight in kg

    @property
    def estimated_arm_length_m(self) -> float:
        """Anthropometric estimate: arm length ~ 0.44 * height."""
        return (self.height_cm / 100.0) * 0.44

    @property
    def estimated_arm_mass_kg(self) -> float:
        """Anthropometric estimate: single arm mass ~ 5.3% of total body mass."""
        return self.weight_kg * 0.053

    @property
    def estimated_swing_inertia(self) -> float:
        """Moment of inertia of the swinging arm about the shoulder I = 1/3 * m * L^2."""
        return (1.0 / 3.0) * self.estimated_arm_mass_kg * (self.estimated_arm_length_m ** 2)

    @property
    def recommended_trigger_offset_ms(self) -> float:
        """
        Heavier/longer arms have more inertia, resulting in a slightly slower final swing deceleration.
        Lighter/shorter arms snap into position faster.
        Returns recommended ms adjustment (-30ms to +30ms relative to standard countdown).
        """
        # Baseline: 75kg, 175cm -> inertia ~ 0.08 kg*m^2
        baseline_inertia = 0.08
        diff = self.estimated_swing_inertia - baseline_inertia
        # Clamped adjustment in milliseconds
        offset = float(np.clip(diff * 400.0, -35.0, 35.0))
        return offset


@dataclass
class RoundRecord:
    round_number: int
    player_move: Gesture
    bot_move: Gesture
    winner: str  # "BOT_WIN", "PLAYER_WIN", "TIE"
    reaction_time_ms: float = 0.0


class PsychologicalPredictor:
    """
    Predicts the player's next move using:
    1. Demographic Bayesian Priors (First round & low data)
    2. Order-1 & Order-2 Markov Transition Matrices (Win-Stay, Lose-Shift psychology)
    """

    def __init__(self, profile: UserProfile):
        self.profile = profile
        self.history: List[RoundRecord] = []
        
        # Order-1 Transition counts: (prev_player_move, prev_winner) -> {ROCK: c, PAPER: c, SCISSORS: c}
        self.transition_counts: Dict[Tuple[Gesture, str], Dict[Gesture, int]] = {}
        for g in [Gesture.ROCK, Gesture.PAPER, Gesture.SCISSORS]:
            for w in ["BOT_WIN", "PLAYER_WIN", "TIE"]:
                self.transition_counts[(g, w)] = {
                    Gesture.ROCK: 1,
                    Gesture.PAPER: 1,
                    Gesture.SCISSORS: 1
                }  # Laplace smoothing (start with 1 each)

    def record_round(self, round_rec: RoundRecord):
        """Updates Markov transitions with the newly finished round."""
        if self.history:
            prev = self.history[-1]
            key = (prev.player_move, prev.winner)
            self.transition_counts[key][round_rec.player_move] += 1
        self.history.append(round_rec)

    def get_demographic_priors(self) -> Dict[Gesture, float]:
        """
        Returns empirical probability distribution P(Move) based on age, gender & psychology studies.
        - Men heavily lean towards Rock on round 1 (Zhejiang / Tokyo University findings: ~54% Rock).
        - Women lean more balanced, with slight preference for Scissors or Paper.
        - Younger players (<18) favor Rock heavily.
        """
        p = {Gesture.ROCK: 0.333, Gesture.PAPER: 0.333, Gesture.SCISSORS: 0.334}

        gender = self.profile.gender.lower()
        if gender == "male":
            p[Gesture.ROCK] += 0.20
            p[Gesture.PAPER] -= 0.10
            p[Gesture.SCISSORS] -= 0.10
        elif gender == "female":
            p[Gesture.ROCK] -= 0.05
            p[Gesture.SCISSORS] += 0.10
            p[Gesture.PAPER] -= 0.05

        if self.profile.age < 18:
            # Young reflex bias toward aggression / Rock
            p[Gesture.ROCK] += 0.12
            p[Gesture.PAPER] -= 0.06
            p[Gesture.SCISSORS] -= 0.06
        elif self.profile.age > 50:
            # Older players statistically shift toward Paper (protective / defensive)
            p[Gesture.PAPER] += 0.08
            p[Gesture.ROCK] -= 0.04
            p[Gesture.SCISSORS] -= 0.04

        # Normalize
        total = sum(p.values())
        return {k: v / total for k, v in p.items()}

    def predict_player_move(self) -> Tuple[Gesture, Dict[Gesture, float]]:
        """
        Combines demographic priors with Markov sequence dynamics to produce
        the most likely move the player will throw, and the full probability distribution.
        """
        priors = self.get_demographic_priors()
        
        # Round 1: No previous history, rely heavily on demographic priors
        if not self.history:
            best_move = max(priors, key=priors.get)
            return best_move, priors

        # If we have history, calculate Markov transition probabilities
        prev = self.history[-1]
        key = (prev.player_move, prev.winner)
        counts = self.transition_counts[key]
        total_counts = sum(counts.values())
        markov_probs = {g: counts[g] / total_counts for g in counts}

        # Weight history more as rounds accumulate
        # e.g., round 2: 70% priors + 30% Markov; round 10: 10% priors + 90% Markov
        history_weight = min(0.90, len(self.history) * 0.15)
        prior_weight = 1.0 - history_weight

        blended_probs: Dict[Gesture, float] = {}
        for g in [Gesture.ROCK, Gesture.PAPER, Gesture.SCISSORS]:
            blended_probs[g] = (priors[g] * prior_weight) + (markov_probs[g] * history_weight)

        best_move = max(blended_probs, key=blended_probs.get)
        return best_move, blended_probs

    def get_psychological_counter(self) -> Tuple[Gesture, Gesture, float]:
        """
        Returns:
            (predicted_player_move, bot_winning_counter, confidence_score)
        """
        pred_move, probs = self.predict_player_move()
        counter = Gesture.get_winning_counter(pred_move)
        confidence = probs[pred_move]
        return pred_move, counter, confidence
