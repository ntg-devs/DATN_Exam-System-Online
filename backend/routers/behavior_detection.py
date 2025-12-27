"""
Behavior Detection router
Handles behavior detection in videos
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from services.behavior_detected.behavior_recognition_fcnn import BehaviorDetectionService
from utils.video_utils import cv2_to_base64
from utils.face_utils import (
    get_face_db, mtcnn, _detect_faces_pil, 
    _compute_face_results_from_tensors, _find_best_label_for_emb,
    FACE_CHECK_INTERVAL_MS, MULTI_FACE_VIOLATION_MIN, UNKNOWN_FACE_PERSIST_MS
)
from PIL import Image
import cv2
import os
import json
from pathlib import Path

router = APIRouter()

# Initialize behavior detection service (lazy loading to avoid import errors)
behavior_service = None

def get_behavior_service():
    """Lazy load behavior service"""
    global behavior_service
    if behavior_service is None:
        behavior_service = BehaviorDetectionService("models/fasterrcnn_final.pth")
    return behavior_service


@router.post("/analyze-video")
async def analyze_video(file: UploadFile = File(...)):
    """Phân tích video để phát hiện hành vi gian lận"""
    # Tạo thư mục cần thiết
    os.makedirs("temp_videos", exist_ok=True)
    os.makedirs("results/images", exist_ok=True)
    os.makedirs("results", exist_ok=True)

    # Lưu video tạm
    video_path = f"temp_videos/{file.filename}"
    with open(video_path, "wb") as f:
        f.write(await file.read())

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval_sec = 3
    frame_step = int(frame_interval_sec * fps)

    track = {"last_face_check_ts": 0, "unknown_start_ts": None, "unknown_reported": False}
    violations = []
    frame_index = 0

    face_db = get_face_db()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_index % frame_step == 0:
            ts_ms = int((frame_index / fps) * 1000)
            img_copy = frame.copy()

            # 1) BEHAVIOR DETECTION
            detections = get_behavior_service().predict(frame, score_thresh=0.4)
            abnormal = [d for d in detections if d["label"] != "normal"]

            for d in abnormal:
                if d["score"] > 0.5:
                    # Vẽ bounding box màu đỏ
                    if "box" in d:
                        x1, y1, x2, y2 = map(int, d["box"])
                        cv2.rectangle(img_copy, (x1, y1), (x2, y2), (255, 0, 0), 2)
                        cv2.putText(img_copy, f"{d['label']} {d['score']:.2f}", 
                                    (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,0,0), 1)

                    violations.append({
                        "type": "behavior",
                        "behavior": d["label"],
                        "score": d["score"],
                        "timestamp": ts_ms/1000,
                        "img_base64": cv2_to_base64(img_copy)
                    })

            # 2) FACE DETECTION
            if ts_ms - track["last_face_check_ts"] >= FACE_CHECK_INTERVAL_MS:
                track["last_face_check_ts"] = ts_ms
                pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                try:
                    boxes, probs, faces_tensor = _detect_faces_pil(pil_img)
                except:
                    boxes, probs, faces_tensor = None, None, None

                if boxes is not None and len(boxes) > 0:
                    try:
                        embs = _compute_face_results_from_tensors(faces_tensor)
                    except:
                        embs = []

                    detected_faces = []
                    for idx, box in enumerate(boxes):
                        x1, y1, x2, y2 = map(int, box)
                        emb = embs[idx] if idx < len(embs) else None
                        label, sim = ("unknown", 0.0) if emb is None else _find_best_label_for_emb(
                            emb, face_db, threshold=0.65
                        )
                        detected_faces.append({"box":[x1,y1,x2,y2],"label":label,"similarity":sim})

                        # Vẽ bounding box màu đỏ cho vi phạm
                        cv2.rectangle(img_copy, (x1, y1), (x2, y2), (255, 0, 0), 2)
                        cv2.putText(img_copy, f"{label} {sim:.2f}", (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,0,0), 1)

                    # RULES
                    if len(detected_faces) >= MULTI_FACE_VIOLATION_MIN:
                        violations.append({
                            "type":"face",
                            "reason":"multi_face",
                            "faces":detected_faces,
                            "timestamp":ts_ms/1000,
                            "img_base64": cv2_to_base64(img_copy)
                        })
                    elif len(detected_faces) == 1:
                        f = detected_faces[0]
                        if f["label"]=="unknown":
                            if track["unknown_start_ts"] is None:
                                track["unknown_start_ts"] = ts_ms
                            else:
                                duration = ts_ms - track["unknown_start_ts"]
                                if duration >= UNKNOWN_FACE_PERSIST_MS and not track["unknown_reported"]:
                                    track["unknown_reported"] = True
                                    violations.append({
                                        "type":"face",
                                        "reason":"unknown_face",
                                        "faces":detected_faces,
                                        "timestamp":ts_ms/1000,
                                        "img_base64": cv2_to_base64(img_copy)
                                    })
                        else:
                            track["unknown_start_ts"] = None
                            track["unknown_reported"] = False

        frame_index += 1

    cap.release()

    # SAVE JSON
    json_path = f"results/violates_{file.filename}.json"
    Path(json_path).parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w", encoding="utf8") as f:
        json.dump(violations, f, indent=4, ensure_ascii=False)

    # SAVE TXT
    txt_path = f"results/violates_{file.filename}.txt"
    Path(txt_path).parent.mkdir(parents=True, exist_ok=True)
    with open(txt_path, "w", encoding="utf8") as f:
        for v in violations:
            f.write(json.dumps(v, ensure_ascii=False) + "\n")

    return {
        "status": "done",
        "total_violations": len(violations),
        "json_file": json_path,
        "txt_file": txt_path,
        "violations": violations
    }

