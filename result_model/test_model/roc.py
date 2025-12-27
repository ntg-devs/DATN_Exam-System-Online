import os
import pickle
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc
from sklearn.metrics.pairwise import cosine_similarity


# ===============================
# 1. Load DB
# ===============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "services", "face_recognition", "database2.pkl")

print(f">>> Looking for DB file at: {DB_PATH}")

def load_db():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"❌ Không tìm thấy database tại: {DB_PATH}")

    with open(DB_PATH, "rb") as f:
        db = pickle.load(f)

    print(f"✔ Loaded database from: {DB_PATH}")
    print(f"✔ Persons in DB: {list(db.keys())}")
    return db


# ===============================
# 2. Build Scores for ROC
# ===============================
def build_scores_for_roc(db):
    scores = []
    labels = []

    persons = list(db.keys())

    for pid in persons:
        emb_list = np.array(db[pid])  # embeddings của 1 người

        # ---- Positive pairs (cùng 1 người)
        for i in range(len(emb_list)):
            for j in range(i + 1, len(emb_list)):
                s = cosine_similarity([emb_list[i]], [emb_list[j]])[0][0]
                scores.append(s)
                labels.append(1)  # same person

        # ---- Negative pairs (khác người)
        for other_pid in persons:
            if other_pid == pid:
                continue

            other_embs = np.array(db[other_pid])

            # ghép từng embedding với người khác
            for e1 in emb_list:
                for e2 in other_embs:
                    s = cosine_similarity([e1], [e2])[0][0]
                    scores.append(s)
                    labels.append(0)  # different persons

    return np.array(scores), np.array(labels)


# ===============================
# 3. Plot ROC Curve
# ===============================
def plot_roc_cosine(db):
    scores, labels = build_scores_for_roc(db)

    fpr, tpr, thresholds = roc_curve(labels, scores)
    roc_auc = auc(fpr, tpr)

    # tạo thư mục roc nếu chưa có
    save_dir = os.path.join(BASE_DIR, "roc")
    os.makedirs(save_dir, exist_ok=True)

    save_path = os.path.join(save_dir, "roc_cosine.png")

    # ====== Plot ======
    plt.figure(figsize=(7, 7))
    plt.plot(fpr, tpr, lw=2, label=f"AUC = {roc_auc:.4f}")
    plt.plot([0, 1], [0, 1], "--", color="gray")
    plt.xlabel("False Positive Rate (FPR)")
    plt.ylabel("True Positive Rate (TPR)")
    plt.title("ROC Curve (Cosine Similarity)")
    plt.legend(loc="lower right")
    plt.grid(True)
    plt.savefig(save_path, dpi=300)

    print(f"✔ ROC saved to: {save_path}")


# ===============================
# 4. Run
# ===============================
if __name__ == "__main__":
    db = load_db()
    plot_roc_cosine(db)
