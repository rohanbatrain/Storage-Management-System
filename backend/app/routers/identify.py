from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from uuid import UUID
import io
import math

from app.database import get_db
from app.models.item import Item
from app.models.item_embedding import ItemEmbedding
from app.services.feature_extractor import (
    extract_features, extract_text_features, compute_similarity, initialize_model,
)
from app.routers.items import item_to_response

router = APIRouter(prefix="/identify", tags=["Identify"])

# Threshold for considering something a match (cosine similarity)
MATCH_THRESHOLD = 0.25  # CLIP cosine similarities tend to be lower than MobileNet, adjusting threshold


# ---------------------------------------------------------------------------
# Visual Lens & Semantic Search Endpoints
# ---------------------------------------------------------------------------

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
    text_query: Optional[str] = Query(None, description="Search by text description (Semantic Search)"),
    file: Optional[UploadFile] = File(None, description="Search by uploaded image"),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Identify an item from an uploaded photo OR a semantic text query.
    Returns the top matches with confidence scores.
    """
    if not text_query and not file:
        raise HTTPException(status_code=400, detail="Must provide either text_query or an image file")
        
    try:
        if file:
            if not file.content_type or not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="File must be an image type")
            
            contents = await file.read()
            image_stream = io.BytesIO(contents)
            query_vector = extract_features(image_stream)
        else:
            query_vector = extract_text_features(text_query)
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process query: {str(e)}")
        
    # Get all enrolled embeddings
    all_embeddings = db.query(ItemEmbedding).all()
    if not all_embeddings:
        return {"matches": [], "message": "No items are enrolled for Visual Lens yet."}
        
    # Compute similarities
    results = []
    
    # Convert query to numpy array
    import numpy as np
    query_np = np.array(query_vector, dtype=np.float32)
    
    # Pre-allocate matrix for all embeddings
    num_embeddings = len(all_embeddings)
    embedding_dim = len(query_vector)
    
    # Fill matrix and keep track of items
    embedding_matrix = np.zeros((num_embeddings, embedding_dim), dtype=np.float32)
    item_map = []
    
    for i, emb in enumerate(all_embeddings):
        embedding_matrix[i] = emb.embedding
        item_map.append({
            "item_id": emb.item_id,
            "image_url": emb.image_url
        })
        
    # Compute cosine similarity for all at once
    # Since vectors are already L2 normalized (done in extract_features),
    # dot product is equivalent to cosine similarity.
    similarities = np.dot(embedding_matrix, query_np)
    
    results = []
    for i, similarity in enumerate(similarities):
        sim_val = float(similarity)
        
        # Only keep reasonable matches
        if sim_val >= MATCH_THRESHOLD:
            # Convert cosine similarity (-1 to 1) to a raw percentage scale (0 to 100)
            range_span = 1.0 - MATCH_THRESHOLD
            adjusted_sim = (sim_val - MATCH_THRESHOLD) / range_span
            confidence = round(math.pow(adjusted_sim, 0.5) * 100, 1) # Square root curve pushes perceived confidence up
            
            results.append({
                "item_id": item_map[i]["item_id"],
                "similarity": sim_val,
                "confidence": min(confidence, 99.9), # Cap at 99.9%
                "reference_image": item_map[i]["image_url"]
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

    # Buffer the image bytes so we can use them for both upload and feature extraction
    raw_bytes = await file.read()

    # Extract features from the buffered image
    try:
        embedding_vector = extract_features(io.BytesIO(raw_bytes))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract features: {str(e)}")

    # Upload the file via the standard upload router (needs a fresh UploadFile)
    from app.routers.upload import upload_file
    fresh_file = UploadFile(
        filename=file.filename or "reference.jpg",
        file=io.BytesIO(raw_bytes),
        headers=file.headers,
    )
    upload_result = await upload_file(file=fresh_file)
    image_url = upload_result["url"]

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
