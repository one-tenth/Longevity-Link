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
    print(f"Request data: {request.data}")  # 確認前端送來的資料格式
    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        print(user)  # 確認成功建立的 user 物件
        return Response({"message": "註冊成功"}, status=status.HTTP_201_CREATED)
    print(serializer.errors)  # 印出錯誤訊息方便除錯
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)