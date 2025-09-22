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
            # ✅ 模擬 YOLO + OCR 假資料
            result = {
                "systolic": 120,
                "diastolic": 80,
                "pulse": 72,
            }

            systolic = result["systolic"]
            diastolic = result["diastolic"]
            pulse = result["pulse"]

            # 💾 儲存資料，時間轉為當地時間再存（會自動轉為 UTC 存入 DB）
            local_now = timezone.localtime(timezone.now())
            print("🕒 實際儲存時間（Asia/Taipei）:", local_now)

            HealthCare.objects.create(
                UserID=request.user,
                Systolic=systolic,
                Diastolic=diastolic,
                Pulse=pulse,
                Date=local_now
            )

            return Response({
                "message": "✅ 模擬分析完成",
                "data": {
                    "systolic": systolic,
                    "diastolic": diastolic,
                    "pulse": pulse
                }
            })

        finally:
            default_storage.delete(full_path)  # 清除暫存圖片

# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework.permissions import IsAuthenticated
# from rest_framework.parsers import MultiPartParser
# from django.core.files.storage import default_storage
# import os
# import uuid
# from datetime import datetime
# from ocr_modules.bp_ocr_yolo import run_yolo_ocr
# from .models import HealthCare
# from django.utils import timezone  # ✅ 加上這行才有 timezone.localtime


# class BloodOCRView(APIView):
#     permission_classes = [IsAuthenticated]
#     parser_classes = [MultiPartParser]

#     def post(self, request):
#         print("🔐 目前登入的使用者：", request.user)

#         image_file = request.FILES.get('image')
#         if not image_file:
#             return Response({"error": "未收到圖片"}, status=400)

#         # 暫存圖片
#         filename = f"temp_{uuid.uuid4()}.jpg"
#         file_path = os.path.join('temp', filename)
#         full_path = default_storage.save(file_path, image_file)

#         try:
#             # 🧠 執行 YOLO + OCR 辨識
#             result = run_yolo_ocr(default_storage.path(full_path))

#             def safe_int(val):
#                 try:
#                     return int(val)
#                 except:
#                     return None

#             systolic = safe_int(result.get('systolic'))
#             diastolic = safe_int(result.get('diastolic'))
#             pulse = safe_int(result.get('pulse'))

#             if systolic is None or diastolic is None or pulse is None:
#                 return Response({"error": "OCR 辨識失敗，請再試一次"}, status=400)

#             if not (70 <= systolic <= 250 and 40 <= diastolic <= 150 and 30 <= pulse <= 200):
#                 return Response({"error": "數值異常，請確認圖片品質"}, status=400)

#             # 💾 儲存資料，時間轉為當地時間再存（會自動轉為 UTC 存入 DB）
#             local_now = timezone.localtime(timezone.now())
#             print("🕒 實際儲存時間（Asia/Taipei）:", local_now)

#             HealthCare.objects.create(
#                 UserID=request.user,
#                 Systolic=systolic,
#                 Diastolic=diastolic,
#                 Pulse=pulse,
#                 Date=local_now  # timezone-aware datetime
#             )

#             return Response({
#                 "message": "分析完成",
#                 "data": {
#                     "systolic": systolic,
#                     "diastolic": diastolic,
#                     "pulse": pulse
#                 }
#             })

#         finally:
#             default_storage.delete(full_path)  # 清除暫存圖片

#查血壓
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import get_current_timezone
from datetime import datetime, time, timezone as dt_timezone
from .models import HealthCare
from mysite.models import User  # ✅ 根據你的 User 模型位置修改

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

        # 🔧 時區處理
        tz = get_current_timezone()
        start = datetime.combine(target_date, time.min).replace(tzinfo=tz).astimezone(dt_timezone.utc)
        end = datetime.combine(target_date, time.max).replace(tzinfo=tz).astimezone(dt_timezone.utc)

        # ✅ 支援 user_id 查詢其他成員
        if user_id:
            try:
                user_id = int(user_id)
                target_user = User.objects.get(UserID=user_id)  # ✅ 用 UserID
            except (ValueError, TypeError):
                return Response({'error': 'user_id 格式錯誤'}, status=400)
            except User.DoesNotExist:
                return Response({'error': '查無此使用者'}, status=404)
        else:
            target_user = user

        # 🔍 查詢資料
        record = HealthCare.objects.filter(
            UserID=target_user,
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
            print("🔍 gpt 結果：", gpt_result)
            try:
                parsed = json.loads(gpt_result)
            except json.JSONDecodeError:
                print("❌ GPT 原始回傳：", gpt_result)  # ⬅️ 新增這行
                return Response({'error': 'GPT 回傳非有效 JSON', 'raw': gpt_result}, status=400)

            # 3️⃣ 判斷是否有指定 user_id，否則預設為 request.user
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    from mysite.models import User  # ⚠️ 根據你的 User 模型路徑
                    target_user = User.objects.get(UserID=int(user_id))
                except (User.DoesNotExist, ValueError):
                    return Response({'error': '查無此使用者'}, status=404)
            else:
                target_user = request.user

            # 4️⃣ 存入資料庫（先準備要新增的清單）
            prescription_id = uuid.uuid4()
            count = 0

            disease = parsed.get("diseaseNames", ["未知"])[0]  # 避免空陣列錯誤
            for med in parsed.get("medications", []):
                Med.objects.create(
                    UserID=target_user,
                    Disease=disease[:50],
                    MedName=med.get("medicationName", "未知")[:50],
                    AdministrationRoute=med.get("administrationRoute", "未知")[:10],
                    DosageFrequency=med.get("dosageFrequency", "未知")[:50],
                    Effect=med.get("effect", "未知")[:100],
                    SideEffect=med.get("sideEffect", "未知")[:100],
                    PrescriptionID=prescription_id
                )
                count += 1

            # 回傳訊息
            return Response({
                'message': f'✅ 成功寫入 {count} 筆藥單資料',
                'duplicate': False,
                'created_count': count,
                'prescription_id': str(prescription_id)
            })

        except Exception as e:
            print("❌ 例外錯誤：", e)
            return Response({'error': str(e)}, status=500)

    def analyze_with_gpt(self, ocr_text):
        prompt = f"""
        你是一個藥物資料結構化助理，請從以下 OCR 辨識出的藥袋文字中，萃取藥品資訊並輸出乾淨 JSON 格式資料。

        ⬇️ OCR 內容如下：
        {ocr_text}

        📌 請輸出以下 JSON 格式（請根據上下文**合理推論**，只有在**完全無線索**的情況下才填寫 "未知"）  

        ```json
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
        ⚠️ 請注意以下規則：

        1.只輸出純 JSON 區塊，不要加註解、說明或其他文字

        2.medications 每一筆資料都要有以下五個欄位：

            medicationName

            administrationRoute

            dosageFrequency

            effect

            sideEffect

        3.dosageFrequency 欄位只能是以下四種之一（若不確定請填 "未知"）：

            一天一次

            一天兩次

            一天三次

            睡前

        4.diseaseNames 必須為一個字串陣列
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



from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import MedTimeSetting
from .serializers import MedTimeSettingSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_med_time_setting(request):
    try:
        setting = MedTimeSetting.objects.get(UserID=request.user)
        serializer = MedTimeSettingSerializer(setting)
        return Response(serializer.data)
    except MedTimeSetting.DoesNotExist:
        return Response({'detail': '尚未設定時間'}, status=404)


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
from mysite.models import User  # ⚠️ 修改為你實際的 User 模型位置

class FitDataByDateAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        date_str = request.query_params.get('date')  # YYYY-MM-DD
        user_id = request.query_params.get('user_id')  # 前端傳入的

        if not date_str:
            return Response({'error': '缺少日期參數'}, status=400)

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': '日期格式錯誤，應為 YYYY-MM-DD'}, status=400)

        start = make_aware(datetime.combine(target_date, time.min))
        end = make_aware(datetime.combine(target_date, time.max))

        # 🔍 若有 user_id 就查指定長者，否則查登入者
        if user_id:
            try:
                user_id = int(user_id)
                target_user = User.objects.get(UserID=user_id)
            except (ValueError, TypeError):
                return Response({'error': 'user_id 需為整數'}, status=400)
            except User.DoesNotExist:
                return Response({'error': '查無此使用者'}, status=404)
        else:
            target_user = request.user

        record = FitData.objects.filter(UserID=target_user, timestamp__range=(start, end)).order_by('-timestamp').first()

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

def _resolve_target_user_id(request):
    """
    解析本次操作的老人 UserID：
    - 老人登入：就是自己
    - 家人登入：優先讀 ?user_id= 或 body 的 elder_id/user_id，
      並檢查是否同家庭（或老人.RelatedID == 自己）才放行
    """
    me = request.user

    # 1) 老人登入：直接回自己
    if getattr(me, 'is_elder', False):
        return getattr(me, 'UserID', None) or getattr(me, 'pk', None)

    # 2) 家人登入：從參數拿 user_id / elder_id
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

    elder = get_object_or_404(User, UserID=uid)

    # 授權檢查（擇一或都檢）：
    # A) 同家庭
    same_family = (getattr(elder, 'FamilyID_id', None) and
                   getattr(me, 'FamilyID_id', None) and
                   elder.FamilyID_id == me.FamilyID_id)

    # B) 老人的 RelatedID 指向自己（你建立長者時就這樣設）
    related_to_me = (getattr(elder, 'RelatedID_id', None) == getattr(me, 'UserID', None))

    if same_family or related_to_me:
        return uid

    return None


# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Hos
from .serializers import HosSerializer

def _resolve_target_user_id(request):
    """解析目標 elder user_id：家人端必帶 ?user_id，長者端預設用 request.user.id"""
    q = request.query_params.get("user_id")
    if q:
        try:
            return int(q)
        except ValueError:
            return None
    return request.user.id

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hospital_list(request):
    target_id = _resolve_target_user_id(request)
    if not target_id:
        return Response({"error": "沒有指定老人"}, status=400)

    try:
        # 嘗試 ForeignKey(User) 寫法
        qs = Hos.objects.filter(UserID_id=target_id).order_by('-ClinicDate')
        if not qs.exists():
            # 若沒有 → 改用 IntegerField 寫法
            qs = Hos.objects.filter(UserID=target_id).order_by('-ClinicDate')
    except Exception:
        # 模型若沒有 UserID_id 這個屬性，直接 fallback 為 IntegerField
        qs = Hos.objects.filter(UserID=target_id).order_by('-ClinicDate')

    ser = HosSerializer(qs, many=True)
    return Response(ser.data)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hospital_create(request):
    """
    新增看診紀錄：
    - 老人：自己
    - 家人：必須帶 elder_id/user_id 指定長者
    """
    target_id = _resolve_target_user_id(request)
    if not target_id:
        return Response({"error": "沒有指定老人"}, status=400)

    data = request.data.copy()

    # 日期只留 YYYY-MM-DD（若是 DateField）
    if 'ClinicDate' in data and isinstance(data['ClinicDate'], str) and ' ' in data['ClinicDate']:
        data['ClinicDate'] = data['ClinicDate'].split(' ')[0]

    from .serializers import HosSerializer
    ser = HosSerializer(data=data)
    if ser.is_valid():
        ser.save(UserID_id=target_id)  # ✅ 明確綁定老人
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
