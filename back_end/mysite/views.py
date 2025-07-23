from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from google.cloud import vision
from config import OPENAI_API_KEY, GOOGLE_VISION_CREDENTIALS
import openai
from rest_framework.permissions import IsAuthenticated
#----------------------------------------------------------------
# 血壓功能
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from django.core.files.storage import default_storage
import os
import uuid
from datetime import datetime
from ocr_modules.bp_ocr_yolo import run_yolo_ocr
from .models import HealthCare
from django.utils import timezone  # ✅ 加上這行才有 timezone.localtime


class BloodOCRView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        print("🔐 目前登入的使用者：", request.user)

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({"error": "未收到圖片"}, status=400)

        # 暫存圖片
        filename = f"temp_{uuid.uuid4()}.jpg"
        file_path = os.path.join('temp', filename)
        full_path = default_storage.save(file_path, image_file)

        try:
            # 🧠 執行 YOLO + OCR 辨識
            result = run_yolo_ocr(default_storage.path(full_path))

            def safe_int(val):
                try:
                    return int(val)
                except:
                    return None

            systolic = safe_int(result.get('systolic'))
            diastolic = safe_int(result.get('diastolic'))
            pulse = safe_int(result.get('pulse'))

            if systolic is None or diastolic is None or pulse is None:
                return Response({"error": "OCR 辨識失敗，請再試一次"}, status=400)

            if not (70 <= systolic <= 250 and 40 <= diastolic <= 150 and 30 <= pulse <= 200):
                return Response({"error": "數值異常，請確認圖片品質"}, status=400)

            # 💾 儲存資料，時間轉為當地時間再存（會自動轉為 UTC 存入 DB）
            local_now = timezone.localtime(timezone.now())
            print("🕒 實際儲存時間（Asia/Taipei）:", local_now)

            HealthCare.objects.create(
                UserID=request.user,
                Systolic=systolic,
                Diastolic=diastolic,
                Pulse=pulse,
                Date=local_now  # timezone-aware datetime
            )

            return Response({
                "message": "分析完成",
                "data": {
                    "systolic": systolic,
                    "diastolic": diastolic,
                    "pulse": pulse
                }
            })

        finally:
            default_storage.delete(full_path)  # 清除暫存圖片

#查血壓
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import get_current_timezone
from datetime import datetime, time, timezone as dt_timezone # ✅ 要用 datetime 的 timezone
from .models import HealthCare

class HealthCareByDateAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        date_str = request.query_params.get('date')  # 格式應為 yyyy-mm-dd

        if not date_str:
            return Response({'error': '缺少日期參數'}, status=400)

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': '日期格式錯誤，應為 YYYY-MM-DD'}, status=400)

        # 🔧 正確的 timezone 處理
        tz = get_current_timezone()
        start = datetime.combine(target_date, time.min).replace(tzinfo=tz).astimezone(dt_timezone.utc)
        end = datetime.combine(target_date, time.max).replace(tzinfo=tz).astimezone(dt_timezone.utc)

        record = HealthCare.objects.filter(
            UserID=user,
            Date__range=(start, end)
        ).order_by('-Date').first()

        if record:
            return Response({
                'systolic': record.Systolic,
                'diastolic': record.Diastolic,
                'pulse': record.Pulse,
                'datetime': record.Date,
            })
        else:
            return Response({'message': '當日無血壓資料'}, status=404)


#----------------------------------------------------------------
#藥單
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Med
from django.utils import timezone
import openai
import json
import uuid
from google.cloud import vision
from google.oauth2 import service_account
from django.conf import settings
from config import GOOGLE_VISION_CREDENTIALS, OPENAI_API_KEY

# 設定 OpenAI API 金鑰
openai.api_key = OPENAI_API_KEY


class OcrAnalyzeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print("目前登入的使用者是：", request.user)
        print("收到的檔案列表：", request.FILES)

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': '沒有收到圖片'}, status=400)

        try:
            # 1️⃣ OCR 圖片辨識
            client = vision.ImageAnnotatorClient.from_service_account_info(GOOGLE_VISION_CREDENTIALS)
            image = vision.Image(content=image_file.read())
            response = client.text_detection(image=image)
            annotations = response.text_annotations

            if not annotations:
                return Response({'error': '無法辨識文字'}, status=400)

            ocr_text = annotations[0].description.strip()
            print("🔍 OCR 結果：", ocr_text)

            # 2️⃣ GPT 分析藥品資訊
            gpt_result = self.analyze_with_gpt(ocr_text)

            try:
                parsed = json.loads(gpt_result)
            except json.JSONDecodeError:
                print("❌ GPT 原始回傳：", gpt_result)  # ⬅️ 新增這行
                return Response({'error': 'GPT 回傳非有效 JSON', 'raw': gpt_result}, status=400)



            # 3️⃣ 存入資料庫（先準備要新增的清單）
#--------------------------------------------------------------------------------------------------------
            prescription_id = uuid.uuid4()
            # 計數與判斷重複標記
            count = 0
            all_duplicate = True  # 預設全部都重複

            for disease in parsed.get("diseaseNames", []):
                for med in parsed.get("medications", []):
                    med_name = med.get("medicationName", "未知")[:50]
                    dosage = med.get("dosageFrequency", "未知")[:50]
                    route = med.get("administrationRoute", "未知")[:10]

                    is_duplicate = Med.objects.filter(
                        UserID=request.user,
                        MedName=med_name,
                        DosageFrequency=dosage,
                        AdministrationRoute=route
                    ).exists()

                    if not is_duplicate:
                        Med.objects.create(
                            UserID=request.user,
                            Disease=disease[:50],
                            MedName=med_name,
                            AdministrationRoute=route,
                            DosageFrequency=dosage,
                            Effect=med.get("effect", "未知")[:100],
                            SideEffect=med.get("sideEffect", "未知")[:100],
                            PrescriptionID=prescription_id
                        )
                        count += 1
                        all_duplicate = False  # 有新增就代表不是全部重複

            # 回傳訊息
            if all_duplicate:
                return Response({
                    'message': '🟡 此藥單內容已完全上傳過，未寫入資料庫',
                    'duplicate': True,
                    'created_count': 0
                })
            else:
                return Response({
                    'message': f'✅ 成功寫入 {count} 筆藥單資料',
                    'duplicate': False,
                    'created_count': count,
                    'prescription_id': str(prescription_id)
                })
#-----------------------------------------------------------------------------------------------
        except Exception as e:
            print("❌ 例外錯誤：", e)
            return Response({'error': str(e)}, status=500)

    def analyze_with_gpt(self, ocr_text):
        prompt = f"""
以下是病人藥袋上的藥品資訊 OCR 辨識結果：

{ocr_text}

請你依照 OCR 內容進行分析，並以 JSON 格式回傳以下資訊（若無法判斷請填寫 "未知"）：

1. 病人可能患有的疾病名稱（diseaseNames）：為一個字串陣列，例如 ["高血壓", "糖尿病"]。
2. 所有藥品的詳細資訊（medications）：每一筆藥品資料需包含以下欄位：
  - medicationName：藥物名稱
  - administrationRoute：給藥方式（請填寫「內服」或「外用」）
  - dosageFrequency：服用頻率（如「一天三次」、「早晚飯後」）
  - effect：作用（如「抗過敏」、「止痛」）
  - sideEffect：副作用（如「精神不濟」、「無明顯副作用」）

請以以下 JSON 格式回覆，格式範例如下：

{{
  "diseaseNames": ["高血壓", "糖尿病"],
  "medications": [
    {{
      "medicationName": "藥品A",
      "administrationRoute": "內服",
      "dosageFrequency": "一天三次",
      "effect": "抗過敏",
      "sideEffect": "可能頭暈"
    }},
    {{
      "medicationName": "藥品B",
      "administrationRoute": "外用",
      "dosageFrequency": "一天兩次",
      "effect": "消炎止癢",
      "sideEffect": "無明顯副作用"
    }}
  ]
}}

⚠️ 請注意：
- **務必只輸出 JSON 結構，不要加任何解釋或多餘文字。**
- 所有欄位都要出現，若無資料請填寫 "未知"。
"""

        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "你是超級無敵專業藥劑師"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        # 🔧 去除 markdown 格式的包裝
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:]  # 移除 ```json\n
        if content.endswith("```"):
            content = content[:-3]  # 移除 \n```

        return content.strip()

#藥單查詢
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Med
from .serializers import MedNameSerializer

class MedNameListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user_id = request.user
        if not user_id:
            return Response({'error': '缺少 user_id'}, status=400)

        queryset = Med.objects.filter(UserID=user_id)
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
        user = request.user
        deleted_count, _ = Med.objects.filter(UserID=user, PrescriptionID=prescription_id).delete()
        return Response({'message': '已刪除', 'deleted_count': deleted_count}, status=status.HTTP_200_OK)
#----------------------------------------------------------------
#健康
#新增步數
from django.utils.timezone import is_naive, make_aware
from datetime import datetime, time
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import FitData

class FitDataAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        steps = request.data.get('steps')
        timestamp_str = request.data.get('timestamp')

        if steps is None or not timestamp_str:
            return Response({'error': '缺少步數或時間'}, status=400)

        timestamp = datetime.fromisoformat(timestamp_str)
        if is_naive(timestamp):
            timestamp = make_aware(timestamp)

        # ✅ 改成以當日範圍查詢（最穩定）
        start_of_day = timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = timestamp.replace(hour=23, minute=59, second=59, microsecond=999999)

        existing = FitData.objects.filter(
            UserID=user,
            timestamp__range=(start_of_day, end_of_day)
        ).first()

        if existing:
            if existing.steps != steps:
                existing.steps = steps
                existing.timestamp = timestamp
                existing.save()
                return Response({'message': '✅ 同日已有資料，步數已更新'})
            else:
                return Response({'message': '🟡 同日步數相同，未更新'})
        else:
            FitData.objects.create(UserID=user, steps=steps, timestamp=timestamp)
            return Response({'message': '✅ 新增成功'})

#查詢步數
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import make_aware
from datetime import datetime, time
from .models import FitData

class FitDataByDateAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        date_str = request.query_params.get('date')  # 期待格式為 YYYY-MM-DD

        if not date_str:
            return Response({'error': '缺少日期參數'}, status=400)

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': '日期格式錯誤，應為 YYYY-MM-DD'}, status=400)

        start = make_aware(datetime.combine(target_date, time.min))
        end = make_aware(datetime.combine(target_date, time.max))

        record = FitData.objects.filter(UserID=user, timestamp__range=(start, end)).order_by('-timestamp').first()

        if record:
            return Response({
                'steps': record.steps,
                'timestamp': record.timestamp,
            })
        else:
            return Response({'message': '當日無步數資料'}, status=404)

#----------------------------------------------------------------
@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, world!(你好世界)"})
#---------------------------------------------------------------------------------------


# Create your views here.
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserRegisterSerializer
from django.contrib.auth import authenticate
from .models import User  # 你的自訂 User 模型
from rest_framework_simplejwt.tokens import RefreshToken


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    serializer = UserRegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()  # 不要自己額外傳參數，全部由 serializer.create 處理

        user_serializer = UserRegisterSerializer(user)
        return Response(user_serializer.data, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    Phone = request.data.get('Phone')
    password = request.data.get('password')

    # 檢查是否有輸入 Phone 與 password
    if not Phone or not password:
        return Response({"message": "請提供帳號與密碼"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(Phone=Phone)
    except User.DoesNotExist:
        return Response({"message": "帳號不存在"}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(password):
        return Response({"message": "密碼錯誤"}, status=status.HTTP_400_BAD_REQUEST)

    # 產生 JWT token
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
        }
    }, status=status.HTTP_200_OK)
