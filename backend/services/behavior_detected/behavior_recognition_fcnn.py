import torch
from torchvision import transforms
from torchvision.models.detection.faster_rcnn import fasterrcnn_resnet50_fpn, FastRCNNPredictor
from torchvision.models.detection.faster_rcnn import FasterRCNN_ResNet50_FPN_Weights
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2

# Danh sách nhãn
CLASS_NAMES = [
    'eye_movement', 'hand_move', 'mobile_use',
    'side_watching', 'mouth_open', 'normal'
]

NUM_CLASSES = len(CLASS_NAMES) + 1  # +1 cho background

class BehaviorDetectionService:
    def __init__(self, model_path: str):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self._load_model(model_path)
        self.model.eval()
        self.transform = transforms.Compose([
            transforms.ToTensor()
        ])

    def _load_model(self, model_path):
        weights = FasterRCNN_ResNet50_FPN_Weights.DEFAULT
        model = fasterrcnn_resnet50_fpn(weights=weights)
        in_features = model.roi_heads.box_predictor.cls_score.in_features
        model.roi_heads.box_predictor = FastRCNNPredictor(in_features, NUM_CLASSES)

        checkpoint = torch.load(model_path, map_location=self.device)
        model.load_state_dict(checkpoint)
        model.to(self.device)
        print(f"✅ Loaded FasterRCNN model from {model_path}")
        return model

    def predict(self, frame: np.ndarray, score_thresh=0.5):
        """Nhận diện đối tượng trên 1 frame (OpenCV BGR)."""
        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img_tensor = self.transform(img).unsqueeze(0).to(self.device)

        with torch.no_grad():
            preds = self.model(img_tensor)[0]

        boxes = preds["boxes"].cpu().numpy()
        labels = preds["labels"].cpu().numpy()
        scores = preds["scores"].cpu().numpy()

        detections = []
        for box, label, score in zip(boxes, labels, scores):
            if score >= score_thresh:
                lbl_name = CLASS_NAMES[label - 1] if label - 1 < len(CLASS_NAMES) else "unknown"
                detections.append({
                    "label": lbl_name,
                    "score": float(score),
                    "box": [float(x) for x in box]
                })

        return detections

    def draw_detections(self, frame, detections):
        """Vẽ khung nhận diện lên ảnh."""
        draw_frame = frame.copy()
        for det in detections:
            x1, y1, x2, y2 = map(int, det["box"])
            label = det["label"]
            score = det["score"]
            color = (0, 0, 255) if label != "normal" else (0, 255, 0)

            cv2.rectangle(draw_frame, (x1, y1), (x2, y2), color, 2)
            text = f"{label} {score*100:.1f}%"
            cv2.putText(draw_frame, text, (x1, max(20, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        return draw_frame
