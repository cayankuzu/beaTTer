"""
beaTTer - Hardware Abstraction Layer & Arduino Serial Bridge
Communicates with physical robotic hand (5 Servos: Thumb, Index, Middle, Ring, Pinky).
Falls back cleanly to Virtual/Mock mode if no physical COM port is connected.
"""
from typing import Optional
import time
from core.psychological import Gesture

class HardwareBridge:
    def __init__(self, port: str = "AUTO", baudrate: int = 115200, enabled: bool = False):
        self.port = port
        self.baudrate = baudrate
        self.enabled = enabled
        self.serial_conn = None
        self.is_connected = False
        self.last_command: str = "IDLE"
        self.simulated_servo_angles = {
            "thumb": 0, "index": 0, "middle": 0, "ring": 0, "pinky": 0
        }

        if self.enabled:
            self.connect()

    def connect(self) -> bool:
        """Attempts to open real Serial connection to Arduino."""
        try:
            import serial
            import serial.tools.list_ports

            target_port = self.port
            if target_port == "AUTO":
                ports = list(serial.tools.list_ports.comports())
                for p in ports:
                    if "Arduino" in p.description or "CH340" in p.description or "USB Serial" in p.description:
                        target_port = p.device
                        break
                if target_port == "AUTO" and ports:
                    target_port = ports[0].device

            if target_port and target_port != "AUTO":
                self.serial_conn = serial.Serial(target_port, self.baudrate, timeout=0.1)
                time.sleep(1.5)  # Wait for Arduino bootloader reset
                self.is_connected = True
                print(f"[HardwareBridge] Connected to Arduino on {target_port} @ {self.baudrate} baud.")
                return True
        except Exception as e:
            print(f"[HardwareBridge] Real serial unavailable ({e}). Running in VIRTUAL/SIMULATION mode.")

        self.is_connected = False
        return False

    def send_gesture(self, gesture: Gesture):
        """Sends command to form gesture on physical or virtual servos."""
        cmd = "0"
        if gesture == Gesture.ROCK:
            cmd = "R"
            self.simulated_servo_angles = {"thumb": 0, "index": 0, "middle": 0, "ring": 0, "pinky": 0}
        elif gesture == Gesture.PAPER:
            cmd = "P"
            self.simulated_servo_angles = {"thumb": 180, "index": 180, "middle": 180, "ring": 180, "pinky": 180}
        elif gesture == Gesture.SCISSORS:
            cmd = "S"
            self.simulated_servo_angles = {"thumb": 0, "index": 180, "middle": 180, "ring": 0, "pinky": 0}

        self.last_command = f"GESTURE:{gesture.value}"
        self._transmit(cmd)

    def send_countdown_tick(self, count: int):
        """Sends tick (3, 2, 1, 0) to Arduino for synchronized buzzer/LEDs."""
        self.last_command = f"COUNTDOWN:{count}"
        self._transmit(str(count))

    def _transmit(self, char_cmd: str):
        if self.is_connected and self.serial_conn:
            try:
                self.serial_conn.write(char_cmd.encode('ascii'))
            except Exception as e:
                print(f"[HardwareBridge] Serial write error: {e}")
                self.is_connected = False

    def get_status_str(self) -> str:
        if self.is_connected:
            return f"ARDUINO: CONNECTED ({self.last_command})"
        return f"ARDUINO: VIRTUAL SIMULATOR ({self.last_command})"

    def close(self):
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
            self.is_connected = False
