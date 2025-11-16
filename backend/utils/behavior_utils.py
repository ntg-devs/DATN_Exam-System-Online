import cv2
import numpy as np

def detect_behavior(video_path, model):
    cap = cv2.VideoCapture(video_path)
    suspicious_actions = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_resized = cv2.resize(frame, (224, 224)) / 255.0
        frame_resized = np.expand_dims(frame_resized, axis=0)

        pred = model.predict(frame_resized)
        label = np.argmax(pred)

        if label in [1, 2, 3, 4]:  # ví dụ: 1-liếc mắt, 2-nhìn điện thoại...
            suspicious_actions.append(int(label))

    cap.release()
    return suspicious_actions
