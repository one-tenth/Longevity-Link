# backend/ocr_modules/bp_ocr_yolo.py
from ultralytics import YOLO
import cv2
import numpy as np
from google.cloud import vision
import os
from config import GOOGLE_VISION_CREDENTIALS

vision_client = vision.ImageAnnotatorClient.from_service_account_info(GOOGLE_VISION_CREDENTIALS)
class_names = ['diastolic', 'pulse', 'systolic']

def ocr_google(img):
    success, encoded_img = cv2.imencode('.png', img)
    if not success:
        return ""
    image = vision.Image(content=encoded_img.tobytes())
    response = vision_client.text_detection(image=image)
    texts = response.text_annotations
    if texts:
        return texts[0].description.strip().replace("\n", "")
    return ""

def get_average_border_color(img):
    h, w, _ = img.shape
    border_width = 5
    border_pixels = np.concatenate([
        img[0:border_width, :, :].reshape(-1, 3),
        img[-border_width:, :, :].reshape(-1, 3),
        img[:, 0:border_width, :].reshape(-1, 3),
        img[:, -border_width:, :].reshape(-1, 3)
    ], axis=0)
    return border_pixels.mean(axis=0).astype(int).tolist()

def run_yolo_ocr(image_path):
    # model_path = 'D:/YOLO-Train/blood-pressure.v1i.yolov8/runs/detect/train2/weights/best.pt'
    model_path = os.path.join(os.path.dirname(__file__), 'blood-pressure.v1i.yolov8', 'best.pt')
    model = YOLO(model_path)
    image = cv2.imread(image_path)
    results = model(image_path)
    output_data = {}

    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0].item())
            cls_name = class_names[cls_id]
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cropped = image[y1:y2, x1:x2]
            border_color = get_average_border_color(cropped)
            padded = cv2.copyMakeBorder(cropped, 100, 100, 100, 100, cv2.BORDER_CONSTANT, value=border_color)
            number_str = ocr_google(padded)
            output_data[cls_name] = number_str
    return output_data
