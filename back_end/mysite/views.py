from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
import os

@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, world!(你好世界)"})

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from google.cloud import vision

import os
import openai
openai.api_key = os.getenv("OPENAI_API_KEY")

class OcrAPIView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        image_file = request.FILES.get('image')

        if not image_file:
            return Response({'error': '沒有收到圖片'}, status=400)

        try:
            # OCR 辨識
            vision_client = vision.ImageAnnotatorClient()
            content = image_file.read()
            image = vision.Image(content=content)
            response = vision_client.text_detection(image=image)
            annotations = response.text_annotations

            if not annotations:
                return Response({'text': [], 'analysis': '辨識不到任何文字'})

            text_lines = annotations[0].description.strip().split('\n')
            ocr_text = "\n".join(text_lines)

            # 丟給 AI 分析
            ai_result = self.analyze_text_with_openai(ocr_text)

            return Response({
                'text': text_lines,
                'analysis': ai_result
            })

        except Exception as e:
            print('錯誤:', e)
            return Response({'error': str(e)}, status=500)

    # 這裡加 self！
    def analyze_text_with_openai(self, ocr_text):
        prompt = f"以下是病人藥袋上的藥品：\n{ocr_text}\n\n請直接列出病人可能患有的疾病名稱，根據藥單內容列出疾病名稱、藥物名稱、使用方式。若無法判斷請回答「無法確定」。"

        try:
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "你是超級無敵專業藥劑師。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"AI 分析錯誤: {str(e)}"
        
# Create your views here.
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserRegisterSerializer
from django.contrib.auth import authenticate
from .models import User  # 你的自訂 User 模型
from rest_framework_simplejwt.tokens import RefreshToken

@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, world!(你好世界)"})


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
