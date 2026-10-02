import os
import pytest
import numpy as np
from PIL import Image, ImageDraw
from app.services.image_analyzer import ImageAnalyzer

@pytest.fixture
def temp_sample_image(tmp_path):
    img_path = str(tmp_path / "test_img.jpg")
    img = Image.new("RGB", (400, 400), color=(100, 150, 200))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "Sample Text for OCR Test", fill=(255, 255, 255))
    img.save(img_path)
    return img_path

def test_tc_cv_001_and_005_valid_image_features(temp_sample_image):
    """TC-CV-001 & 005 — Image dimensions, aspect ratio, brightness, contrast, saturation"""
    feats = ImageAnalyzer.extract_features(temp_sample_image)
    
    assert feats["width"] == 400
    assert feats["height"] == 400
    assert feats["aspect_ratio"] == 1.0  # TC-CV-005: 400x400 aspect ratio
    assert 0.0 <= feats["brightness"] <= 1.0
    assert 0.0 <= feats["contrast"] <= 1.0
    assert 0.0 <= feats["saturation"] <= 1.0
    assert len(feats["dominant_colors"]) > 0

def test_tc_cv_003_image_without_text(tmp_path):
    """TC-CV-003 — Image without text OCR non-crashing execution"""
    blank_path = str(tmp_path / "blank.jpg")
    img = Image.new("RGB", (200, 200), color=(50, 50, 50))
    img.save(blank_path)

    feats = ImageAnalyzer.extract_features(blank_path)
    assert feats["width"] == 200
    assert isinstance(feats["ocr_text"], str)

def test_tc_cv_004_invalid_image_path():
    """TC-CV-004 — Invalid image path gracefully handled"""
    feats = ImageAnalyzer.extract_features("/nonexistent/path/image.jpg")
    assert feats["width"] is None
    assert feats["height"] is None
    assert feats["text_area_ratio"] == 0.0
    assert feats["ocr_text"] == ""
