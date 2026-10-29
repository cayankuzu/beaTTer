import os
import time
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--no-sandbox"]
        )
        page = browser.new_page()
        page.goto("http://localhost:8000")
        
        # Test loading FaceDetector in page context
        res = page.evaluate("""
            async () => {
                try {
                    const visionModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14");
                    const { FaceDetector, FilesetResolver } = visionModule;
                    
                    const vision = await FilesetResolver.forVisionTasks(
                        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
                    );
                    
                    const detector = await FaceDetector.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: "./blaze_face_short_range.tflite"
                        },
                        runningMode: "VIDEO",
                        minDetectionConfidence: 0.3
                    });
                    
                    return { success: true, detectorExists: !!detector };
                } catch (e) {
                    return { success: false, error: e.toString() };
                }
            }
        """)
        
        print("FaceDetector Load Test Result:", res)
        browser.close()

if __name__ == "__main__":
    main()
