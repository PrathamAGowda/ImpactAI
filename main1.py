import cv2
import os
import time
import threading
from flask import Flask, jsonify, send_from_directory
from deepface import DeepFace
import firebase_admin
from firebase_admin import credentials, db

app = Flask(__name__)

# Paths
KNOWN_FACES_PATH = r"C:\code\BMSCE Impact AI 2\Flask Face\Known_Faces"
CAPTURED_FACES_DIR = "static/faces"

# Ensure the folder exists
os.makedirs(CAPTURED_FACES_DIR, exist_ok=True)

# Store recognized face info
captured_faces = []

# 🔐 Firebase Setup
cred = credentials.Certificate("creds.json")  # Replace this path
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://esp32-80472-default-rtdb.asia-southeast1.firebasedatabase.app'  # Replace this URL
})

def get_sos_mode():
    """Check the BMSAI/sosMode flag from Firebase."""
    ref = db.reference('BMSAI/sosMode')
    return ref.get()

def face_recognition():
    cap = cv2.VideoCapture(0)
    print("🔍 Starting face recognition...")
    while True:
        sos_mode = get_sos_mode()
        if not sos_mode:
            print("⏸️ sosMode is false. Skipping...")
            time.sleep(2)
            continue

        ret, frame = cap.read()
        if not ret:
            print("🚫 Failed to grab frame")
            break

        try:
            result = DeepFace.find(img_path=frame, db_path=KNOWN_FACES_PATH, enforce_detection=False)

            if result and isinstance(result, list) and len(result[0]) > 0:
                matched_img_path = result[0].iloc[0]["identity"]
                name = os.path.splitext(os.path.basename(matched_img_path))[0].replace("_", " ")
                cv2.putText(frame, f"Matched: {name}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            else:
                name = "Unknown"
                cv2.putText(frame, "No match", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        except Exception as e:
            print("⚠️ Error:", e)
            name = "Error"
            cv2.putText(frame, "Error in detection", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        timestamp = int(time.time() * 1000)
        filename = f"face_{timestamp}.jpg"
        save_path = os.path.join(CAPTURED_FACES_DIR, filename)
        cv2.imwrite(save_path, frame)

        captured_faces.append({"filename": filename, "name": name})
        time.sleep(2)

    cap.release()

# Start recognition thread
threading.Thread(target=face_recognition, daemon=True).start()

@app.route("/faces", methods=["GET"])
def get_faces():
    return jsonify(captured_faces)

@app.route("/faces/<filename>", methods=["GET"])
def get_face_image(filename):
    return send_from_directory(CAPTURED_FACES_DIR, filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
