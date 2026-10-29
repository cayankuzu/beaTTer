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
                
                // Canvas 1: Natural Optical Camera Defocus (Feathered Radial Falloff, Bokeh, No Mask Line, No Ring)
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                
                // 1. Draw original base image
                ctx.drawImage(img, 0, 0);
                
                // 2. Create offscreen feathered blur layer
                const blurCanvas = document.createElement("canvas");
                blurCanvas.width = img.width;
                blurCanvas.height = img.height;
                const blurCtx = blurCanvas.getContext("2d");
                
                // Draw blurred image
                blurCtx.filter = "blur(38px)";
                blurCtx.drawImage(img, 0, 0);
                
                // Now mask the blur canvas using a smooth radial gradient centered on the face
                const cx = box.originX + box.width / 2;
                const cy = box.originY + box.height / 2;
                const rx = (box.width / 2) * 1.5;
                const ry = (box.height / 2) * 1.7;
                const maxR = Math.max(rx, ry);
                
                // Destination-in composite operation to feather the blur naturally
                blurCtx.save();
                blurCtx.globalCompositeOperation = "destination-in";
                
                // Radial gradient that is fully opaque at center, smoothly fading out to 0 at edges
                blurCtx.translate(cx, cy);
                blurCtx.scale(rx / maxR, ry / maxR);
                const grad = blurCtx.createRadialGradient(0, 0, maxR * 0.25, 0, 0, maxR);
                grad.addColorStop(0.0, "rgba(0, 0, 0, 1.0)");
                grad.addColorStop(0.55, "rgba(0, 0, 0, 0.95)");
                grad.addColorStop(0.85, "rgba(0, 0, 0, 0.45)");
                grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
                
                blurCtx.fillStyle = grad;
                blurCtx.beginPath();
                blurCtx.arc(0, 0, maxR, 0, Math.PI * 2);
                blurCtx.fill();
                blurCtx.restore();
                
                // 3. Composite the feathered blur over the base image
                ctx.drawImage(blurCanvas, 0, 0);
                
                // Return rendered image
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
            out_file = os.path.join(artifact_dir, "face_optical_blur_feathered.png")
            with open(out_file, "wb") as f:
                f.write(img_data)
            print("Successfully created feathered optical defocus prototype at:", out_file)
        else:
            print("Failed:", res)
            
        browser.close()

if __name__ == "__main__":
    main()
