from zoneinfo import ZoneInfo
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from google.cloud import vision
from config import OPENAI_API_KEY, GOOGLE_VISION_CREDENTIALS
import openai
from rest_framework.permissions import IsAuthenticated
#----------------------------------------------------------------
import base64
import os
import re
import cv2
import numpy as np
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from ultralytics import YOLO
from openai import OpenAI
from .models import HealthCare

from datetime import datetime
from django.utils import timezone
from zoneinfo import ZoneInfo

def parse_to_utc_minute(value) -> datetime:
    """
    接受：
      - epoch（秒或毫秒）
      - ISO（可含時區；'Z' 也可）
      - 無時區字串：視為 Asia/Taipei
      - datetime 物件
    回傳：UTC aware datetime，且「秒/微秒 = 0」（分鐘精度）
    """
    tw = ZoneInfo('Asia/Taipei')
    dt = None

    # datetime 直接處理
    if isinstance(value, datetime):
        dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc)

    # epoch（數字或數字字串）
    elif isinstance(value, (int, float)) or (isinstance(value, str) and value.isdigit()):
        n = int(value)
        if n > 10_000_000_000:  # 毫秒
            dt = timezone.datetime.fromtimestamp(n / 1000.0, tz=timezone.utc)
        else:                   # 秒
            dt = timezone.datetime.fromtimestamp(n, tz=timezone.utc)

    # 字串
    elif isinstance(value, str):
        s = value.strip().replace('Z', '+00:00')
        # 優先 ISO
        try:
            dt_iso = datetime.fromisoformat(s)
            dt = dt_iso.astimezone(timezone.utc) if dt_iso.tzinfo else dt_iso.replace(tzinfo=tw).astimezone(timezone.utc)
        except Exception:
            # 常見無時區格式 → 當台灣時間
            for f in ['%Y-%m-%d %H:%M:%S','%Y-%m-%d %H:%M','%Y/%m/%d %H:%M:%S','%Y/%m/%d %H:%M','%Y-%m-%dT%H:%M:%S','%Y-%m-%d']:
                try:
                    naive = datetime.strptime(s, f)
                    dt = naive.replace(tzinfo=tw).astimezone(timezone.utc)
                    break
                except Exception:
                    pass

    if dt is None:
        dt = timezone.now()

    return dt.astimezone(timezone.utc).replace(second=0, microsecond=0)  # 分鐘精度

def dt_key_minute(dt: datetime) -> str:
    """
    產生「分鐘精度」鍵值（UTC），用於去重：
    'YYYY-MM-DDTHH:MM'
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M')

User = get_user_model()
client = OpenAI(api_key=getattr(settings, "OPENAI_API_KEY", None))

# 數值驗證範圍
VALID_RANGES = {
    "systolic": (70, 250),
    "diastolic": (40, 150),
    "pulse": (30, 200),
}

_REGION_MODEL = None
_DIGITS_MODEL = None


def _load_models():
    global _REGION_MODEL, _DIGITS_MODEL
    if _REGION_MODEL is None or _DIGITS_MODEL is None:
        region_path = os.path.join(settings.YOLO_MODELS_DIR, "region_best.pt")
        digits_path = os.path.join(settings.YOLO_MODELS_DIR, "digits_best.pt")
        _REGION_MODEL = YOLO(region_path)
        _DIGITS_MODEL = YOLO(digits_path)
    return _REGION_MODEL, _DIGITS_MODEL


def decode_image_from_request(request):
    if "image" in request.FILES:
        image_bytes = request.FILES["image"].read()
    elif "image_base64" in request.data:
        b64 = request.data["image_base64"]
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        image_bytes = base64.b64decode(b64)
    else:
        raise ValueError("need_image_or_base64")
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("decode_failed")
    return img, base64.b64encode(image_bytes).decode("utf-8")


def call_gpt_fallback(image_b64: str):
    """呼叫 GPT 辨識血壓數字"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "你是一個醫療助手，請只輸出格式：收縮壓=<數字>, 舒張壓=<數字>, 心跳=<數字>"},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "請讀出這張血壓計上的數字"},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                ]
            }
        ],
        max_tokens=200,
    )
    result_text = response.choices[0].message.content.strip()
    nums = re.findall(r"(\d+)", result_text)
    if len(nums) < 3:
        raise ValueError(f"GPT parse fail: {result_text}")
    return {
        "systolic": int(nums[0]),
        "diastolic": int(nums[1]),
        "pulse": int(nums[2]),
    }


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.conf import settings

from datetime import timedelta
import pytz

# 假設你已有的工具/常數
# from .yolo import _load_models, VALID_RANGES
# from .utils import decode_image_from_request, call_gpt_fallback
from .models import HealthCare

TAIPEI = pytz.timezone("Asia/Taipei")

class BloodYOLOView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        try:
            # 1) 取圖
            image, image_b64 = decode_image_from_request(request)

            # 2) 取前端送來的時間（ISO/UTC）。若沒有，就以現在時間
            ts_str  = request.POST.get("timestamp")  # e.g. "2025-09-20T14:35:32.343Z"
            tz_str  = request.POST.get("tz")         # e.g. "Asia/Taipei"
            epoch_ms = request.POST.get("epoch_ms")  # e.g. "1758378932343"

            # 2a) 解析成 aware datetime（以 UTC 為主）
            captured_at = None
            if ts_str:
                dt = parse_datetime(ts_str)
                if dt is not None:
                    if timezone.is_naive(dt):
                        dt = timezone.make_aware(dt, timezone.utc)
                    captured_at = dt
            if captured_at is None:
                captured_at = timezone.now()  # 後備：沒有給就用現在（UTC）

            # 2b) 算出台北本地時間 & 本地「日期」與「早/晚」
            captured_at_taipei = captured_at.astimezone(TAIPEI)
            local_date = captured_at_taipei.date()
            period = "morning" if captured_at_taipei.hour < 12 else "evening"

            # 3) YOLO 辨識（出錯就走 GPT fallback）
            try:
                region_model, digits_model = _load_models()
                det = region_model.predict(
                    image, conf=0.40, verbose=False,
                    device=getattr(settings, "YOLO_DEVICE", 0)
                )

                results = {"systolic": None, "diastolic": None, "pulse": None}
                for r in det:
                    for b in getattr(r, "boxes", []):
                        cls_name = region_model.names.get(int(b.cls[0]), "")
                        if "sys" in cls_name.lower():
                            results["systolic"] = 135  # TODO: 用 digits_model 真的辨識
                        elif "dia" in cls_name.lower():
                            results["diastolic"] = 80
                        elif "pul" in cls_name.lower():
                            results["pulse"] = 70

                if any(v is None for v in results.values()):
                    raise ValueError("YOLO incomplete")

                for k, (lo, hi) in VALID_RANGES.items():
                    if not (lo <= results[k] <= hi):
                        raise ValueError("YOLO out of range")

            except Exception:
                results = call_gpt_fallback(image_b64)

            # 4) Upsert：同一人、同一台北日、同一時段 若已有 → 更新；否則建立
            obj, created = HealthCare.objects.get_or_create(
                UserID=request.user,
                LocalDate=local_date,
                Period=period,
                defaults=dict(
                    Systolic=results["systolic"],
                    Diastolic=results["diastolic"],
                    Pulse=results["pulse"],
                    # 這裡建議 CapturedAt 存 UTC；如果你前面已轉台北，也可存 UTC 以利一致
                    CapturedAt=captured_at,             # 建議存 UTC
                    DeviceTZ=tz_str,
                    EpochMs=epoch_ms,
                )
            )

            if not created:
                # 覆蓋更新該時段資料
                obj.Systolic = results["systolic"]
                obj.Diastolic = results["diastolic"]
                obj.Pulse = results["pulse"]
                obj.CapturedAt = captured_at           # 建議存 UTC
                obj.DeviceTZ = tz_str
                obj.EpochMs = epoch_ms
                obj.save()

            return Response({
                "ok": True,
                "parsed": results,
                "health_id": obj.HealthID,
                "period": obj.Period,
                "local_date": str(obj.LocalDate),                     # 台北的日期（字串）
                "captured_at_utc": obj.CapturedAt.isoformat(),        # UTC
                "captured_at_taipei": captured_at_taipei.strftime("%Y-%m-%d %H:%M:%S"),
                "created": created,                                   # True=新增 / False=更新
                "message": ("新增" if created else "已更新") + ("早上" if obj.Period=="morning" else "晚上") + "紀錄",
            }, status=200)

        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

#查血壓
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import get_current_timezone
from datetime import datetime, time, timezone as dt_timezone
from .models import HealthCare
from mysite.models import User

class HealthCareByDateAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        date_str = request.query_params.get('date')
        user_id = request.query_params.get('user_id')

        if not date_str:
            return Response({'error': '缺少日期參數'}, status=400)

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': '日期格式錯誤，應為 YYYY-MM-DD'}, status=400)

        if user_id:
            try:
                user_id = int(user_id)
                target_user = User.objects.get(UserID=user_id)
            except (ValueError, TypeError):
                return Response({'error': 'user_id 格式錯誤'}, status=400)
            except User.DoesNotExist:
                return Response({'error': '查無此使用者'}, status=404)
        else:
            target_user = user

        # 撈當日兩筆
        records = HealthCare.objects.filter(
            UserID=target_user,
            LocalDate=target_date
        )

        morning = records.filter(Period="morning").first()
        evening = records.filter(Period="evening").first()

        return Response({
            "date": date_str,
            "morning": {
                "systolic": morning.Systolic if morning else None,
                "diastolic": morning.Diastolic if morning else None,
                "pulse": morning.Pulse if morning else None,
                "captured_at": morning.CapturedAt if morning else None,
            } if morning else None,
            "evening": {
                "systolic": evening.Systolic if evening else None,
                "diastolic": evening.Diastolic if evening else None,
                "pulse": evening.Pulse if evening else None,
                "captured_at": evening.CapturedAt if evening else None,
            } if evening else None,
        })

#----------------------------------------------------------------
#藥單
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Med
from django.conf import settings
from mysite.models import User  # ⚠️ 若路徑不同請調整
from google.cloud import vision
from config import GOOGLE_VISION_CREDENTIALS, OPENAI_API_KEY

import openai
import json
import uuid
import re

# 設定 OpenAI API 金鑰
openai.api_key = OPENAI_API_KEY

# 允許的頻率（與 Prompt 對齊）
ALLOWED_FREQ = {"一天一次", "一天兩次", "一天三次", "一天四次", "睡前", "必要時", "未知"}


def normalize_freq(text: str | None) -> str:
    """
    把各種寫法正規化成 ALLOWED_FREQ 之一。
    支援：
    - x1/x2/x3/x4 (+ x?x? 後面的天數忽略)
    - 一天4次 / 每日 3 次 / 3次/日
    - 睡前/睡覺前、必要時/PRN
    - xlx3（視為 x1x3）
    """
    if not text:
        return "未知"
    t = str(text).strip()

    # 去空白、大小寫、全形
    t = t.replace("Ｘ", "x").replace("＊", "x").replace("×", "x")
    t = t.replace("：", ":").replace("／", "/")
    t = re.sub(r"\s+", "", t)

    # 常見打字錯：xlx3 → x1x3
    t = t.replace("xlx", "x1x")

    # xNxD 形式
    m = re.search(r"x(\d)x(\d+)", t, flags=re.IGNORECASE)
    if m:
        n = int(m.group(1))
        return {1: "一天一次", 2: "一天兩次", 3: "一天三次", 4: "一天四次"}.get(n, "未知")

    # 一天/每日 N 次
    for n, lab in [(4, "一天四次"), (3, "一天三次"), (2, "一天兩次"), (1, "一天一次")]:
        if re.search(fr"(一天|每日){n}次", t):
            return lab
        if re.search(fr"{n}次/日", t):
            return lab

    # 睡前 / 必要時
    if re.search(r"睡前|睡覺前", t):
        return "睡前"
    if re.search(r"必要時|PRN", t, flags=re.IGNORECASE):
        return "必要時"

    # 有時 GPT 已經回正確字串，但含不可見空白
    if t in ALLOWED_FREQ:
        return t

    return "未知"


class OcrAnalyzeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print("目前登入的使用者是：", request.user)
        print("收到的檔案列表：", request.FILES)

        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"error": "沒有收到圖片"}, status=400)

        try:
            # 1) Google Vision OCR
            client = vision.ImageAnnotatorClient.from_service_account_info(GOOGLE_VISION_CREDENTIALS)
            image = vision.Image(content=image_file.read())
            response = client.text_detection(image=image)
            annotations = response.text_annotations

            if not annotations:
                return Response({"error": "無法辨識文字"}, status=400)

            ocr_text = (annotations[0].description or "").strip()
            print("🔍 OCR 結果：", ocr_text)

            # 2) 丟 GPT 解析
            gpt_result = self.analyze_with_gpt(ocr_text)
            print("🔍 GPT 原始結果：", gpt_result)

            try:
                parsed = json.loads(gpt_result)
            except json.JSONDecodeError:
                return Response({"error": "GPT 回傳非有效 JSON", "raw": gpt_result}, status=400)

            # 3) 目標使用者（可傳 user_id，否則用登入者）
            user_id = request.POST.get("user_id")
            if user_id:
                try:
                    target_user = User.objects.get(UserID=int(user_id))
                except (User.DoesNotExist, ValueError):
                    return Response({"error": "查無此使用者"}, status=404)
            else:
                target_user = request.user

            # 4) 入庫
            prescription_id = uuid.uuid4()
            disease_names = parsed.get("diseaseNames") or []
            disease = (disease_names[0] if disease_names else "未知")[:50]

            meds = parsed.get("medications") or []
            created = 0
            for m in meds:
                raw_freq = (m.get("dosageFrequency") or "").strip()
                freq_std = normalize_freq(raw_freq)

                med_name = (m.get("medicationName") or "未知")[:50]
                admin = (m.get("administrationRoute") or "未知")[:10]
                effect = (m.get("effect") or "未知")[:100]
                side = (m.get("sideEffect") or "未知")[:100]
                TotalDosage = m.get("TotalDosage", 0)
                print(f"[WRITE] {med_name} | raw_freq='{raw_freq}' -> save='{freq_std}'")

                Med.objects.create(
                    UserID=target_user,
                    Disease=disease or "未知",
                    MedName=med_name,
                    AdministrationRoute=admin,
                    DosageFrequency=freq_std,
                    Effect=effect,
                    SideEffect=side,
                    TotalDosage=TotalDosage,
                    PrescriptionID=prescription_id,
                )
                created += 1

            return Response(
                {
                    "message": f"✅ 成功寫入 {created} 筆藥單資料",
                    "created_count": created,
                    "prescription_id": str(prescription_id),
                    "parsed": parsed,  # 方便前端比對
                },
                status=200,
            )

        except Exception as e:
            print("❌ 例外錯誤：", e)
            return Response({"error": str(e)}, status=500)

    def analyze_with_gpt(self, ocr_text: str) -> str:
        prompt = f"""
            你是一個嚴謹的藥單 OCR 與結構化助手。請從藥袋/收據的 OCR 文字中抽取結構化資訊，並【只輸出純 JSON】。
            請注意：對於藥物的服藥次數，若有 `xNxD` 格式，請根據 `N`（每天的服藥次數）與 `D`（服藥天數）計算 `TotalDosage`（總服藥次數）。例如：`x4x3` 代表一天四次、服用三天，則 `TotalDosage` 是 4 * 3 = 12 次。

            ### OCR 內容
            {ocr_text}

            ### 輸出 JSON Schema
            {{
            "diseaseNames": string[],   
            "medications": [
                {{
                "medicationName": string,                         
                "administrationRoute": "內服"|"外用"|"其他",       
                "dosageFrequency": "一天一次"|"一天兩次"|"一天三次"|"一天四次"|"睡前"|"必要時"|"未知",
                "effect": string,                                  
                "sideEffect": string,
                "TotalDosage": integer,  # 計算總服藥次數
                }}
            ]
            }}

            ### 規則
            1) xNxD → 一天 N 次，D 為天數。根據這個格式計算 `TotalDosage`（總服藥次數）。
            - 內服 1.00 x4x3 → 一天四次，吃三天，`TotalDosage` = 4 * 3 = 12 次
            - 內服 1.00 xlx3 → 一天一次，吃三天，`TotalDosage` = 1 * 3 = 3 次
            - 如果是必要時服用，則 `TotalDosage` = 0。
            2) 若文字含「一天/每日 N 次」「N次/日」，請正規化為對應字串。
            3) 出現「睡前/睡覺前」→ 睡前；「必要時/PRN」→ 必要時。
            4) 路徑：出現「內服/口服」→ 內服；「外用」→ 外用；其餘 → 其他。
            5) 僅輸出 JSON，不得包含說明文字或程式碼圍欄。
            """

        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},  
            messages=[
                {"role": "system", "content": "你是超級專業且嚴謹的藥劑師，會把藥單 OCR 結構化輸出。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )

        return (response.choices[0].message.content or "").strip()

#開始服藥
@api_view(['POST'])
def start_medication(request):
    user_id = request.data.get('userId')
    med_names = request.data.get('medName')  # 這裡可能是 list

    if isinstance(med_names, str):
        med_names = [med_names]

    results = []
    for med_name in med_names:
        medication = get_object_or_404(Med, UserID=user_id, MedName=med_name)
        medication.CurrentDosage += 1
        medication.save()
        if medication.CurrentDosage >= medication.TotalDosage:
            medication.delete()
            results.append({'medName': med_name, 'message': '藥物已完成，資料已刪除。'})
        else:
            results.append({'medName': med_name, 'message': '服藥次數已更新。'})

    return Response({'results': results}, status=status.HTTP_200_OK)



#藥單查詢
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Med
from .serializers import MedNameSerializer
from mysite.models import User  # ⚠️ 根據你的 User model 所在位置修改

class MedNameListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id_param = request.query_params.get('user_id')

        # ✅ 如果有帶 user_id 就查指定長者，否則預設查自己
        if user_id_param:
            try:
                user = User.objects.get(UserID=int(user_id_param))
            except (User.DoesNotExist, ValueError):
                return Response({'error': '查無此使用者'}, status=404)
        else:
            user = request.user

        queryset = Med.objects.filter(UserID=user)
        grouped = {}

        for med in queryset:
            key = str(med.PrescriptionID)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(MedNameSerializer(med).data)

        result = [{'PrescriptionID': k, 'medications': v} for k, v in grouped.items()]
        return Response(result)
    
#藥單內容查詢
from .serializers import MedSerializer  # 你需要建立這個 serializer
from rest_framework.decorators import permission_classes

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_med_by_prescription(request, prescription_id):
    meds = Med.objects.filter(PrescriptionID=prescription_id)
    serializer = MedSerializer(meds, many=True)
    return Response(serializer.data)

#藥單刪除
from rest_framework.response import Response
from rest_framework import status

class DeletePrescriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, prescription_id):
        user_id = request.query_params.get('user_id')
        print('🔍 前端傳來的 user_id:', user_id)

        target_user = User.objects.get(UserID=user_id) if user_id else request.user
        print('🔍 目標使用者:', target_user)

        deleted_count, _ = Med.objects.filter(PrescriptionID=prescription_id, UserID=target_user).delete()
        print(f'✅ 刪除了 {deleted_count} 筆資料')
        
        return Response({'message': '已刪除', 'deleted_count': deleted_count}, status=status.HTTP_200_OK)

#用藥時間設定
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import User, MedTimeSetting
from .serializers import MedTimeSettingSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_med_time_setting(request):
    data = request.data.copy()

    # ✅ 取得前端傳來的 UserID（選擇的長者）
    user_id = data.get('UserID')
    if not user_id:
        return Response({"error": "缺少 UserID"}, status=400)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"error": "指定的 UserID 不存在"}, status=404)

    # ✅ 準備欄位值
    morning = data.get('MorningTime')
    noon = data.get('NoonTime')
    evening = data.get('EveningTime')
    bedtime = data.get('Bedtime')

    # ✅ 使用 update_or_create（不會新增多筆，只會更新或建立一筆）
    setting, created = MedTimeSetting.objects.update_or_create(
        UserID=user,
        defaults={
            "MorningTime": morning,
            "NoonTime": noon,
            "EveningTime": evening,
            "Bedtime": bedtime
        }
    )

    serializer = MedTimeSettingSerializer(setting)
    return Response({
        "status": "updated" if not created else "created",
        "data": serializer.data
    }, status=200)



# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.permissions import IsAuthenticated
# from rest_framework.response import Response
# from .models import MedTimeSetting
# from .serializers import MedTimeSettingSerializer

# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def get_med_time_setting(request):
#     try:
#         setting = MedTimeSetting.objects.get(UserID=request.user)
#         serializer = MedTimeSettingSerializer(setting)
#         return Response(serializer.data)
#     except MedTimeSetting.DoesNotExist:
#         return Response({'detail': '尚未設定時間'}, status=404)

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Med, MedTimeSetting

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_med_reminders(request):
    user = request.user

    # ✅ 你的定義：RelatedID 有值 = 長者；None = 家人
    # 家人不允許查詢（這支是給長者本人用）
    if user.RelatedID is None:
        return Response({"error": "此帳號為家人，無法取得用藥提醒"}, status=403)

    try:
        time_setting = MedTimeSetting.objects.get(UserID=user)   # 這裡的 user 就是長者
    except MedTimeSetting.DoesNotExist:
        return Response({"error": "尚未設定用藥時間"}, status=404)

    meds = Med.objects.filter(UserID=user)  # 同樣以長者 user 篩選

    schedule = {"morning": [], "noon": [], "evening": [], "bedtime": []}

    for med in meds:
        freq = (getattr(med, "DosageFrequency", "") or "").strip()
        if freq == "一天一次":
            schedule["morning"].append(med.MedName)
        elif freq == "一天兩次":
            schedule["morning"].append(med.MedName)
            schedule["noon"].append(med.MedName)
        elif freq == "一天三次":
            schedule["morning"].append(med.MedName)
            schedule["noon"].append(med.MedName)
            schedule["evening"].append(med.MedName)
        elif freq == "一天四次":
            schedule["morning"].append(med.MedName)
            schedule["noon"].append(med.MedName)
            schedule["evening"].append(med.MedName)
            schedule["bedtime"].append(med.MedName)
        elif freq == "睡前":
            schedule["bedtime"].append(med.MedName)
            
    if getattr(user, 'RelatedID', None) is None:
        return Response({"error": "此帳號為家人，無法取得提醒"}, status=403)

    try:
        time_setting = MedTimeSetting.objects.get(UserID=user)
    except MedTimeSetting.DoesNotExist:
        return Response({"error": "尚未設定用藥時間，請先到時間設定頁設定"}, status=404)

    meds = Med.objects.filter(UserID=user)
    if not meds.exists():
        return Response({"error": "尚無藥物資料，請先新增藥物"}, status=404)

    result = {
        "morning": {"time": str(time_setting.MorningTime) if time_setting.MorningTime else None,
                    "meds": schedule["morning"]},
        "noon":    {"time": str(time_setting.NoonTime)    if time_setting.NoonTime    else None,
                    "meds": schedule["noon"]},
        "evening": {"time": str(time_setting.EveningTime) if time_setting.EveningTime else None,
                    "meds": schedule["evening"]},
        "bedtime": {"time": str(time_setting.Bedtime)     if time_setting.Bedtime     else None,
                    "meds": schedule["bedtime"]},
    }
    return Response(result)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_med_reminders_by_userid(request):
    user = request.user
    user_id = request.query_params.get('user_id')
    if not user_id:
        return Response({'error': '缺少 user_id'}, status=400)
    try:
        target = User.objects.get(UserID=user_id)
    except User.DoesNotExist:
        return Response({'error': '查無此用戶'}, status=404)
    # 權限檢查：只能查自己或同家庭
    if user.UserID != target.UserID:
        if not (user.FamilyID and user.FamilyID == target.FamilyID):
            return Response({'error': '無權限查詢此用戶'}, status=403)
    try:
        time_setting = MedTimeSetting.objects.get(UserID=target)
    except MedTimeSetting.DoesNotExist:
        return Response({'error': '尚未設定用藥時間'}, status=404)
    meds = Med.objects.filter(UserID=target)
    if not meds.exists():
        return Response({'error': '尚無藥物資料，請先新增藥物'}, status=404)
    schedule = {'morning': [], 'noon': [], 'evening': [], 'bedtime': []}
    for med in meds:
        freq = (getattr(med, 'DosageFrequency', '') or '').strip()
        if freq == '一天一次':
            schedule['morning'].append(med.MedName)
        elif freq == '一天兩次':
            schedule['morning'].append(med.MedName)
            schedule['noon'].append(med.MedName)
        elif freq == '一天三次':
            schedule['morning'].append(med.MedName)
            schedule['noon'].append(med.MedName)
            schedule['evening'].append(med.MedName)
        elif freq == '一天四次':
            schedule['morning'].append(med.MedName)
            schedule['noon'].append(med.MedName)
            schedule['evening'].append(med.MedName)
            schedule['bedtime'].append(med.MedName)
        elif freq == '睡前':
            schedule['bedtime'].append(med.MedName)
    result = {
        'morning': {'time': str(time_setting.MorningTime) if time_setting.MorningTime else None, 'meds': schedule['morning']},
        'noon':    {'time': str(time_setting.NoonTime)    if time_setting.NoonTime    else None, 'meds': schedule['noon']},
        'evening': {'time': str(time_setting.EveningTime) if time_setting.EveningTime else None, 'meds': schedule['evening']},
        'bedtime': {'time': str(time_setting.Bedtime)     if time_setting.Bedtime     else None, 'meds': schedule['bedtime']},
    }
    return Response(result)
#----------------------------------------------------------------
#健康
# views.py
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import FitData

class FitDataAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        steps = request.data.get('steps')
        date_str = request.data.get('date')  # ✅ 改收 date

        if steps is None or not date_str:
            return Response({'error': '缺少步數或日期'}, status=400)

        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({'error': '日期格式錯誤，應為 YYYY-MM-DD'}, status=400)

        # ✅ 檢查是否已有當日紀錄
        fitdata, created = FitData.objects.get_or_create(
            UserID=user,
            date=date_obj,
            defaults={'steps': steps}
        )

        if not created:
            if fitdata.steps != steps:
                fitdata.steps = steps
                fitdata.save()
                return Response({'message': '✅ 已更新當日步數'})
            else:
                return Response({'message': '🟡 當日步數相同，未更新'})
        else:
            return Response({'message': '✅ 新增成功'})


# 查詢步數（用 date 欄位）
from datetime import datetime
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import FitData

User = get_user_model()

class FitDataByDateAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1) 取得參數
        date_str = request.query_params.get('date')      # 必填：YYYY-MM-DD
        user_id = request.query_params.get('user_id')    # 選填：查指定使用者

        if not date_str:
            return Response({'error': '缺少日期參數 date（YYYY-MM-DD）'}, status=400)

        # 2) 解析日期
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': '日期格式錯誤，應為 YYYY-MM-DD'}, status=400)

        # 3) 決定目標使用者：有 user_id 就查該人，否則查登入者
        if user_id:
            try:
                uid = int(user_id)
            except (TypeError, ValueError):
                return Response({'error': 'user_id 必須為整數'}, status=400)

            try:
                # 用 get_user_model() 比較穩；一般用 pk/id 查就好
                target_user = User.objects.get(pk=uid)
            except User.DoesNotExist:
                return Response({'error': '查無此使用者'}, status=404)
        else:
            target_user = request.user

        # 4) 以 date 精準查詢（模型已改為 date 欄位）
        record = (
            FitData.objects
            .filter(UserID=target_user, date=target_date)
            .order_by('-updated_at' if hasattr(FitData, 'updated_at') else 'pk')
            .first()
        )

        if not record:
            return Response({'message': '當日無步數資料'}, status=404)

        # 5) 回傳結果（保持簡潔）
        return Response({
            'user_id': getattr(target_user, 'pk', None),
            'date': record.date.isoformat(),
            'steps': record.steps,
            'created_at': getattr(record, 'created_at', None),
            'updated_at': getattr(record, 'updated_at', None),
        })


#----------------------------------------------------------------
@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, world!(你好世界)"})
#---------------------------------------------------------------------------------------


# Create your views here.
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserRegisterSerializer, UserPublicSerializer, UserMeSerializer
from django.contrib.auth import authenticate
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication

# --------------------
# 註冊
# --------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    creator_id = request.data.get('creator_id')  # 可選參數

    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        # 若是「家人新增長者」
        if creator_id:
            try:
                creator = User.objects.get(UserID=creator_id)

                if creator.is_elder:
                    return Response({'error': '只有家人可以新增長者帳號'}, status=403)

                user.RelatedID = creator
                user.FamilyID = creator.FamilyID
                user.is_elder = True
                user.save()
            except User.DoesNotExist:
                return Response({'error': '創建者不存在'}, status=400)

        # ⭐ 回傳時也帶上 avatar
        return Response({
            "UserID": user.UserID,
            "Name": user.Name,
            "Phone": user.Phone,
            "Gender": user.Gender,
            "Borndate": user.Borndate,
            "FamilyID": user.FamilyID.FamilyID if user.FamilyID else None,
            "RelatedID": user.RelatedID.UserID if user.RelatedID else None,
            "avatar": user.avatar,   # ⭐ 新增
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    Phone = request.data.get('Phone')
    password = request.data.get('password')

    if not Phone or not password:
        return Response({"message": "請提供帳號與密碼"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(Phone=Phone)
    except User.DoesNotExist:
        return Response({"message": "帳號不存在"}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(password):
        return Response({"message": "密碼錯誤"}, status=status.HTTP_400_BAD_REQUEST)

    refresh = RefreshToken.for_user(user)

    return Response({
        "message": "登入成功",
        "token": {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        },
        "user": {
            "UserID": user.UserID,
            "Name": user.Name,
            "Phone": user.Phone,
            "FamilyID": user.FamilyID.FamilyID if user.FamilyID else None,
            "RelatedID": user.RelatedID.UserID if user.RelatedID else None,
            "avatar": user.avatar,   # ⭐ 新增
        }
    }, status=status.HTTP_200_OK)


#------------------------------------------------------------------------
#創建家庭
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Family, User  # 確保有 import
from .serializers import FamilySerializer  # 如果沒有等下幫你補
from django.utils.crypto import get_random_string

class CreateFamilyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({'error': '未登入'}, status=401)

        if user.FamilyID:  # 若已有家庭，就不能再創建
            return Response({'error': '您已經有家庭了'}, status=400)

        family_name = request.data.get('FamilyName')
        if not family_name:
            return Response({'error': '請輸入家庭名稱'}, status=400)

        # 自動產生 Fcode（4碼數字）
        fcode = get_random_string(4, allowed_chars='0123456789')

        family = Family.objects.create(
            FamilyName=family_name,
            Fcode=fcode
        )

        # 綁定使用者的 FamilyID
        user.FamilyID = family
        user.RelatedID = None
        user.save()

        return Response({
            'message': '家庭創建成功',
            'FamilyID': family.FamilyID,
            'Fcode': family.Fcode,
            'FamilyName': family.FamilyName,
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_me(request):
    user = request.user
    family = user.FamilyID
    family_obj = user.FamilyID  

    return Response({
        "UserID": user.UserID,
        "Name": user.Name,
        "Phone": user.Phone,
        "Gender": user.Gender,
        "Borndate": user.Borndate,
        "FamilyID": family.id if family else None,
        "Fcode": family.Fcode if family else None,  # ✅ 真正抓到 Fcode
        "FamilyID": family_obj.FamilyID if family_obj else None, 
        "Fcode": family_obj.Fcode if family_obj else None,        
        "RelatedID": user.RelatedID.UserID if user.RelatedID else None,
    })


from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

@api_view(['GET'])
@authentication_classes([JWTAuthentication])  # 只用 JWT，避免 CSRF 影響
@permission_classes([IsAuthenticated])
def get_me_1(request):
    user = request.user
    family = getattr(user, 'FamilyID', None)  # 你的模型若是外鍵 Family

    # 取 family 主鍵與 Fcode（名稱可能是 id 或 FamilyID，做容錯）
    family_pk = None
    family_code = None
    if family:
        family_pk = getattr(family, 'id', None) or getattr(family, 'FamilyID', None)
        family_code = getattr(family, 'Fcode', None)

    # RelatedID：你的定義是「有值=長者；None=家人」
    related_user = getattr(user, 'RelatedID', None)
    related_id = getattr(related_user, 'UserID', None) if related_user else None
    is_elder = related_id is not None  # ✅ 直接給前端明確布林

    return Response({
        "UserID": getattr(user, "UserID", None),
        "Name": getattr(user, "Name", None),
        "Phone": getattr(user, "Phone", None),
        "Gender": getattr(user, "Gender", None),
        "Borndate": getattr(user, "Borndate", None),

        # 家庭資訊
        "FamilyPrimaryKey": family_pk,
        "FamilyFcode": family_code,

        # 長者／家人判定
        "RelatedID": related_id,  # 有值=長者
        "isElder": is_elder,      # ✅ 額外提供更直覺的布林
    })




#新增長者
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_related(request):
    user = request.user  # 目前登入的家人

    if user.is_elder:
        return Response({"error": "只有家人可以新增長者"}, status=403)

    name = request.data.get('Name')
    phone = request.data.get('Phone')
    password = request.data.get('password')
    gender = request.data.get('Gender', 'M')
    borndate = request.data.get('Borndate')

    if not all([name, phone, password, borndate]):
        return Response({"error": "請填寫完整資料"}, status=400)

    if User.objects.filter(Phone=phone).exists():
        return Response({"error": "此手機號碼已被註冊"}, status=400)

    elder = User.objects.create_user(
        Phone=phone,
        Name=name,
        Gender=gender,
        Borndate=borndate,
        password=password,
        FamilyID=user.FamilyID,
        RelatedID=user,
        is_elder=True
    )

    return Response({
        "message": "長者帳號建立成功",
        "elder": {
            "UserID": elder.UserID,
            "Name": elder.Name,
            "Phone": elder.Phone,
            "RelatedID": elder.RelatedID.UserID,
            "FamilyID": elder.FamilyID
        }
    }, status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_family_members(request):
    family_id = request.user.FamilyID
    if not family_id:
        return Response({"error": "未加入任何家庭"}, status=400)

    members = User.objects.filter(FamilyID=family_id)
    serializer = UserPublicSerializer(members, many=True)
    return Response(serializer.data)

from .serializers import UserMeSerializer
#取個人資料
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_me(request):
    serializer = UserMeSerializer(request.user)
    return Response(serializer.data)


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Hos
from mysite.models import User  # 你的 User 模型
from django.shortcuts import get_object_or_404


def _is_elder_user(u):
    """
    認定使用者是否為長者：
    1) 明確的布林欄位 is_elder（若你有）
    2) 或以資料設計推斷：長者常態上會有 RelatedID 指向照護者
    依你的實作擇一或兩者併用
    """
    if hasattr(u, 'is_elder'):
        return bool(getattr(u, 'is_elder'))
    # 若沒有 is_elder 欄位，改用 RelatedID 是否存在來推斷
    return getattr(u, 'RelatedID_id', None) is not None


def _resolve_target_user_id(request):
    """
    解析本次操作的【長者】UserID：
    - 長者登入：就是自己
    - 家人登入：必須帶 ?user_id= 或 body 的 elder_id/user_id
      -> 僅接受「長者」ID；若帶到家人 ID，嘗試映射到其所照護的長者（單一長者時）
      -> 通過授權：同家庭 或 長者.RelatedID == 自己
    """
    me = request.user

    # 1) 長者登入：直接回自己
    if _is_elder_user(me):
        return getattr(me, 'UserID', None) or getattr(me, 'pk', None)

    # 2) 家人登入：讀取參數
    raw = (
        request.query_params.get('user_id')
        or request.data.get('elder_id')
        or request.data.get('user_id')
    )
    if not raw:
        return None

    try:
        uid = int(raw)
    except (TypeError, ValueError):
        return None

    # 先抓這個 uid 對應的使用者
    target = get_object_or_404(User, UserID=uid)

    # 如果傳來的是家人 ID（非長者），嘗試映射成他所照護的長者（常見一對一）
    if not _is_elder_user(target):
        # 依你的資料關係：長者.RelatedID 指向家人
        elder_qs = User.objects.filter(RelatedID_id=target.UserID)
        # 一對一情境下可取 first；若可能多位長者，請改成必要時回 400 並讓前端明確指定
        mapped_elder = elder_qs.first()
        if mapped_elder:
            target = mapped_elder
        else:
            # 不是長者且無法映射 -> 拒絕，避免把家人當成長者
            return None

    # 至此，target 已確保為長者
    # 授權檢查（擇一或都檢）
    same_family = (
        getattr(target, 'FamilyID_id', None) and
        getattr(me, 'FamilyID_id', None) and
        target.FamilyID_id == me.FamilyID_id
    )
    related_to_me = (getattr(target, 'RelatedID_id', None) == getattr(me, 'UserID', None))

    if same_family or related_to_me:
        return getattr(target, 'UserID', None)

    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hospital_list(request):
    target_id = _resolve_target_user_id(request)
    if not target_id:
        return Response({"error": "沒有指定有效的長者"}, status=400)

    qs = Hos.objects.filter(UserID_id=target_id).order_by('-ClinicDate')
    from .serializers import HosSerializer
    ser = HosSerializer(qs, many=True)
    return Response(ser.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hospital_create(request):
    target_id = _resolve_target_user_id(request)
    if not target_id:
        return Response({"error": "沒有指定有效的長者"}, status=400)

    data = request.data.copy()

    # 日期只留 YYYY-MM-DD（若你的欄位是 DateField）
    if isinstance(data.get('ClinicDate'), str) and ' ' in data['ClinicDate']:
        data['ClinicDate'] = data['ClinicDate'].split(' ')[0]

    from .serializers import HosSerializer
    ser = HosSerializer(data=data)
    if ser.is_valid():
        ser.save(UserID_id=target_id)  # 綁定到長者
        return Response(ser.data, status=201)
    return Response(ser.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def hospital_delete(request, pk):
    """
    刪除看診紀錄：
    - 老人：可刪自己的
    - 家人：帶 ?user_id=老人ID，且需通過授權檢查
    """
    target_id = _resolve_target_user_id(request)
    if not target_id:
        return Response({"error": "沒有指定老人"}, status=400)

    deleted_count, _ = Hos.objects.filter(pk=pk, UserID_id=target_id).delete()
    if deleted_count == 0:
        return Response({"error": "找不到資料或無權限刪除"}, status=404)

    return Response({"message": "已刪除"}, status=200)


# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.permissions import IsAuthenticated
# from rest_framework.response import Response
# from rest_framework import status
# from .models import CallRecord
# from django.db import IntegrityError
# from .serializers import CallRecordSerializer

# # 新增通話紀錄
# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def add_call_record(request):
#     serializer = CallRecordSerializer(data=request.data)
#     if serializer.is_valid():
#         serializer.save()
#         return Response(serializer.data, status=status.HTTP_201_CREATED)
#     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



import re
from datetime import datetime

from django.db import transaction
from django.db.models import Exists, OuterRef
from django.utils.dateparse import parse_datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from mysite.models import User, CallRecord, Scam
# 若你用不到 Serializer，這行可刪：from mysite.serializers import CallRecordSerializer


# --------- 共用工具 ---------
# views_call_upload.py
import re
from datetime import datetime, timezone as py_tz
from zoneinfo import ZoneInfo
from typing import Any, Optional

from django.db import transaction
from django.utils import timezone as dj_tz
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import CallRecord, User


# ---------- helpers ----------

def normalize_phone(p: str) -> str:
    """去除非數字；+886 開頭轉成 0 開頭"""
    s = re.sub(r'\D', '', p or '')
    if s.startswith('886') and len(s) >= 11:
        s = '0' + s[3:]
    return s

def to_dt(obj) -> datetime:
    """把各種輸入轉成『UTC aware、分鐘精度』的 datetime"""
    tw = ZoneInfo('Asia/Taipei')
    dt = None

    if isinstance(obj, datetime):
        dt = obj.astimezone(py_tz.utc) if obj.tzinfo else obj.replace(tzinfo=py_tz.utc)

    elif isinstance(obj, (int, float)) or (isinstance(obj, str) and obj.isdigit()):
        n = int(obj)
        if n > 10_000_000_000:  # ms
            n = n / 1000.0
        dt = datetime.fromtimestamp(n, tz=py_tz.utc)

    elif isinstance(obj, str):
        s = obj.strip().replace('Z', '+00:00')
        try:
            d = datetime.fromisoformat(s)
            dt = d.astimezone(py_tz.utc) if d.tzinfo else d.replace(tzinfo=tw).astimezone(py_tz.utc)
        except Exception:
            for f in ('%Y-%m-%d %H:%M:%S','%Y-%m-%d %H:%M','%Y/%m/%d %H:%M:%S','%Y/%m/%d %H:%M','%Y-%m-%dT%H:%M:%S','%Y-%m-%d'):
                try:
                    naive = datetime.strptime(s, f)
                    dt = naive.replace(tzinfo=tw).astimezone(py_tz.utc)
                    break
                except Exception:
                    pass

    if dt is None:
        dt = dj_tz.now().astimezone(py_tz.utc)

    return dt.astimezone(py_tz.utc).replace(second=0, microsecond=0)  # 分鐘精度

def dt_key_minute(d: datetime) -> str:
    return d.astimezone(py_tz.utc).strftime('%Y-%m-%d %H:%M')

def map_type(t) -> str:
    """容錯數字/字串；回傳標準型別字串"""
    if t is None:
        return 'UNKNOWN'
    s = str(t).strip().upper()
    if s in ('UNKNOW',):  # 有些資料表預設寫錯字
        s = 'UNKNOWN'
    # 英文字面
    allow = {'INCOMING','OUTGOING','MISSED','REJECTED','BLOCKED','VOICEMAIL','ANSWERED_EXTERNALLY','UNKNOWN'}
    if s in allow:
        return s
    # 數字映射（Android CallLog.Calls.TYPE）
    if s == '1': return 'INCOMING'
    if s == '2': return 'OUTGOING'
    if s == '3': return 'MISSED'
    if s == '4': return 'VOICEMAIL'            # 4 是語音信箱
    if s == '5': return 'REJECTED'
    if s == '6': return 'BLOCKED'
    if s == '7': return 'ANSWERED_EXTERNALLY'
    return 'UNKNOWN'


# --------- 上傳通話（長者端或家人代上傳） ---------

# def convert_to_taiwan_time(ts_str):
#     try:
#         # 解析時間戳
#         dt = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%S")
#         # 設置為 UTC 時間
#         dt = timezone('UTC').localize(dt)
#         # 轉換為台灣時間（UTC+8）
#         dt = dt.astimezone(timezone('Asia/Taipei'))
#         return dt.strftime("%Y-%m-%d %H:%M:%S")
#     except Exception as e:
#         print(f"Error converting time: {e}")
#         return None  # 返回 None 代表時間轉換失敗
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_call_logs(request):
    elder_id = request.data.get('elder_id')
    target_user = request.user

    if elder_id:
        try:
            target_user = User.objects.get(pk=int(elder_id))
            # TODO: 驗證 request.user 是否可代該 elder 上傳
        except (User.DoesNotExist, ValueError):
            return Response({"error": "elder not found"}, status=status.HTTP_404_NOT_FOUND)

    records = request.data.get('records') or []
    if not isinstance(records, list) or not records:
        return Response({"error": "no records"}, status=status.HTTP_400_BAD_REQUEST)

    # 讀模型欄位，用動態對應避免命名差異
    model_fields = {f.name for f in CallRecord._meta.get_fields() if hasattr(f, "attname")}
    def pick_field(cands):
        for c in cands:
            if c in model_fields:
                return c
        return None

    PHONE_FIELD    = pick_field(["Phone", "phone"])
    TIME_FIELD     = pick_field(["PhoneTime", "phone_time", "time", "Timestamp"])
    USER_FIELD     = pick_field(["UserId", "user", "user_id"])
    DURATION_FIELD = pick_field(["duration_sec","DurationSec","Duration","duration","CallDuration","Seconds","Secs"])
    TYPE_FIELD     = pick_field(["status","Status","Type","type","CallType","Direction"])  # 支援 status/Type
    NAME_FIELD     = pick_field(["PhoneName","phone_name","Name","ContactName"])
    EXTRA_FIELD    = pick_field(["Extra","extra","Meta","Payload"])

    if not all([PHONE_FIELD, TIME_FIELD, USER_FIELD]):
        return Response({"error": "model required fields not found"}, status=500)

    cleaned = []
    for r in records:
        # ---- 取電話 ----
        phone = normalize_phone(r.get("phone") or r.get("Phone") or '')
        # ---- 取時間 ----
        ts_str = to_dt(r.get("timestamp") or r.get("PhoneTime") or r.get("time"))

        if not phone or not ts_str:
            # 這筆丟掉，但仍打 log 幫忙追
            print("[upload_call_logs] skip record, phone/ts missing:", r)
            continue

        # ---- 型別：盡可能撈到 ----
        raw_type = (
            r.get("type") or r.get("status") or r.get("Type") or
            r.get("CallType") or r.get("Direction") or
            r.get("rawType") or (r.get("extra") or {}).get("rawType")
        )
        final_type = map_type(raw_type)

        # ---- 時長 ----
        raw_dur = (
            r.get("duration_sec") or r.get("DurationSec") or r.get("Duration") or
            r.get("duration") or r.get("CallDuration") or r.get("Seconds") or r.get("Secs")
        )
        try:
            dur_sec = int(raw_dur or 0)
        except Exception:
            dur_sec = 0

        # ---- 名稱 ----
        name = (r.get("name") or r.get("PhoneName") or '').strip() or '未知來電'

        # 重要：在後端 log 一下，確認拿到什麼
        print(f"[upload_call_logs] recv phone={phone} ts={ts_str} raw_type={raw_type} -> {final_type} dur={dur_sec} name={name}")

        payload = {
            USER_FIELD: target_user,
            PHONE_FIELD: phone,
            TIME_FIELD: ts_str,
        }
        if TYPE_FIELD:     payload[TYPE_FIELD] = final_type
        if DURATION_FIELD: payload[DURATION_FIELD] = dur_sec
        if NAME_FIELD:     payload[NAME_FIELD] = name[:255]
        if EXTRA_FIELD and (r.get("extra") is not None):
            payload[EXTRA_FIELD] = r.get("extra")

        cleaned.append(payload)

    if not cleaned:
        return Response({"saved": 0}, status=200)

    # ---- 限制 + 去重（同 user+phone+time 視為同筆）----
    first_upload = not CallRecord.objects.filter(**{USER_FIELD: target_user}).exists()
    cleaned.sort(key=lambda d: d[TIME_FIELD], reverse=True)
    cap = 100 if first_upload else 100
    cleaned = cleaned[:cap]

    phones = list({d[PHONE_FIELD] for d in cleaned})
    times  = list({d[TIME_FIELD]  for d in cleaned})
    time_min, time_max = min(times), max(times)

    exist_keys = set()
    qs = (CallRecord.objects
          .filter(**{USER_FIELD: target_user},
                  **{f"{PHONE_FIELD}__in": phones},
                  **{f"{TIME_FIELD}__range": (time_min, time_max)})
          .values(PHONE_FIELD, TIME_FIELD))
    for row in qs:
        exist_keys.add((row[PHONE_FIELD], to_dt(row[TIME_FIELD])))

    to_create = []
    for d in cleaned:
        key = (d[PHONE_FIELD], d[TIME_FIELD])
        if key in exist_keys:
            continue
        to_create.append(CallRecord(**d))

    if not to_create:
        return Response({"inserted": 0, "skipped": len(cleaned)}, status=200)

    try:
        with transaction.atomic():
            CallRecord.objects.bulk_create(to_create)
        return Response({"inserted": len(to_create), "skipped": len(cleaned) - len(to_create)}, status=201)
    except Exception as e:
        return Response({"error": f"{type(e).__name__}: {str(e)}"}, status=500)
    
# ====== API：查詢（沿用你的 to_dict 輸出）======
@api_view(['GET'])
@permission_classes([IsAuthenticated])  # 確保用戶已經認證
def get_call_records(request, elder_id):
    try:
        # TODO: 檢查 request.user 是否有權查看 elder_id 的資料
        records = (CallRecord.objects
                   .filter(UserId_id=elder_id)
                   .order_by('-PhoneTime')[:100])
        data = [record.to_dict() for record in records]
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# 新增詐騙資料表
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from mysite.models import Scam, CallRecord


def add_scam_from_callrecord(request):
    """
    測試用：把固定的一支電話加入 Scam。
    注意：Scam model 只有 Phone(FK) 與 Category，不能塞其他欄位。
    """
    phone_number = "0905544552"

    call_record = CallRecord.objects.filter(Phone=phone_number).order_by('-PhoneTime').first()
    if not call_record:
        # 找不到就「建立一筆 CallRecord」再關聯（你也可以改成直接回 404）
        call_record = CallRecord.objects.create(
            Phone=phone_number,
            PhoneName="未知來電",
            PhoneTime=timezone.now(),
        )

    Scam.objects.create(
        Phone=call_record,         # 外鍵要放 CallRecord 物件（或 Phone_id=call_record.pk）
        Category="詐騙",
    )
    return JsonResponse({"message": f"電話號碼 {phone_number} 已成功新增到詐騙資料表"}, status=200)

@api_view(['POST'])
@permission_classes([AllowAny])   
def scam_check_bulk(request):
    raw_list = request.data.get('phones') or []
    phones = [normalize_phone(x) for x in raw_list if x]
    if not phones:
        return Response({"matches": {}}, status=status.HTTP_200_OK)

    # 取每支電話「最新一筆 Scam」的 Category
    latest_category_subq = Subquery(
        Scam.objects
            .filter(Phone__Phone=OuterRef('Phone'))
            .order_by('-ScamId')              # 以 ScamId 當最新依據；你也可改時間欄位
            .values('Category')[:1]
    )

    # 以電話分組，套上最新分類
    rows = (CallRecord.objects
            .filter(Phone__in=phones)
            .values('Phone')                       
            .annotate(latest_category=latest_category_subq)
            .filter(latest_category__isnull=False)
            .values_list('Phone', 'latest_category'))

    matches = {phone: category for phone, category in rows}
    return Response({"matches": matches}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])  # 如果需要驗證，改為 IsAuthenticated
def scam_check(request):
    phone_number = request.GET.get('phone')
    
    if not phone_number:
        return Response({"error": "缺少電話號碼"}, status=status.HTTP_400_BAD_REQUEST)

    # 格式化並標準化電話號碼
    phone_number = normalize_phone(phone_number)

    # 取得電話的最新詐騙記錄
    latest_category_subq = Subquery(
        Scam.objects
            .filter(Phone__Phone=OuterRef('Phone'))
            .order_by('-ScamId')  # 按照 ScamId 來找最新的
            .values('Category')[:1]
    )

    # 查詢電話號碼是否為詐騙
    rows = (CallRecord.objects
            .filter(Phone=phone_number)
            .annotate(latest_category=latest_category_subq)
            .filter(latest_category__isnull=False)
            .values('Phone', 'latest_category'))

    # 如果該電話號碼在 Scam 表中有詐騙記錄，返回結果
    if rows:
        phone = rows[0]['Phone']
        category = rows[0]['latest_category']
        return Response({"phone": phone, "category": category}, status=status.HTTP_200_OK)
    
    # 如果找不到該電話的詐騙記錄，返回未找到
    return Response({"phone": phone_number, "category": "未檢出詐騙"}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])  # 若要驗證可改回 IsAuthenticated
def scam_add(request):
    """
    支援兩種傳法：
      1) { "Phone": "0905544552", "Category": "詐騙" }
         → 自動找/建 CallRecord 再關聯
      2) { "call_id": 123, "Category": "詐騙" }
         → 直接綁既有的 CallRecord
    """
    phone = (request.data.get("Phone") or "").strip()
    call_id = request.data.get("call_id")
    category = (request.data.get("Category") or "詐騙").strip()[:10]

    if not phone and not call_id:
        return Response({"error": "缺少 Phone 或 call_id，至少擇一"}, status=status.HTTP_400_BAD_REQUEST)

    # 取得/建立 CallRecord
    if call_id:
        try:
            call = CallRecord.objects.get(pk=call_id)
        except CallRecord.DoesNotExist:
            return Response({"error": f"CallRecord(id={call_id}) 不存在"}, status=status.HTTP_400_BAD_REQUEST)
    else:
        # ⚠️ 這裡要用的是 `phone`，不是 phone_number（phone_number 在另一個函式才有）
        call = (CallRecord.objects
                .filter(Phone=phone)
                .order_by('-PhoneTime')
                .first())
        if not call:
            # 找不到就建立一筆（如果你不想自動建立，改成回 404 即可）
            call = CallRecord.objects.create(
                Phone=phone,
                PhoneName="未知來電",
                PhoneTime=timezone.now()
            )

    scam = Scam.objects.create(
        Phone=call,          # 或寫 Phone_id=call.pk
        Category=category
    )

    return Response({
        "message": "Scam 新增成功",
        "ScamId": scam.ScamId,
        "Category": scam.Category,
        "CallRecord": {
            "CallId": getattr(call, 'CallId', getattr(call, 'id', None)),
            "Phone": call.Phone,
            "PhoneName": getattr(call, 'PhoneName', None),
            "PhoneTime": getattr(call, 'PhoneTime', None),
        }
    }, status=status.HTTP_201_CREATED)


#定位----------
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import UserRateThrottle
from django.db.models import OuterRef, Subquery
from django.contrib.auth import get_user_model

from .models import LocaRecord
from .permissions import IsElder
from .serializers import LocationUploadSerializer, LocationLatestSerializer

User = get_user_model()

class UploadLocationThrottle(UserRateThrottle):
    rate = '3/min'  #限制上傳頻率，可調整次數

def _same_family(u1, u2) -> bool:
    return (
        getattr(u1, 'FamilyID_id', None) is not None and
        getattr(u2, 'FamilyID_id', None) is not None and
        u1.FamilyID_id == u2.FamilyID_id
    )

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsElder])   # 僅長者可上傳
@throttle_classes([UploadLocationThrottle])
def upload_location(request):
    ser = LocationUploadSerializer(data=request.data, context={'user': request.user})
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # log
    print(f"Serialized data: {ser.validated_data}")

    rec = ser.save()
    out = LocationLatestSerializer(rec).data  # lat,lon,ts
    return Response({'ok': True, 'user': request.user.pk, **out}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_latest_location(request, user_id: int):
    # 本人和同家庭才可查訊
    if request.user.pk == user_id:
        target = request.user
    else:
        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': '使用者不存在'}, status=status.HTTP_404_NOT_FOUND)
        if not getattr(target, 'is_elder', False):
            return Response({'error': '不是長者帳號'}, status=status.HTTP_400_BAD_REQUEST)
        if not _same_family(request.user, target):
            return Response({'error': '無權存取'}, status=status.HTTP_403_FORBIDDEN)

    rec = (LocaRecord.objects
           .filter(UserID=target)
           .order_by('-Timestamp')
           .only('Latitude', 'Longitude', 'Timestamp')
           .first()) #取第一筆資料
    if not rec:
        return Response({'error': '尚未最新定位'}, status=status.HTTP_404_NOT_FOUND)

    out = LocationLatestSerializer(rec).data
    return Response({'ok': True, 'user': target.pk, **out}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_family_locations(request, family_id: int):
    # 僅可查詢自己的家庭
    if request.user.FamilyID_id is None:
        return Response({'error': '尚未加入任何家庭'}, status=status.HTTP_400_BAD_REQUEST)
    if request.user.FamilyID_id != family_id:
        return Response({'error': '無權存取'}, status=status.HTTP_403_FORBIDDEN)

    latest_qs = (LocaRecord.objects
                 .filter(UserID_id=OuterRef('pk'))
                 .order_by('-Timestamp'))

    elders = (User.objects
              .filter(FamilyID_id=family_id, is_elder=True)
              .annotate(
                  last_time=Subquery(latest_qs.values('Timestamp')[:1]),
                  last_lat =Subquery(latest_qs.values('Latitude')[:1]),
                  last_lon =Subquery(latest_qs.values('Longitude')[:1]),
              )
              .filter(last_time__isnull=False)
              .values('UserID', 'Name', 'Phone', 'last_lat', 'last_lon', 'last_time'))
    #將查詢結果轉成 JSON 格式
    results = [{
        'user': e['UserID'],
        'name': e['Name'] or e['Phone'],
        'lat': float(e['last_lat']),
        'lon': float(e['last_lon']),
        'ts': e['last_time'],
    } for e in elders]

    return Response({'ok': True, 'family_id': family_id, 'count': len(results), 'results': results},
                    status=status.HTTP_200_OK)

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests, functools
from rest_framework.permissions import AllowAny


@functools.lru_cache(maxsize=2048)
def _google_reverse(lat, lng, lang):
    r = requests.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        params={"latlng": f"{lat},{lng}", "language": lang, "key": settings.GOOGLE_MAPS_KEY},
        timeout=8,
    )
    j = r.json()
    print('Google Geocode API 回傳 status:', j.get("status"))  # 可看API錯誤訊息
    print('實際查詢 lat/lng:', lat, lng)


    if j.get("status") == "OK" and j.get("results"):
        first = j["results"][0]
        return first.get("formatted_address")  # 取第一筆地址

    return None


@api_view(["GET"])
@permission_classes([AllowAny])
def reverse_geocode(request):
    lat = request.GET.get("lat")
    lng = request.GET.get("lng")
    lang = request.GET.get("lang", "zh-TW")
    if not (lat and lng):
        return Response({"error": "lat/lng required"}, status=400)
    addr = _google_reverse(str(lat), str(lng), lang)
    return Response({"address": addr})  # 取第一筆地址


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.timezone import now, timedelta
from .serializers import LocationHistorySerializer  


#過去24小時內定位資料
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def location_history(request, elder_id):
    try:
        hours = int(request.query_params.get('hours', 24))
        time_threshold = now() - timedelta(hours=hours)

        # 驗證使用者存在 & 是長者 & 同家庭
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = request.user

        try:
            elder = User.objects.get(pk=elder_id)
        except User.DoesNotExist:
            return Response({'error': '使用者不存在'}, status=404)

        if not getattr(elder, 'is_elder', False):
            return Response({'error': '不是長者帳號'}, status=400)

        if not _same_family(user, elder):
            return Response({'error': '無權存取'}, status=403)

        # 查詢歷史資料
        queryset = LocaRecord.objects.filter(
            UserID=elder,
            Timestamp__gte=time_threshold
        ).order_by('Timestamp')

        serializer = LocationHistorySerializer(queryset, many=True)
        return Response(serializer.data)

    except Exception as e:
        return Response({'error': str(e)}, status=400)
