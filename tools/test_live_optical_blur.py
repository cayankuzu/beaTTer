import os
import time
import base64
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
artifact_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"
user_photo_path = os.path.join(artifact_dir, ".user_uploaded", "media_1793301965338_0b525e82.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--no-sandbox"]
        )
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        page.goto("http://localhost:8000", wait_until="domcontentloaded")
        page.wait_for_selector("#webcam")
        time.sleep(2.5)

        res = page.evaluate("""
            () => ({
                hasFaceDetector: !!window.faceDetector,
                hasGestureRecognizer: !!window.gestureRecognizer,
                hasJankenMind: !!window.JankenMind,
                hasCognitiveBrain: !!window.CognitiveBrain,
                isPrivacyEnabled: window.setFacePrivacyShield !== undefined
            })
        """)
        print("Page ML & Vision status:", res)
        assert res["hasFaceDetector"], "FaceDetector failed to load"
        assert res["hasGestureRecognizer"], "GestureRecognizer failed to load"
        assert res["hasJankenMind"], "JankenMind failed to load"
        assert res["hasCognitiveBrain"], "CognitiveBrain failed to load"

        # Test dim-room face detection & universal pyramid blur (even without ctx.filter, like iOS Safari!)
        if os.path.exists(user_photo_path):
            with open(user_photo_path, "rb") as f:
                b64_img = base64.b64encode(f.read()).decode("ascii")

            blur_check = page.evaluate("""
                async (b64) => {
                    const img = new Image();
                    img.src = "data:image/png;base64," + b64;
                    await new Promise(r => { img.onload = r; });

                    // Crop the camera area from the user's screenshot (left box: x=14..630, y=132..900)
                    const fakeVideoCanvas = document.createElement("canvas");
                    fakeVideoCanvas.width = 480;
                    fakeVideoCanvas.height = 600;
                    const fvCtx = fakeVideoCanvas.getContext("2d");
                    fvCtx.drawImage(img, 14, 132, 616, 768, 0, 0, 480, 600);
                    fakeVideoCanvas.readyState = 4;
                    fakeVideoCanvas.videoWidth = 480;
                    fakeVideoCanvas.videoHeight = 600;

                    // Test 1: Run low-light skin/head cluster detector on the user's dim room frame
                    const skinBox = detectSkinHeadCluster(fakeVideoCanvas, null, 480, 600);

                    // Test 2: Run MediaPipe BlazeFace on the user's dim room frame
                    let blazeDetections = [];
                    if (window.faceDetector) {
                        const r = window.faceDetector.detectForVideo(fakeVideoCanvas, Math.round(performance.now()) + 5000);
                        if (r && r.detections) blazeDetections = r.detections;
                    }

                    // Test 3: Render onto test canvas & measure high-frequency gradient reduction on the face
                    const testCanvas = document.createElement("canvas");
                    testCanvas.width = 480;
                    testCanvas.height = 600;
                    const testCtx = testCanvas.getContext("2d");

                    // Compute sharp face pixel variance before blur
                    const sharpData = fvCtx.getImageData(140, 220, 200, 220).data;
                    let sharpGrad = 0;
                    for (let i = 0; i < sharpData.length - 16; i += 4) {
                        sharpGrad += Math.abs(sharpData[i] - sharpData[i + 16]);
                    }

                    // Draw sharp base + optical face privacy blur
                    testCtx.drawImage(fakeVideoCanvas, 0, 0);
                    drawDynamicFacePrivacy(testCtx, fakeVideoCanvas, testCanvas, blazeDetections, true, null);

                    const blurredData = testCtx.getImageData(140, 220, 200, 220).data;
                    let blurredGrad = 0;
                    for (let i = 0; i < blurredData.length - 16; i += 4) {
                        blurredGrad += Math.abs(blurredData[i] - blurredData[i + 16]);
                    }

                    return {
                        blazeFacesFound: blazeDetections.length,
                        skinBoxFound: !!skinBox,
                        skinBox,
                        sharpGrad,
                        blurredGrad,
                        reductionRatio: blurredGrad / Math.max(1, sharpGrad)
                    };
                }
            """, b64_img)
            print("Dim-Room Optical Censorship Verification:", blur_check)
            assert blur_check["blurredGrad"] < blur_check["sharpGrad"] * 0.55, "Face blur did not sufficiently reduce high-frequency detail!"

            screenshot_dim_fixed = os.path.join(artifact_dir, "app_live_optical_blur.png")
            page.screenshot(path=screenshot_dim_fixed)
            print("Saved verified optical blur screenshot to:", screenshot_dim_fixed)

        # Also verify Tablet Portrait (820x1180) and Mobile (390x844) layout & privacy shield
        for name, vp in [("tablet_portrait", {"width": 820, "height": 1180}), ("mobile_portrait", {"width": 390, "height": 844})]:
            page.set_viewport_size(vp)
            time.sleep(0.4)
            layout_ok = page.evaluate("""
                () => {
                    const pBox = document.querySelector(".player-box").getBoundingClientRect();
                    const rBox = document.querySelector(".rival-box").getBoundingClientRect();
                    return {
                        playerVisible: pBox.width > 200 && pBox.height > 150,
                        rivalVisible: rBox.width > 200 && rBox.height > 150,
                        stackedOrSideBySideClean: (rBox.top >= pBox.bottom - 10) || (rBox.left >= pBox.right - 10)
                    };
                }
            """)
            print(f"Viewport {name} ({vp['width']}x{vp['height']}) check:", layout_ok)
            assert layout_ok["playerVisible"] and layout_ok["rivalVisible"] and layout_ok["stackedOrSideBySideClean"]

        browser.close()
        print("ALL LIVE OPTICAL BLUR & MULTI-DEVICE CHECKS PASSED!")

if __name__ == "__main__":
    main()
