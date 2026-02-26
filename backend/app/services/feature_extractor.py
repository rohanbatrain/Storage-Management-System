"""
Visual Lens — Pluggable Feature Extraction Service

Uses CLIP via sentence-transformers to support multimodal embeddings (Text & Images).
Default: clip-ViT-B-32 (auto-downloaded on first run).
"""
import os
import sys
import numpy as np
from PIL import Image
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DEFAULT_MODEL_NAME = "clip-ViT-B-32"
MODEL_NAME = os.environ.get("VISUAL_LENS_MODEL", DEFAULT_MODEL_NAME)

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------
_model = None


def get_models_dir() -> Path:
    """Return (and create) the directory where HuggingFace models are cached."""
    data_dir = os.environ.get("DATA_DIR", "data")
    if getattr(sys, "frozen", False):
        models_dir = Path(data_dir) / "models" / "hf_cache"
    else:
        models_dir = Path("backend/data/models/hf_cache")
        if not models_dir.parent.parent.exists():
            models_dir = Path("data/models/hf_cache")
    models_dir.mkdir(parents=True, exist_ok=True)
    return models_dir


def initialize_model() -> None:
    """Download (if needed) and load the CLIP model."""
    global _model
    if _model is not None:
        return

    try:
        from sentence_transformers import SentenceTransformer
        
        # Point HuggingFace cache to our local data dir
        os.environ["HF_HOME"] = str(get_models_dir())
        
        logger.info(f"Loading CLIP model '{MODEL_NAME}'... (This may take a moment to download on first run)")
        _model = SentenceTransformer(MODEL_NAME)
        logger.info(f"CLIP model loaded: {MODEL_NAME}")
    except Exception as e:
        logger.error(f"Failed to initialize CLIP model: {e}")
        raise RuntimeError(f"Could not load Visual Lens model: {e}")


def extract_features(image_file) -> list[float]:
    """
    Run the loaded CLIP model on an image and return an L2-normalised 512-d text-aligned vector.
    """
    try:
        initialize_model()
        image = Image.open(image_file)
        if image.mode != "RGB":
            image = image.convert("RGB")
            
        try:
            import rembg
            # rembg expects a PIL image and returns a PIL image with alpha channel
            nobg_image = rembg.remove(image)
            # sentence-transformers works better with RGB (it removes the alpha channel anyway, but it's cleaner)
            if nobg_image.mode != "RGB":
                # Create a white background instead of black for transparent pixels 
                # (helps CLIP not focus on the black void)
                background = Image.new("RGB", nobg_image.size, (255, 255, 255))
                if nobg_image.mode == "RGBA":
                    background.paste(nobg_image, mask=nobg_image.split()[3]) # 3 is the alpha channel
                    image_for_clip = background
                else:
                    image_for_clip = nobg_image.convert("RGB")
            else:
                image_for_clip = nobg_image
        except ImportError:
            logger.warning("rembg not installed, skipping background removal")
            image_for_clip = image
        except Exception as e:
            logger.warning(f"Background removal failed: {e}. Falling back to original image.")
            image_for_clip = image
            
        global _model
        # SentenceTransformer handles preprocessing automatically
        embedding = _model.encode(image_for_clip)
        
        # Ensure L2 normalization
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding.tolist()

    except Exception as e:
        logger.error(f"Error extracting image features: {e}")
        raise ValueError(f"Failed to process image: {str(e)}")


def extract_text_features(text: str) -> list[float]:
    """
    Run the loaded CLIP model on text and return an L2-normalised 512-d image-aligned vector.
    """
    try:
        initialize_model()
            
        global _model
        embedding = _model.encode(text)
        
        # Ensure L2 normalization
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding.tolist()

    except Exception as e:
        logger.error(f"Error extracting text features: {e}")
        raise ValueError(f"Failed to process text: {str(e)}")


def compute_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """
    Cosine similarity between two L2-normalised vectors.
    Returns a value in [-1.0, 1.0].
    """
    a = np.array(vec_a)
    b = np.array(vec_b)
    similarity = np.dot(a, b)
    return float(np.clip(similarity, -1.0, 1.0))

