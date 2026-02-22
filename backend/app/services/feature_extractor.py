import os
import sys
import numpy as np
from PIL import Image
from pathlib import Path
import urllib.request
import logging

logger = logging.getLogger(__name__)

# Constants for MobileNet V3 Small
MODEL_URL = "https://github.com/onnx/models/raw/main/vision/classification/mobilenet/model/mobilenetv2-7.onnx"
# We actually want MobileNet V2 for its 1280-d feature vector and good availability
MODEL_FILENAME = "mobilenetv2-7.onnx"
INPUT_SIZE = (224, 224)

# Global ONNX session
_session = None


def get_model_path() -> Path:
    """Get path to the ONNX model, ensuring models directory exists."""
    # In frozen mode (PyInstaller), we might package the model differently,
    # but for now we store it in data/models alongside the SQLite DB
    data_dir = os.environ.get("DATA_DIR", "data")
    if getattr(sys, "frozen", False):
        models_dir = Path(data_dir) / "models"
    else:
        # Development mode
        models_dir = Path("backend/data/models")
        if not models_dir.parent.exists():
            models_dir = Path("data/models")
            
    models_dir.mkdir(parents=True, exist_ok=True)
    return models_dir / MODEL_FILENAME


def initialize_model() -> None:
    """Download (if needed) and initialize the ONNX model."""
    global _session
    if _session is not None:
        return

    import onnxruntime as ort

    model_path = get_model_path()
    if not model_path.exists():
        logger.info(f"Downloading MobileNet ONNX model to {model_path}...")
        try:
            urllib.request.urlretrieve(MODEL_URL, model_path)
            logger.info("Download complete.")
        except Exception as e:
            logger.error(f"Failed to download model: {e}")
            raise RuntimeError(f"Could not download Visual Lens model: {e}")

    try:
        # Use CPUExecutionProvider for maximum compatibility
        _session = ort.InferenceSession(
            str(model_path), 
            providers=['CPUExecutionProvider']
        )
        logger.info("ONNX model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize ONNX session: {e}")
        raise RuntimeError(f"Could not load Visual Lens model: {e}")


def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Preprocess PIL Image for MobileNetV2.
    Resizes, center crops, converts to RGB, normalizes, and shapes as (1, 3, 224, 224).
    """
    # Convert to RGB if needed (e.g. RGBA or Greyscale)
    if image.mode != "RGB":
        image = image.convert("RGB")
        
    # Resize keeping aspect ratio, smallest side to 256
    w, h = image.size
    new_h, new_w = (256, int(256 * w / h)) if h < w else (int(256 * h / w), 256)
    image = image.resize((new_w, new_h), Image.Resampling.BILINEAR)
    
    # Center crop to 224x224
    left = (new_w - 224) / 2
    top = (new_h - 224) / 2
    right = (new_w + 224) / 2
    bottom = (new_h + 224) / 2
    image = image.crop((left, top, right, bottom))
    
    # Normalize: (img / 255 - mean) / std
    img_data = np.array(image).astype('float32') / 255.0
    mean = np.array([0.485, 0.456, 0.406]).astype('float32')
    std = np.array([0.229, 0.224, 0.225]).astype('float32')
    img_data = (img_data - mean) / std
    
    # Transpose to (C, H, W) and add batch dimension (N, C, H, W)
    img_data = np.transpose(img_data, [2, 0, 1])
    img_data = np.expand_dims(img_data, axis=0)
    
    return img_data


def extract_features(image_file) -> list[float]:
    """
    Extract a 1000-d feature vector from an image file object using MobileNetV2.
    (Note: MobileNetV2-7 outputs 1000-d class logits which serve well as general features).
    """
    try:
        initialize_model()
        image = Image.open(image_file)
        
        # Preprocess
        input_tensor = preprocess_image(image)
        
        # Run inference
        global _session
        input_name = _session.get_inputs()[0].name
        output_name = _session.get_outputs()[0].name
        
        logits = _session.run([output_name], {input_name: input_tensor})[0]
        
        # Flatten and normalize the vector (L2 norm) for cosine similarity
        embedding = logits.flatten()
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
            
        return embedding.tolist()
        
    except Exception as e:
        logger.error(f"Error extracting features: {e}")
        raise ValueError(f"Failed to process image: {str(e)}")


def compute_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """
    Compute cosine similarity between two L2-normalized vectors.
    Returns value between -1.0 and 1.0 (1.0 = identical).
    """
    a = np.array(vec_a)
    b = np.array(vec_b)
    
    # Since they should already be L2 normalized, dot product is cosine similarity
    similarity = np.dot(a, b)
    
    # Clamp to valid range to handle minor float inaccuracies
    return float(np.clip(similarity, -1.0, 1.0))

