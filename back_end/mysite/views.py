from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from google.cloud import vision
from config import OPENAI_API_KEY, GOOGLE_VISION_CREDENTIALS
import openai
from rest_framework.permissions import IsAuthenticated
#----------------------------------------------------------------
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
    
from rest_framework.response import Response
from rest_framework import status

class DeletePrescriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, prescription_id):
        user = request.user
        deleted_count, _ = Med.objects.filter(UserID=user, PrescriptionID=prescription_id).delete()
        return Response({'message': '已刪除', 'deleted_count': deleted_count}, status=status.HTTP_200_OK)


#----------------------------------------------------------------
#ocr
@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, world!(你好世界)"})

from .models import Med
import re
from django.utils import timezone
import uuid

openai.api_key = OPENAI_API_KEY

class OcrAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print("目前登入的使用者是：", request.user)  # 測試用
        image_file = request.FILES.get('image')
        user = request.user if request.user.is_authenticated else User.objects.first()

        if not image_file:
            return Response({'error': '沒有收到圖片'}, status=400)

        try:
            # 1. OCR 圖像辨識
            vision_client = vision.ImageAnnotatorClient.from_service_account_info(GOOGLE_VISION_CREDENTIALS)
            content = image_file.read()
            image = vision.Image(content=content)
            response = vision_client.text_detection(image=image)
            annotations = response.text_annotations

            if not annotations:
                return Response({'text': [], 'analysis': '辨識不到任何文字'})

            ocr_text = annotations[0].description.strip()

            # 2. 丟給 GPT 分析
            ai_result = self.analyze_text_with_openai(ocr_text)

            # 3. 解析 GPT 結果為結構化資料
            parsed_data = self.parse_gpt_analysis(ai_result)

            # 4. 存入資料庫
            self.save_to_database(user, parsed_data)

            return Response({
                'text': ocr_text,
                'analysis': ai_result
            })

        except Exception as e:
            print('錯誤:', e)
            return Response({'error': str(e)}, status=500)

    def analyze_text_with_openai(self, ocr_text):
        prompt = f"""
以下是病人藥袋上的藥品資訊 OCR 辨識結果：

{ocr_text}

請根據內容幫我判斷並列出以下資訊（若無法判斷可填「無法判斷」）：
1. 病人可能患有的疾病名稱（如高血壓、糖尿病等）
2. 藥品名稱（可列出多個）
3. 每一種藥品的用途或備註（例如這是降血壓藥、消炎藥、止痛藥等）
4. 每一種藥品的服用方式（例如一天三次、早晚飯後、睡前等）

請用以下格式回覆：
疾病名稱：
- 疾病A
- 疾病B

藥品清單：
- 藥品名稱：藥A
  - 備註：用途
  - 吃藥時間：早晚飯後
- 藥品名稱：藥B
  - 備註：用途
  - 吃藥時間：每日一次早上
"""

        try:
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "你是超級無敵專業藥劑師"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"AI 分析錯誤: {str(e)}"

    def parse_gpt_analysis(self, gpt_text):
        result = []

        # 擷取疾病名稱
        disease_match = re.search(r'疾病名稱：\n((?:- .+\n)+)', gpt_text)
        diseases = []
        if disease_match:
            diseases = [line.strip('- ').strip() for line in disease_match.group(1).split('\n') if line]

        # 擷取藥品清單
        med_blocks = re.findall(
            r'- 藥品名稱：(.+?)\n\s*- 備註：(.+?)\n\s*- 吃藥時間：(.+?)\n?', gpt_text
        )

        for disease in diseases:
            for med_name, med_note, med_time in med_blocks:
                result.append({
                    "disease": disease,
                    "med_name": med_name.strip(),
                    "med_note": med_note.strip(),
                    "med_time": med_time.strip()
                })

        return result

    def save_to_database(self, user, parsed_data):
        prescription_id = uuid.uuid4()
        for item in parsed_data:
            Med.objects.create(
                UserID=user,
                Disease=item["disease"][:10],
                MedName=item["med_name"][:10],
                MedNote=item["med_note"][:50],
                MedTime=timezone.now(),  # 這裡可根據 med_time 字串做額外解析
                PrescriptionID=prescription_id
            )
            print("完成")

# class OcrAPIViewblood(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         print("目前登入的使用者是：", request.user)  # 測試用
#         image_file = request.FILES.get('image')
#         user = request.user if request.user.is_authenticated else User.objects.first()

#         if not image_file:
#             return Response({'error': '沒有收到圖片'}, status=400)

#         try:
#             # 1. OCR 圖像辨識
#             vision_client = vision.ImageAnnotatorClient.from_service_account_info(GOOGLE_VISION_CREDENTIALS)
#             content = image_file.read()
#             image = vision.Image(content=content)
#             response = vision_client.text_detection(image=image)
#             annotations = response.text_annotations

#             if not annotations:
#                 return Response({'text': [], 'analysis': '辨識不到任何文字'})

#             ocr_text = annotations[0].description.strip()
#             print('📄 OCR Text:', ocr_text)
#             # 2. 丟給 GPT 分析
#             ai_result = self.analyze_text_with_openai(ocr_text)
#             print("🤖 AI 回覆：", ai_result)
#             # 3. 解析 GPT 結果為結構化資料
#             parsed_data = self.parse_gpt_analysis(ai_result)
#             print('📊 Parsed Data:', parsed_data)
#             # 4. 存入資料庫
#             self.save_to_database(user, parsed_data)

#             return Response({'message': '資料已成功儲存'}, status=201)
#             #回傳給前端
#             # return Response({
#             #     'text': ocr_text,
#             #     'analysis': parsed_data
#             # })

#         except Exception as e:
#             print('錯誤:', e)
#             return Response({'error': str(e)}, status=500)
        
#     def analyze_text_with_openai(self, ocr_text):
#         prompt = f"""
#     以下是血壓機照片的 OCR 辨識文字結果：

#     {ocr_text}

#     請根據內容幫我判斷以下數值（若無法判斷請填「None」）：
#     1. 收縮壓（SYS / Systolic）：數字
#     2. 舒張壓（DIA / Diastolic）：數字
#     3. 脈搏（PULSE）：數字

#     請用以下格式回覆：
#     收縮壓：xxx
#     舒張壓：xxx
#     脈搏：xxx
#     """
#         try:
#             response = openai.chat.completions.create(
#                 model="gpt-3.5-turbo",
#                 messages=[
#                     {"role": "system", "content": "你是一位善於從雜亂圖片中提取血壓資訊的 AI 健康助理。"},
#                     {"role": "user", "content": prompt}
#                 ],
#                 temperature=0.3,
#             )
#             return response.choices[0].message.content
#         except Exception as e:
#             return f"GPT 分析錯誤: {str(e)}"

#     def parse_gpt_analysis(self, gpt_text):
#         import re

#         systolic = re.search(r'收縮壓：(\d+)', gpt_text)
#         diastolic = re.search(r'舒張壓：(\d+)', gpt_text)
#         pulse = re.search(r'脈搏：(\d+)', gpt_text)

#         return {
#             'systolic': int(systolic.group(1)) if systolic else None,
#             'diastolic': int(diastolic.group(1)) if diastolic else None,
#             'pulse': int(pulse.group(1)) if pulse else None,
#         }
    
#     def save_to_database(self, user, parsed_data):
#         from .models import HealthCare  
#         from django.utils import timezone

#         # 沒有任何一個值就不要寫入
#         if not all([parsed_data['systolic'], parsed_data['diastolic'], parsed_data['pulse']]):
#             print('⚠️ 資料不完整，不寫入：', parsed_data)
#             return  # 直接退出
        
#         HealthCare.objects.create(
#             UserID=user,
#             Systolic=parsed_data['systolic'],
#             Diastolic=parsed_data['diastolic'],
#             Pulse=parsed_data['pulse'],
#             Numsteps='0',  # 如果你還沒做步數可以先填預設
#             Date=timezone.now(),  # 或不寫也行，已經有 default
#         )

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
