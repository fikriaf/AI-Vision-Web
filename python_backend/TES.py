import cv2
from ultralytics import YOLO

# === Load model YOLOv8 ===
model = YOLO("models/best.pt")  # ganti dengan path model kamu

# === Buka kamera (default 0) ===
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Tidak bisa membuka kamera")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("Gagal ambil frame")
        break

    # === Deteksi objek ===
    results = model(frame)[0]

    # === Gambar kotak dan label hasil deteksi ===
    for box in results.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        label = model.names[cls_id]
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f"{label} {conf:.2f}", (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    # === Tampilkan frame hasil ===
    cv2.imshow("YOLOv8 Detection", frame)

    # Tekan ESC (27) untuk keluar
    if cv2.waitKey(1) == 27:
        break

# === Bersihkan ===
cap.release()
cv2.destroyAllWindows()
