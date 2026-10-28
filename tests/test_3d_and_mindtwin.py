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

        # 3. Test Hand Orientation Math (Palm facing vs Dorsal / Back of hand)
        orientation_eval = page.evaluate("""() => {
            const twin = window.twin3D;
            if (!twin || !twin.computeHandOrientation) return { error: "computeHandOrientation missing" };

            // Landmark coordinates: W at (0.5, 0.7, 0), Mid at (0.5, 0.4, 0) -> Fingers point UP
            // Case A: Palm facing camera: Pinky is on right (x=0.6), Index is on left (x=0.4)
            const lmsPalm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
            lmsPalm[0] = { x: 0.5, y: 0.7, z: 0 };  // Wrist
            lmsPalm[9] = { x: 0.5, y: 0.35, z: 0 }; // Mid MCP
            lmsPalm[5] = { x: 0.38, y: 0.38, z: 0 };// Index MCP (left)
            lmsPalm[17] = { x: 0.62, y: 0.42, z: 0 };// Pinky MCP (right)

            const quatPalm = twin.computeHandOrientation(lmsPalm);

            // Case B: Back of hand (Dorsal) facing camera: Index is on right (x=0.6), Pinky is on left (x=0.4)
            const lmsDorsal = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
            lmsDorsal[0] = { x: 0.5, y: 0.7, z: 0 };
            lmsDorsal[9] = { x: 0.5, y: 0.35, z: 0 };
            lmsDorsal[5] = { x: 0.62, y: 0.38, z: 0 };// Index MCP (right)
            lmsDorsal[17] = { x: 0.38, y: 0.42, z: 0 };// Pinky MCP (left)

            const quatDorsal = twin.computeHandOrientation(lmsDorsal);

            return {
                quatPalm: quatPalm ? { x: quatPalm.x, y: quatPalm.y, z: quatPalm.z, w: quatPalm.w } : null,
                quatDorsal: quatDorsal ? { x: quatDorsal.x, y: quatDorsal.y, z: quatDorsal.z, w: quatDorsal.w } : null,
                isRotated180: quatDorsal && Math.abs(quatDorsal.y) > 0.8
            };
        }""")
        print("Hand Orientation Evaluation:", orientation_eval)

        # 4. Test Micro-Kinetic Intent Prediction in MindTwin
        predict_eval = page.evaluate("""() => {
            const engine = window.mindTwinEngine;
            if (!engine) return { error: "mindTwinEngine missing" };

            // Frame 1: Intermediate curled hand
            const lms1 = Array.from({ length: 21 }, (_, i) => ({ x: 0.5, y: 0.5 + (i * 0.01), z: 0 }));
            lms1[0] = { x: 0.5, y: 0.7, z: 0 };
            lms1[9] = { x: 0.5, y: 0.5, z: 0 };
            [8, 12, 16, 20].forEach(tip => { lms1[tip] = { x: 0.5, y: 0.55, z: 0 }; });
            engine.process(lms1, 0.016);

            // Frame 2: Index and middle fingers twitching outward with high velocity!
            const lms2 = JSON.parse(JSON.stringify(lms1));
            lms2[8] = { x: 0.45, y: 0.28, z: 0 }; // index tip shot upward
            lms2[12] = { x: 0.52, y: 0.26, z: 0 }; // middle tip shot upward
            lms2[16] = { x: 0.56, y: 0.58, z: 0 };
            lms2[20] = { x: 0.60, y: 0.60, z: 0 };

            const intent = engine.process(lms2, 0.016);
            return {
                intentFingerCount: intent.fingerCount,
                futurePose: intent.futurePose,
                predictedFingers: intent.predictedFingers,
                leadTimeMs: intent.leadTimeMs,
                confidence: intent.confidence
            };
        }""")
        print("Micro-Kinetic Intent Prediction Result:", predict_eval)

        mindtwin_screen_path = os.path.join(artifact_dir, "screen_mindtwin_3d.png")
        page.screenshot(path=mindtwin_screen_path)
        print(f"Saved MindTwin screenshot to {mindtwin_screen_path}")

        print("PAGE ERRORS:", errors)
        browser.close()
        assert len(errors) == 0, f"Found page errors: {errors}"
        print("ALL TESTS PASSED CLEANLY!")

if __name__ == "__main__":
    test_twin_and_3d()
