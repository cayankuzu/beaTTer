import os
import time
import base64
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_img_path = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41\.user_uploaded\media_1793301965338_0b525e82.png"

with open(user_img_path, "rb") as f:
    b64_img = base64.b64encode(f.read()).decode("utf-8")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True
        )
        page = browser.new_page()
        page.goto("http://localhost:8000")
        
        res = page.evaluate("""
            async (b64) => {
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
                        runningMode: "IMAGE",
                        minDetectionConfidence: 0.25
                    });
                    
                    const img = new Image();
                    img.src = "data:image/png;base64," + b64;
                    await new Promise(r => img.onload = r);
                    
                    const results = detector.detect(img);
                    return {
                        success: true,
                        detectionCount: results.detections ? results.detections.length : 0,
                        detections: results.detections
                    };
                } catch (e) {
                    return { success: false, error: e.toString() };
                }
            }
        """, b64_img)
        
        print("Detection count on user photo:", res.get("detectionCount"))
        if res.get("detections"):
            for d in res["detections"]:
                print("Detected Face Box:", d["boundingBox"])
                print("Categories:", d["categories"])
                
        browser.close()

if __name__ == "__main__":
    main()
