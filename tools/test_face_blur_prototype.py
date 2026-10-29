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
                
                // Now simulate drawing on a canvas with the image
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                
                // 1. Draw base image
                ctx.drawImage(img, 0, 0);
                
                // 2. Draw blurred face region
                const cx = box.originX + box.width / 2;
                const cy = box.originY + box.height / 2;
                const rx = (box.width / 2) * 1.35;
                const ry = (box.height / 2) * 1.55;
                
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.clip();
                
                // Apply canvas blur filter
                ctx.filter = "blur(32px) contrast(1.15) brightness(0.9)";
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Tint overlay
                ctx.filter = "none";
                ctx.fillStyle = "rgba(10, 25, 47, 0.45)";
                ctx.fill();
                
                // Cyberpunk outline
                ctx.strokeStyle = "rgba(0, 225, 255, 0.85)";
                ctx.lineWidth = 3;
                ctx.shadowColor = "#00e1ff";
                ctx.shadowBlur = 15;
                ctx.stroke();
                
                // Scan line
                ctx.strokeStyle = "rgba(0, 225, 255, 0.4)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - rx, cy);
                ctx.lineTo(cx + rx, cy);
                ctx.stroke();
                
                ctx.restore();
                
                // Add badge pill
                ctx.save();
                ctx.font = "bold 13px 'Fira Code', monospace";
                const badgeText = "🛡️ YÜZ KORUMASI // AKTİF";
                const textMetrics = ctx.measureText(badgeText);
                const pillW = textMetrics.width + 24;
                const pillH = 26;
                const pillX = cx - pillW / 2;
                const pillY = cy - ry - pillH - 8;
                
                ctx.fillStyle = "rgba(6, 12, 24, 0.88)";
                ctx.strokeStyle = "rgba(0, 225, 255, 0.6)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(pillX, pillY, pillW, pillH, 13);
                ctx.fill();
                ctx.stroke();
                
                ctx.fillStyle = "#38bdf8";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(badgeText, cx, pillY + pillH / 2);
                ctx.restore();
                
                return {
                    success: true,
                    dataUrl: canvas.toDataURL("image/png"),
                    box: box
                };
            }
        """
        
        res = page.evaluate(test_script, b64_img)
        if res.get("success"):
            data_url = res["dataUrl"]
            header, encoded = data_url.split(",", 1)
            img_data = base64.b64decode(encoded)
            out_file = os.path.join(artifact_dir, "face_ai_blur_prototype.png")
            with open(out_file, "wb") as f:
                f.write(img_data)
            print("Successfully created face blur prototype at:", out_file)
            print("Detected box:", res["box"])
        else:
            print("Failed:", res)
            
        browser.close()

if __name__ == "__main__":
    main()
