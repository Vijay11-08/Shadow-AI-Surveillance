from flask import Flask, render_template, Response, jsonify, request, send_file
import cv2
from ultralytics import YOLO
import webbrowser
import threading
import time
import csv
from datetime import datetime
import queue

app = Flask(__name__)

# --- AI CONFIG ---
print("[INFO] Preparing AI...")
MODEL_NAME = 'yolov8s-worldv2.pt'
model = YOLO(MODEL_NAME)
classes = ["person", "glasses", "cell phone", "laptop", "keyboard", "mouse", "chair", "pen", "book", "backpack", "bottle"]
model.set_classes(classes)

# Shared State
latest_frame = None
latest_results = []
current_detections = []
detection_history = []
lock = threading.Lock()

# 1. CAMERA CAPTURE (Background)
def capture_thread():
    global latest_frame
    print("[INFO] Opening Camera...")
    # Cross-platform camera initialization
    import sys
    backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
    cap = cv2.VideoCapture(0, backend) 
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    while True:
        success, frame = cap.read()
        if success:
            with lock:
                latest_frame = cv2.flip(frame, 1)
        else:
            print("[WARN] Camera frame capture failed. Retrying...")
            cap.release()
            time.sleep(2)
            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        time.sleep(0.01)

# 2. INFERENCE (Background)
def inference_thread():
    global latest_results, current_detections, detection_history
    while True:
        if latest_frame is not None:
            with lock:
                frame_to_process = latest_frame.copy()
            
            # Predict with higher resolution and optimized confidence for smaller objects
            results = model.predict(frame_to_process, conf=0.20, imgsz=640, verbose=False)
            
            new_boxes = []
            new_names = []
            for r in results:
                for box in r.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    name = model.names[int(box.cls[0])]
                    new_boxes.append({'box': (x1,y1,x2,y2), 'name': name, 'conf': conf})
                    new_names.append(name)
            
            with lock:
                latest_results = new_boxes
                current_detections = list(set(new_names))
                # Add to history
                for d in current_detections:
                    detection_history.append({"timestamp": datetime.now().strftime("%H:%M:%S"), "object": d})
                    if len(detection_history) > 500: detection_history.pop(0)
        
        time.sleep(0.05) # Allow camera thread priority

# 3. STREAMER (Flask Generator)
def generate_frames():
    while True:
        with lock:
            if latest_frame is None:
                continue
            display_frame = latest_frame.copy()
            active_results = latest_results.copy()

        # Overlays
        for res in active_results:
            (x1, y1, x2, y2) = res['box']
            color = (255, 120, 0) if res['name'] == "person" else (0, 200, 255)
            cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(display_frame, f"{res['name'].upper()}", (x1, y1-10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        ret, buffer = cv2.imencode('.jpg', display_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        time.sleep(0.03) # Cap stream at ~30 FPS to reduce bandwidth

# --- ROUTES ---
@app.route('/')
def index(): return render_template('index.html')

@app.route('/about')
def about(): return render_template('about.html')

@app.route('/video_feed')
def video_feed(): return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/detections')
def get_detections(): return jsonify({"active": current_detections, "all_classes": classes})

@app.route('/add_class', methods=['POST'])
def add_class():
    global classes
    data = request.json
    new_obj = data.get('object', '').lower().strip()
    if new_obj and new_obj not in classes:
        classes.append(new_obj)
        model.set_classes(classes)
        return jsonify({"success": True, "classes": classes})
    return jsonify({"success": False, "error": "Invalid or duplicate object"})

@app.route('/remove_class', methods=['POST'])
def remove_class():
    global classes
    data = request.json
    obj_to_remove = data.get('object', '').lower().strip()
    if obj_to_remove in classes:
        classes.remove(obj_to_remove)
        model.set_classes(classes)
        return jsonify({"success": True, "classes": classes})
    return jsonify({"success": False, "error": "Object not found"})

@app.route('/download_logs')
def download_logs():
    filename = "logs.csv"
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "object"])
        writer.writeheader(); writer.writerows(detection_history)
    return send_file(filename, as_attachment=True)

if __name__ == "__main__":
    t1 = threading.Thread(target=capture_thread, daemon=True)
    t2 = threading.Thread(target=inference_thread, daemon=True)
    t1.start()
    t2.start()
    
    # Wait for camera to initialize before opening browser
    print("[INFO] Waiting for camera handshake...")
    while latest_frame is None: time.sleep(0.5)
    
    webbrowser.open('http://127.0.0.1:5000')
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)
