import os
import time
from playwright.sync_api import sync_playwright

def test_twin_and_3d():
    artifact_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"
    os.makedirs(artifact_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        errors = []
        logs = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        print("Navigating to http://localhost:8080/...")
        page.goto("http://localhost:8080/")
        page.wait_for_timeout(2000)

        # 1. Check Twin3D status in RPS mode
        rps_eval = page.evaluate("""() => {
            const canvas = document.getElementById('rival-canvas');
            const twin = window.twin3D;
            return {
                twinExists: !!twin,
                isWebGL: twin ? twin.isWebGL : false,
                canvasWidth: canvas ? canvas.width : 0,
                canvasHeight: canvas ? canvas.height : 0,
                activeMode: document.body.className
            };
        }""")
        print("RPS Mode 3D Status:", rps_eval)
        rps_screen_path = os.path.join(artifact_dir, "screen_rps_3d.png")
        page.screenshot(path=rps_screen_path)
        print(f"Saved RPS screenshot to {rps_screen_path}")

        # 2. Switch to MindTwin Mode
        print("Switching to MindTwin Mode...")
        page.click("#tab-mode-mindtwin")
        page.wait_for_timeout(1000)

        # 3. Test Mirrored Hand Orientation Math (Palm facing vs Dorsal / Back of hand)
        orientation_eval = page.evaluate("""() => {
            const twin = window.twin3D;
            if (!twin || !twin.computeHandOrientation) return { error: "computeHandOrientation missing" };

            // In mirrored space: x_m = 1.0 - raw_x
            // Case A: Palm facing camera:
            // In raw image: Wrist=(0.5, 0.7), Mid=(0.5, 0.35), Pinky on left (raw_x=0.35), Index on right (raw_x=0.65)
            const lmsPalm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
            lmsPalm[0] = { x: 0.5, y: 0.7, z: 0 };  // Wrist
            lmsPalm[9] = { x: 0.5, y: 0.35, z: 0 }; // Mid MCP
            lmsPalm[5] = { x: 0.65, y: 0.38, z: 0 };// Index MCP (raw right -> mirrored left)
            lmsPalm[17] = { x: 0.35, y: 0.42, z: 0 };// Pinky MCP (raw left -> mirrored right)

            const quatPalm = twin.computeHandOrientation(lmsPalm);

            // Case B: Back of hand (Dorsal) facing camera:
            // In raw image: Index on left (raw_x=0.35), Pinky on right (raw_x=0.65)
            const lmsDorsal = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
            lmsDorsal[0] = { x: 0.5, y: 0.7, z: 0 };
            lmsDorsal[9] = { x: 0.5, y: 0.35, z: 0 };
            lmsDorsal[5] = { x: 0.35, y: 0.38, z: 0 };// Index MCP (raw left -> mirrored right)
            lmsDorsal[17] = { x: 0.65, y: 0.42, z: 0 };// Pinky MCP (raw right -> mirrored left)

            const quatDorsal = twin.computeHandOrientation(lmsDorsal);

            return {
                quatPalm: quatPalm ? { x: quatPalm.x, y: quatPalm.y, z: quatPalm.z, w: quatPalm.w } : null,
                quatDorsal: quatDorsal ? { x: quatDorsal.x, y: quatDorsal.y, z: quatDorsal.z, w: quatDorsal.w } : null,
                isRotated180: quatDorsal && Math.abs(quatDorsal.y) > 0.8
            };
        }""")
        print("Hand Orientation Evaluation:", orientation_eval)

        # 4. Test 1€ Motion Stabilizer and Schmitt-Trigger Predictive MindTwin
        predict_eval = page.evaluate("""() => {
            const engine = window.mindTwinEngine;
            if (!engine) return { error: "mindTwinEngine missing" };

            // Synthetic hand with Victory (2 fingers: index & middle straight, ring & pinky curled)
            const lmsVictory = Array.from({ length: 21 }, (_, i) => ({ x: 0.5, y: 0.5 + (i * 0.01), z: 0 }));
            lmsVictory[0] = { x: 0.5, y: 0.7, z: 0 };  // Wrist
            lmsVictory[9] = { x: 0.5, y: 0.5, z: 0 };  // Mid base
            // Index straight
            lmsVictory[5] = { x: 0.45, y: 0.5, z: 0 };
            lmsVictory[6] = { x: 0.45, y: 0.4, z: 0 };
            lmsVictory[7] = { x: 0.45, y: 0.3, z: 0 };
            lmsVictory[8] = { x: 0.45, y: 0.2, z: 0 };
            // Middle straight
            lmsVictory[9] = { x: 0.50, y: 0.5, z: 0 };
            lmsVictory[10] = { x: 0.50, y: 0.38, z: 0 };
            lmsVictory[11] = { x: 0.50, y: 0.28, z: 0 };
            lmsVictory[12] = { x: 0.50, y: 0.18, z: 0 };
            // Ring curled into palm
            lmsVictory[13] = { x: 0.55, y: 0.5, z: 0 };
            lmsVictory[14] = { x: 0.55, y: 0.45, z: 0 };
            lmsVictory[15] = { x: 0.55, y: 0.50, z: 0 };
            lmsVictory[16] = { x: 0.55, y: 0.55, z: 0 };
            // Pinky curled into palm
            lmsVictory[17] = { x: 0.60, y: 0.52, z: 0 };
            lmsVictory[18] = { x: 0.60, y: 0.48, z: 0 };
            lmsVictory[19] = { x: 0.60, y: 0.52, z: 0 };
            lmsVictory[20] = { x: 0.60, y: 0.56, z: 0 };

            const intent = engine.process(lmsVictory, 0.016);
            return {
                intentFingerCount: intent.fingerCount,
                curls: intent.curls,
                futurePose: intent.futurePose,
                predictedFingers: intent.predictedFingers,
                leadTimeMs: intent.leadTimeMs,
                confidence: intent.confidence
            };
        }""")
        print("Continuous Biomechanical Intent Result:", predict_eval)

        mindtwin_screen_path = os.path.join(artifact_dir, "screen_mindtwin_3d.png")
        page.screenshot(path=mindtwin_screen_path)
        print(f"Saved MindTwin screenshot to {mindtwin_screen_path}")

        print("PAGE ERRORS:", errors)
        browser.close()
        assert len(errors) == 0, f"Found page errors: {errors}"
        assert orientation_eval.get("isRotated180"), "Orientation 180 flip failed"
        assert predict_eval.get("intentFingerCount") == 2, f"Expected 2 fingers for Victory, got {predict_eval}"
        print("ALL COMPREHENSIVE TESTS PASSED 100% CLEANLY!")

if __name__ == "__main__":
    test_twin_and_3d()
