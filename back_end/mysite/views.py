from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserRegisterSerializer

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
