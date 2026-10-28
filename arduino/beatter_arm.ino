/*
 * beaTTer - Unbeatable Rock-Paper-Scissors Arduino Firmware
 * Controls 5 Servo Motors for robotic hand fingers:
 * Pin 3: Thumb Servo
 * Pin 5: Index Servo
 * Pin 6: Middle Servo
 * Pin 9: Ring Servo
 * Pin 10: Pinky Servo
 * Pin 11: Buzzer / LED indicator
 * Baud Rate: 115200
 */

#include <Servo.h>

Servo servoThumb;
Servo servoIndex;
Servo servoMiddle;
Servo servoRing;
Servo servoPinky;

const int PIN_THUMB = 3;
const int PIN_INDEX = 5;
const int PIN_MIDDLE = 6;
const int PIN_RING = 9;
const int PIN_PINKY = 10;
const int PIN_BUZZER = 11;

// Servo angle limits (calibrate for your physical hand mechanics)
const int ANGLE_CURL = 0;    // Closed fist
const int ANGLE_EXTEND = 175; // Open finger

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);

  servoThumb.attach(PIN_THUMB);
  servoIndex.attach(PIN_INDEX);
  servoMiddle.attach(PIN_MIDDLE);
  servoRing.attach(PIN_RING);
  servoPinky.attach(PIN_PINKY);

  // Initial neutral state (Fist / Rock ready position)
  poseRock();
  digitalWrite(PIN_BUZZER, HIGH);
  delay(100);
  digitalWrite(PIN_BUZZER, LOW);
  Serial.println("BEATTER_ARM_READY");
}

void poseRock() {
  servoThumb.write(ANGLE_CURL);
  servoIndex.write(ANGLE_CURL);
  servoMiddle.write(ANGLE_CURL);
  servoRing.write(ANGLE_CURL);
  servoPinky.write(ANGLE_CURL);
}

void posePaper() {
  servoThumb.write(ANGLE_EXTEND);
  servoIndex.write(ANGLE_EXTEND);
  servoMiddle.write(ANGLE_EXTEND);
  servoRing.write(ANGLE_EXTEND);
  servoPinky.write(ANGLE_EXTEND);
}

void poseScissors() {
  servoThumb.write(ANGLE_CURL);
  servoIndex.write(ANGLE_EXTEND);
  servoMiddle.write(ANGLE_EXTEND);
  servoRing.write(ANGLE_CURL);
  servoPinky.write(ANGLE_CURL);
}

void loop() {
  if (Serial.available() > 0) {
    char cmd = Serial.read();

    switch (cmd) {
      case 'R': // Bot plays Rock
        poseRock();
        break;

      case 'P': // Bot plays Paper
        posePaper();
        break;

      case 'S': // Bot plays Scissors
        poseScissors();
        break;

      case '3':
      case '2':
      case '1':
        // Beep/flash during countdown
        tone(PIN_BUZZER, 800 + (cmd - '0') * 200, 40);
        break;

      case '0': // Shoot sound & neutral
        tone(PIN_BUZZER, 1800, 80);
        break;

      default:
        break;
    }
  }
}
