import os
from typing import Dict, Any, List, Optional
import numpy as np

try:
    from PIL import Image
    import cv2
except ImportError:
    Image = None
    cv2 = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

class ImageAnalyzer:
    @staticmethod
    def extract_features(media_path: Optional[str]) -> Dict[str, Any]:
        default_features = {
            "width": None,
            "height": None,
            "aspect_ratio": None,
            "brightness": 0.5,
            "contrast": 0.5,
            "saturation": 0.5,
            "dominant_colors": ["#4F46E5", "#1E1B4B", "#F3F4F6"],
            "color_histogram": {},
            "text_area_ratio": 0.0,
            "ocr_text": "",
        }
        
        if not media_path or not os.path.exists(media_path) or Image is None or cv2 is None:
            return default_features

        try:
            pil_img = Image.open(media_path).convert("RGB")
            width, height = pil_img.size
            aspect_ratio = round(width / max(1, height), 2)
            
            # Convert to OpenCV format (BGR & HSV)
            img_np = np.array(pil_img)
            img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
            img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
            img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

            # Brightness (average value in V channel)
            brightness = round(float(np.mean(img_hsv[:, :, 2])) / 255.0, 2)
            
            # Contrast (standard deviation of grayscale intensity)
            contrast = round(float(np.std(img_gray)) / 128.0, 2)
            
            # Saturation (average value in S channel)
            saturation = round(float(np.mean(img_hsv[:, :, 1])) / 255.0, 2)

            # Dominant colors via K-Means clustering
            dominant_colors = ImageAnalyzer._get_dominant_colors(img_np, k=3)

            # Estimated text area ratio (Edge density + bounding box heuristics)
            edges = cv2.Canny(img_gray, 100, 200)
            text_area_ratio = round(float(np.count_nonzero(edges)) / max(1, edges.size), 2)

            # OCR Extraction via pytesseract if available
            ocr_text = ""
            if pytesseract:
                try:
                    ocr_text = pytesseract.image_to_string(pil_img).strip()
                except Exception:
                    ocr_text = ""

            return {
                "width": width,
                "height": height,
                "aspect_ratio": aspect_ratio,
                "brightness": brightness,
                "contrast": contrast,
                "saturation": saturation,
                "dominant_colors": dominant_colors,
                "color_histogram": {},
                "text_area_ratio": text_area_ratio,
                "ocr_text": ocr_text,
            }

        except Exception as e:
            return default_features

    @staticmethod
    def _get_dominant_colors(img_np: np.ndarray, k: int = 3) -> List[str]:
        try:
            pixels = img_np.reshape(-1, 3).astype(np.float32)
            if len(pixels) > 10000:
                # Downsample for performance
                indices = np.random.choice(len(pixels), 10000, replace=False)
                pixels = pixels[indices]
                
            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
            _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
            
            hex_colors = []
            for center in centers:
                r, g, b = int(center[0]), int(center[1]), int(center[2])
                hex_colors.append(f"#{r:02x}{g:02x}{b:02x}".upper())
            return hex_colors
        except Exception:
            return ["#1E293B", "#64748B", "#F8FAFC"]
