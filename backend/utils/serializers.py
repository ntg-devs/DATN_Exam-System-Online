"""
Serialization utilities for MongoDB documents
"""
from bson import ObjectId
from datetime import datetime


def serialize_doc(doc):
    """Chuyển ObjectId thành string để tránh lỗi JSON serialization."""
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    if "start_time" in doc and doc["start_time"]:
        if hasattr(doc["start_time"], "isoformat"):
            doc["start_time"] = doc["start_time"].isoformat()
    if "created_at" in doc and doc["created_at"]:
        if hasattr(doc["created_at"], "isoformat"):
            doc["created_at"] = doc["created_at"].isoformat()
    return doc


def serialize_class(doc):
    """Chuyển ObjectId -> str và thời gian -> ISO."""
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    # created_at có thể là datetime hoặc str → xử lý an toàn
    if "created_at" in doc:
        if hasattr(doc["created_at"], "isoformat"):
            doc["created_at"] = doc["created_at"].isoformat()
        else:
            # nếu đã là string thì giữ nguyên
            doc["created_at"] = str(doc["created_at"])
    return doc


def serialize_doc2(doc):
    """Recursive serialization for nested documents"""
    if not doc:
        return None
    doc = dict(doc)  # Convert từ BSON sang dict
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
        elif isinstance(v, dict):
            doc[k] = serialize_doc2(v)
        elif isinstance(v, list):
            doc[k] = [serialize_doc2(item) if isinstance(item, dict) else item for item in v]
    return doc

