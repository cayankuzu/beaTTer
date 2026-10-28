"""
beaTTer - Procedural Audio & Sound Effects Synthesizer
Uses Pygame & Numpy to generate dynamic, zero-external-asset sci-fi sound effects:
- Countdown tick beeps
- High-frequency decision snap
- Victory jingle
- Cheat alarm buzzer
"""
import math
import numpy as np
import pygame

class SoundEngine:
    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self._sounds = {}
        if not self.enabled:
            return

        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)
            self._generate_procedural_sounds()
        except Exception as e:
            print(f"[SoundEngine] Audio init error ({e}). Running in silent mode.")
            self.enabled = False

    def _make_tone(self, freq: float, duration: float, sample_rate: int = 44100, decay: bool = True) -> pygame.mixer.Sound:
        """Synthesizes a sinusoidal wave with optional exponential amplitude decay."""
        n_samples = int(sample_rate * duration)
        t = np.linspace(0, duration, n_samples, endpoint=False)
        wave = np.sin(2.0 * np.pi * freq * t)

        if decay:
            envelope = np.exp(-4.0 * t / duration)
            wave = wave * envelope

        # Normalize to 16-bit signed integer range
        audio = (wave * 32767.0 * 0.4).astype(np.int16)
        # Stereo
        stereo = np.column_stack((audio, audio))
        return pygame.sndarray.make_sound(stereo)

    def _generate_procedural_sounds(self):
        # 1. Countdown Tick (crisp 800Hz blip)
        self._sounds["tick"] = self._make_tone(880.0, 0.08)

        # 2. Countdown Go / Zero (bright 1760Hz double tone)
        self._sounds["go"] = self._make_tone(1760.0, 0.15)

        # 3. Decision Snap (ultra-fast 1200Hz snap)
        self._sounds["snap"] = self._make_tone(1200.0, 0.05)

        # 4. Victory Sound (harmonic chime)
        duration = 0.4
        t = np.linspace(0, duration, int(44100 * duration), endpoint=False)
        chord = (np.sin(2 * np.pi * 523.25 * t) + np.sin(2 * np.pi * 659.25 * t) + np.sin(2 * np.pi * 783.99 * t)) / 3.0
        envelope = np.exp(-3.0 * t / duration)
        chord_audio = (chord * envelope * 32767.0 * 0.4).astype(np.int16)
        self._sounds["win"] = pygame.sndarray.make_sound(np.column_stack((chord_audio, chord_audio)))

        # 5. Cheat Siren (harsh sawtooth-like alternating buzz)
        siren_len = int(44100 * 0.3)
        t_s = np.linspace(0, 0.3, siren_len, endpoint=False)
        buzz = np.sign(np.sin(2 * np.pi * 320.0 * t_s)) * 0.35
        buzz_audio = (buzz * 32767.0).astype(np.int16)
        self._sounds["cheat"] = pygame.sndarray.make_sound(np.column_stack((buzz_audio, buzz_audio)))

    def play(self, sound_name: str):
        if not self.enabled or sound_name not in self._sounds:
            return
        try:
            self._sounds[sound_name].play()
        except Exception:
            pass
