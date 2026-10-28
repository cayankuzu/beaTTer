from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8080/')
        page.wait_for_timeout(2000)

        test_js = """
        () => {
            function makeHand(openFingers = [false, false, false, false], rollAngle = 0, pitchAngle = 0) {
                const lms = [];
                // 0: Wrist
                lms.push({ x: 0, y: -0.2, z: 0 });

                // Thumb: 1, 2, 3, 4
                lms.push({ x: -0.06, y: -0.12, z: -0.02 });
                lms.push({ x: -0.10, y: -0.06, z: -0.03 });
                lms.push({ x: -0.12, y: 0.00, z: -0.03 });
                lms.push({ x: -0.14, y: 0.05, z: -0.03 });

                // 4 Fingers: Index, Mid, Ring, Pinky
                const fingerConfigs = [
                    { mcpX: -0.06, isOpen: openFingers[0] }, // Index: 5,6,7,8
                    { mcpX: -0.02, isOpen: openFingers[1] }, // Mid: 9,10,11,12
                    { mcpX: 0.02,  isOpen: openFingers[2] }, // Ring: 13,14,15,16
                    { mcpX: 0.06,  isOpen: openFingers[3] }  // Pinky: 17,18,19,20
                ];

                fingerConfigs.forEach(f => {
                    const mcp = { x: f.mcpX, y: 0.0, z: 0.0 };
                    lms.push(mcp);
                    if (f.isOpen) {
                        lms.push({ x: f.mcpX, y: 0.05, z: 0.0 });
                        lms.push({ x: f.mcpX, y: 0.10, z: 0.0 });
                        lms.push({ x: f.mcpX, y: 0.15, z: 0.0 });
                    } else {
                        lms.push({ x: f.mcpX, y: 0.03, z: -0.03 });
                        lms.push({ x: f.mcpX, y: 0.01, z: -0.05 });
                        lms.push({ x: f.mcpX, y: -0.02, z: -0.03 });
                    }
                });

                // Apply 3D rotations:
                return lms.map(p => {
                    let { x, y, z } = p;
                    // Pitch (rotation around X)
                    if (pitchAngle !== 0) {
                        const cosP = Math.cos(pitchAngle);
                        const sinP = Math.sin(pitchAngle);
                        const yNew = y * cosP - z * sinP;
                        const zNew = y * sinP + z * cosP;
                        y = yNew;
                        z = zNew;
                    }
                    // Roll (rotation around Z)
                    if (rollAngle !== 0) {
                        const cosR = Math.cos(rollAngle);
                        const sinR = Math.sin(rollAngle);
                        const xNew = x * cosR - y * sinR;
                        const yNew = x * sinR + y * cosR;
                        x = xNew;
                        y = yNew;
                    }
                    return { x, y, z };
                });
            }

            const eng = window.OmegaVisionEngine;
            return {
                // Rock variations
                rockStraight: eng.classify(makeHand([false, false, false, false], 0, 0)).gesture,
                rockTilted45: eng.classify(makeHand([false, false, false, false], Math.PI * 0.25, 0)).gesture,
                rockPitch45: eng.classify(makeHand([false, false, false, false], 0, Math.PI * 0.25)).gesture,
                rockUpsideDown: eng.classify(makeHand([false, false, false, false], Math.PI, 0)).gesture,

                // Paper variations
                paperStraight: eng.classify(makeHand([true, true, true, true], 0, 0)).gesture,
                paperTilted45: eng.classify(makeHand([true, true, true, true], Math.PI * 0.25, 0)).gesture,
                paperPitch45: eng.classify(makeHand([true, true, true, true], 0, Math.PI * 0.25)).gesture,
                paperUpsideDown: eng.classify(makeHand([true, true, true, true], Math.PI, 0)).gesture,

                // Scissors variations
                scisStraight: eng.classify(makeHand([true, true, false, false], 0, 0)).gesture,
                scisTilted45: eng.classify(makeHand([true, true, false, false], Math.PI * 0.25, 0)).gesture,
                scisPitch45: eng.classify(makeHand([true, true, false, false], 0, Math.PI * 0.25)).gesture,
                scisUpsideDown: eng.classify(makeHand([true, true, false, false], Math.PI, 0)).gesture,
            };
        }
        """

        res = page.evaluate(test_js)
        print("ALL ANGLE CLASSIFICATION RESULTS:")
        for k, v in res.items():
            print(f"  {k}: {v}")
        browser.close()

if __name__ == '__main__':
    run()
