from django.shortcuts import render

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
def register_user(request):
    print("Raw request.data:", request.data)  # 印出原始請求資料
    serializer = UserRegisterSerializer(data=request.data)

    if serializer.is_valid():
        print("Serializer valid. Validated data:", serializer.validated_data)  # 印出驗證過的資料
        user = serializer.save()

        # 使用 User 序列化器返回用戶資料，包括 Name, Phone, Gender, Borndate
        user_serializer = UserRegisterSerializer(user)
        return Response(user_serializer.data, status=status.HTTP_201_CREATED)
    else:
        print("Serializer errors:", serializer.errors)  # 若驗證失敗，印出錯誤
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    Phone = request.data.get('Phone')
    password = request.data.get('password')

    print("收到登入請求:", request.data)  # 🔍 偵錯用

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
