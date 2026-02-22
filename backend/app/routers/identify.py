from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from uuid import UUID
import io
import math

from app.database import get_db
from app.models.item import Item
from app.models.item_embedding import ItemEmbedding
from app.services.feature_extractor import extract_features, compute_similarity, initialize_model
from app.routers.items import item_to_response

router = APIRouter(prefix="/identify", tags=["Identify"])

# Threshold for considering something a match (cosine similarity)
# MobileNetV2 logits max out at 1.0 when normalized, typical good matches are > 0.6
MATCH_THRESHOLD = 0.60


@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    """Check if the Visual Lens model is ready and how many items are enrolled."""
    try:
        # Background init if not already loaded
        initialize_model()
        model_ready = True
    except Exception as e:
        model_ready = False
        
    enrolled_count = db.query(func.count(func.distinct(ItemEmbedding.item_id))).scalar()
    total_embeddings = db.query(func.count(ItemEmbedding.id)).scalar()
    
    return {
        "model_ready": model_ready,
        "enrolled_items": enrolled_count,
        "total_reference_images": total_embeddings
    }


@router.post("")
async def identify_item(
    file: UploadFile = File(...),
    limit: int = Form(5),
    db: Session = Depends(get_db)
):
    """
    Identify an item from an uploaded photo.
    Returns the top matches with confidence scores.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image type")
        
    # Read image
    contents = await file.read()
    image_stream = io.BytesIO(contents)
    
    try:
        # Extract features from target image
        query_vector = extract_features(image_stream)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")
        
    # Get all enrolled embeddings
    all_embeddings = db.query(ItemEmbedding).all()
    if not all_embeddings:
        return {"matches": [], "message": "No items are enrolled for Visual Lens yet."}
        
    # Compute similarities
    results = []
    
    for emb in all_embeddings:
        similarity = compute_similarity(query_vector, emb.embedding)
        
        # Only keep reasonable matches
        if similarity >= MATCH_THRESHOLD:
            # Convert cosine similarity (-1 to 1) to a raw percentage scale (0 to 100)
            # A similarity of 1.0 = 100%, MATCH_THRESHOLD = 0%
            range_span = 1.0 - MATCH_THRESHOLD
            adjusted_sim = (similarity - MATCH_THRESHOLD) / range_span
            confidence = round(math.pow(adjusted_sim, 0.5) * 100, 1) # Square root curve pushes perceived confidence up
            
            results.append({
                "item_id": emb.item_id,
                "similarity": similarity,
                "confidence": min(confidence, 99.9), # Cap at 99.9%
                "reference_image": emb.image_url
            })
            
    # Sort by similarity descending
    results.sort(key=lambda x: x["similarity"], reverse=True)
    
    # Deduplicate by item_id (keep highest similarity per item)
    seen_items = set()
    deduped_results = []
    for r in results:
        if r["item_id"] not in seen_items:
            seen_items.add(r["item_id"])
            deduped_results.append(r)
            if len(deduped_results) >= limit:
                break
                
    # Fetch full item details for matches
    final_matches = []
    for match in deduped_results:
        item = db.query(Item).filter(Item.id == match["item_id"]).first()
        if item:
            item_data = item_to_response(item).model_dump()
            final_matches.append({
                "confidence": match["confidence"],
                "similarity": match["similarity"],
                "reference_image": match["reference_image"],
                "item": item_data
            })
            
    return {"matches": final_matches}


@router.post("/enroll/{item_id}")
async def enroll_item(
    item_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Enroll an item for Visual recognition by uploading a reference image.
    Automatically uploads the image, extracts features, and stores the embedding.
    """
    # Verify item exists
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image type")
    
    # Process the file via the standard upload router
    from app.routers.upload import upload_file
    upload_result = await upload_file(file=file)
    image_url = upload_result["url"]
    
    # We need to read the file again for feature extraction, but upload_file consumed it.
    # We can read it from disk since upload_file just saved it
    import os
    from pathlib import Path
    from app.config import get_settings
    
    settings = get_settings()
    filename = image_url.split("/")[-1]
    
    if settings.is_frozen:
        filepath = Path(settings.data_dir) / "uploads" / filename
    else:
        filepath = Path("backend/static/uploads") / filename
        if not filepath.exists():
            filepath = Path("data/uploads") / filename
            
    try:
        with open(filepath, "rb") as f:
            embedding_vector = extract_features(f)
            
        # Store embedding in database
        embedding = ItemEmbedding(
            item_id=item_id,
            image_url=image_url,
            embedding=embedding_vector
        )
        db.add(embedding)
        db.commit()
        db.refresh(embedding)
        
        # Update the item's primary image if it doesn't have one
        if not item.image_url:
            item.image_url = image_url
            db.commit()
            
        return {
            "message": "Item enrolled successfully",
            "enrollment_id": embedding.id,
            "image_url": image_url
        }
    except Exception as e:
        # Clean up the file if extraction failed
        if filepath.exists():
            filepath.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to enroll item: {str(e)}")


@router.delete("/enroll/{item_id}")
async def unenroll_item(item_id: UUID, db: Session = Depends(get_db)):
    """
    Remove all visual enrollments for an item.
    """
    embeddings = db.query(ItemEmbedding).filter(ItemEmbedding.item_id == item_id).all()
    if not embeddings:
        raise HTTPException(status_code=404, detail="No enrollments found for this item")
        
    count = len(embeddings)
    from app.routers.upload import cleanup_image
    
    for emb in embeddings:
        # Also delete the referenced image files
        cleanup_image(emb.image_url)
        db.delete(emb)
        
    db.commit()
    
    return {"message": f"Removed {count} enrollments for item"}
