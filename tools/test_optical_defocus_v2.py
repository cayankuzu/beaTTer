import os
import base64
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_img_path = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41\.user_uploaded\media_1793301965338_0b525e82.png"
artifact_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"

with open(user_img_path, "rb") as f:
    b64_img = base64.b64encode(f.read()).decode("utf-8")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True
        )
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto("http://localhost:8000")
        
        test_script = """
            async (b64) => {
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
                if (!results.detections || results.detections.length === 0) {
                    return { success: false, reason: "No face detected" };
                }
                
                const box = results.detections[0].boundingBox;
                
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                
                // 1. Draw base image
                ctx.drawImage(img, 0, 0);
                
                // 2. Offscreen canvas for optical defocus
                const blurCanvas = document.createElement("canvas");
                blurCanvas.width = img.width;
                blurCanvas.height = img.height;
                const bCtx = blurCanvas.getContext("2d");
                
                // Primary optical blur (heavy Gaussian defocus)
                bCtx.filter = "blur(46px) saturate(1.15) contrast(1.05)";
                bCtx.drawImage(img, 0, 0);
                
                // Secondary subtle chromatic lens dispersion (R & B offset)
                bCtx.globalCompositeOperation = "screen";
                bCtx.filter = "blur(32px)";
                bCtx.drawImage(img, 2, -1);
                bCtx.globalCompositeOperation = "source-over";
                
                const cx = box.originX + box.width / 2;
                const cy = box.originY + box.height / 2;
                const rx = (box.width / 2) * 1.55;
                const ry = (box.height / 2) * 1.75;
                const maxR = Math.max(rx, ry);
                
                // Destination-in smooth feathered feathering
                bCtx.save();
                bCtx.globalCompositeOperation = "destination-in";
                bCtx.translate(cx, cy);
                bCtx.scale(rx / maxR, ry / maxR);
                const grad = bCtx.createRadialGradient(0, 0, maxR * 0.2, 0, 0, maxR);
                grad.addColorStop(0.0, "rgba(0, 0, 0, 1.0)");
                grad.addColorStop(0.5, "rgba(0, 0, 0, 0.98)");
                grad.addColorStop(0.75, "rgba(0, 0, 0, 0.70)");
                grad.addColorStop(0.92, "rgba(0, 0, 0, 0.25)");
                grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
                
                bCtx.fillStyle = grad;
                bCtx.beginPath();
                bCtx.arc(0, 0, maxR, 0, Math.PI * 2);
                bCtx.fill();
                bCtx.restore();
                
                // Draw feathered defocus on main canvas
                ctx.drawImage(blurCanvas, 0, 0);
                
                return {
                    success: true,
                    dataUrl: canvas.toDataURL("image/png")
                };
            }
        """
        
        res = page.evaluate(test_script, b64_img)
        if res.get("success"):
            data_url = res["dataUrl"]
            header, encoded = data_url.split(",", 1)
            img_data = base64.b64decode(encoded)
            out_file = os.path.join(artifact_dir, "face_optical_blur_v2.png")
            with open(out_file, "wb") as f:
                f.write(img_data)
            print("Successfully created V2 optical blur prototype at:", out_file)
        else:
            print("Failed:", res)
            
        browser.close()

if __name__ == "__main__":
    main()
