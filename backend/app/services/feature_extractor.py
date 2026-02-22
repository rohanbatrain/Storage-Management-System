"""
Visual Lens — Pluggable Feature Extraction Service

Supports any ONNX classification / embedding model.
Default: MobileNetV2 (auto-downloaded on first run).

Configuration:
    VISUAL_LENS_MODEL      — filename inside data/models/ (default: mobilenetv2-12.onnx)
    VISUAL_LENS_MODEL_URL  — download URL for the default model (auto-fetched if missing)
"""
import os
import sys
import numpy as np
from PIL import Image
from pathlib import Path
import urllib.request
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (overridable via environment)
# ---------------------------------------------------------------------------
DEFAULT_MODEL_URL = (
    "https://github.com/onnx/models/raw/refs/heads/main/"
    "validated/vision/classification/mobilenet/model/mobilenetv2-12.onnx"
)
DEFAULT_MODEL_FILENAME = "mobilenetv2-12.onnx"

MODEL_FILENAME = os.environ.get("VISUAL_LENS_MODEL", DEFAULT_MODEL_FILENAME)
MODEL_URL = os.environ.get("VISUAL_LENS_MODEL_URL", DEFAULT_MODEL_URL)

# ---------------------------------------------------------------------------
# Curated model catalog — users can one-click download these
# ---------------------------------------------------------------------------
MODEL_CATALOG = [
    {
        "name": "MobileNet V2 (Default)",
        "filename": "mobilenetv2-12.onnx",
        "url": "https://github.com/onnx/models/raw/refs/heads/main/validated/vision/classification/mobilenet/model/mobilenetv2-12.onnx",
        "size_mb": 14,
        "description": "Lightweight general-purpose classifier. 1000-d output. Good balance of speed and accuracy.",
        "opset": 12,
    },
    {
        "name": "MobileNet V2 (Quantized INT8)",
        "filename": "mobilenetv2-12-int8.onnx",
        "url": "https://github.com/onnx/models/raw/refs/heads/main/validated/vision/classification/mobilenet/model/mobilenetv2-12-int8.onnx",
        "size_mb": 4,
        "description": "Quantized version — 3.5× smaller, faster inference, slightly lower accuracy.",
        "opset": 12,
    },
    {
        "name": "SqueezeNet 1.0",
        "filename": "squeezenet1.0-12.onnx",
        "url": "https://github.com/onnx/models/raw/refs/heads/main/validated/vision/classification/squeezenet/model/squeezenet1.0-12.onnx",
        "size_mb": 5,
        "description": "Ultra-lightweight classifier. 1000-d output. Fastest option for constrained hardware.",
        "opset": 12,
    },
    {
        "name": "ResNet-50 V2",
        "filename": "resnet50-v2-7.onnx",
        "url": "https://github.com/onnx/models/raw/refs/heads/main/validated/vision/classification/resnet/model/resnet50-v2-7.onnx",
        "size_mb": 98,
        "description": "Deeper network with higher accuracy. 1000-d output. Recommended for best matching quality.",
        "opset": 7,
    },
    {
        "name": "EfficientNet-Lite4",
        "filename": "efficientnet-lite4-11.onnx",
        "url": "https://github.com/onnx/models/raw/refs/heads/main/validated/vision/classification/efficientnet-lite4/model/efficientnet-lite4-11.onnx",
        "size_mb": 49,
        "description": "Google's efficient architecture. 1000-d output. Great accuracy-to-size ratio.",
        "opset": 11,
    },
]

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------
_session = None
_input_name: str = ""
_input_shape: tuple = ()
_output_name: str = ""
_active_model: str = MODEL_FILENAME


def get_models_dir() -> Path:
    """Return (and create) the directory where ONNX models are stored."""
    data_dir = os.environ.get("DATA_DIR", "data")
    if getattr(sys, "frozen", False):
        models_dir = Path(data_dir) / "models"
    else:
        models_dir = Path("backend/data/models")
        if not models_dir.parent.exists():
            models_dir = Path("data/models")
    models_dir.mkdir(parents=True, exist_ok=True)
    return models_dir


def get_model_path() -> Path:
    """Full path to the currently configured model file."""
    return get_models_dir() / _active_model


def list_available_models() -> list[dict]:
    """List all .onnx files in the models directory with basic metadata."""
    models_dir = get_models_dir()
    results = []
    for f in sorted(models_dir.glob("*.onnx")):
        size_mb = round(f.stat().st_size / (1024 * 1024), 1)
        results.append({
            "filename": f.name,
            "size_mb": size_mb,
            "active": f.name == _active_model,
        })
    return results


def get_catalog() -> list[dict]:
    """Return the curated catalog with download status for each model."""
    models_dir = get_models_dir()
    catalog = []
    for entry in MODEL_CATALOG:
        installed = (models_dir / entry["filename"]).exists()
        catalog.append({
            **entry,
            "installed": installed,
            "active": entry["filename"] == _active_model,
        })
    return catalog


def download_model(url: str, filename: str) -> Path:
    """Download a model from a URL into the models directory."""
    models_dir = get_models_dir()
    target = models_dir / filename

    if target.exists():
        logger.info(f"Model {filename} already exists, skipping download.")
        return target

    logger.info(f"Downloading model {filename} from {url} ...")
    try:
        urllib.request.urlretrieve(url, target)
        logger.info(f"Downloaded {filename} ({target.stat().st_size / 1024 / 1024:.1f} MB)")
    except Exception as e:
        # Clean up partial download
        if target.exists():
            target.unlink()
        logger.error(f"Failed to download model: {e}")
        raise RuntimeError(f"Could not download model: {e}")

    return target


def save_uploaded_model(filename: str, data: bytes) -> Path:
    """Save uploaded model bytes to the models directory."""
    models_dir = get_models_dir()
    target = models_dir / filename
    target.write_bytes(data)
    logger.info(f"Saved uploaded model {filename} ({len(data) / 1024 / 1024:.1f} MB)")
    return target


def delete_model(filename: str) -> None:
    """Delete a model file (cannot delete the active model)."""
    if filename == _active_model:
        raise ValueError("Cannot delete the currently active model.")
    path = get_models_dir() / filename
    if path.exists():
        path.unlink()
        logger.info(f"Deleted model {filename}")
    else:
        raise FileNotFoundError(f"Model {filename} not found.")


def activate_model(filename: str) -> None:
    """Switch the active model. Reloads the ONNX session."""
    global _active_model, _session
    path = get_models_dir() / filename
    if not path.exists():
        raise FileNotFoundError(f"Model {filename} not found in {get_models_dir()}")

    _active_model = filename
    _session = None  # force reload on next inference
    logger.info(f"Active model switched to {filename}")


def initialize_model() -> None:
    """Download (if needed) and load the ONNX model, introspecting I/O shapes."""
    global _session, _input_name, _input_shape, _output_name
    if _session is not None:
        return

    import onnxruntime as ort

    model_path = get_model_path()

    # Auto-download the default model if it doesn't exist
    if not model_path.exists():
        if _active_model == DEFAULT_MODEL_FILENAME:
            download_model(MODEL_URL, DEFAULT_MODEL_FILENAME)
        else:
            raise RuntimeError(
                f"Model file '{_active_model}' not found in {get_models_dir()}. "
                f"Please place a valid ONNX model there or activate a different model."
            )

    try:
        _session = ort.InferenceSession(
            str(model_path),
            providers=["CPUExecutionProvider"],
        )

        # Introspect input / output
        inp = _session.get_inputs()[0]
        _input_name = inp.name
        _input_shape = tuple(inp.shape)
        _output_name = _session.get_outputs()[0].name

        logger.info(
            f"ONNX model loaded: {_active_model}  "
            f"input={_input_name}{_input_shape}  output={_output_name}"
        )
    except Exception as e:
        logger.error(f"Failed to initialize ONNX session: {e}")
        raise RuntimeError(f"Could not load Visual Lens model: {e}")


def _infer_input_size() -> tuple[int, int]:
    """Return (H, W) expected by the loaded model."""
    if len(_input_shape) == 4:
        h = _input_shape[2] if isinstance(_input_shape[2], int) else 224
        w = _input_shape[3] if isinstance(_input_shape[3], int) else 224
        return (h, w)
    return (224, 224)


def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Preprocess a PIL Image for the loaded ONNX model.
    Resizes, center-crops, normalises, and returns a (1, C, H, W) tensor.
    """
    h, w = _infer_input_size()

    if image.mode != "RGB":
        image = image.convert("RGB")

    # Resize smallest side to max(h, w) + 32, then center-crop
    target = max(h, w) + 32
    img_w, img_h = image.size
    ratio = target / min(img_w, img_h)
    new_w, new_h = int(img_w * ratio), int(img_h * ratio)
    image = image.resize((new_w, new_h), Image.Resampling.BILINEAR)

    left = (new_w - w) / 2
    top = (new_h - h) / 2
    image = image.crop((left, top, left + w, top + h))

    # Normalise with ImageNet stats
    img_data = np.array(image).astype("float32") / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype="float32")
    std = np.array([0.229, 0.224, 0.225], dtype="float32")
    img_data = (img_data - mean) / std

    # (H, W, C) → (C, H, W) → (1, C, H, W)
    img_data = np.transpose(img_data, [2, 0, 1])
    img_data = np.expand_dims(img_data, axis=0)
    return img_data


def extract_features(image_file) -> list[float]:
    """
    Run the loaded ONNX model on *image_file* and return an L2-normalised
    feature vector.  Works with any model that takes a (1,3,H,W) input.
    """
    try:
        initialize_model()
        image = Image.open(image_file)
        input_tensor = preprocess_image(image)

        global _session
        logits = _session.run([_output_name], {_input_name: input_tensor})[0]

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
    Cosine similarity between two L2-normalised vectors.
    Returns a value in [-1.0, 1.0]  (1.0 = identical).
    """
    a = np.array(vec_a)
    b = np.array(vec_b)
    similarity = np.dot(a, b)
    return float(np.clip(similarity, -1.0, 1.0))
