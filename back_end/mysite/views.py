from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, permissions
from .serializers import *
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import *
from rest_framework.permissions import IsAuthenticated


@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, world!(你好世界)"})


# 創建家庭
class CreateFamilyAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = FamilySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 加入家庭
class JoinFamilyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fcode = request.data.get('Fcode')
        if not fcode:
            return Response({"error": "家庭代碼必須提供"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            family = Family.objects.get(Fcode=fcode)
        except Family.DoesNotExist:
            return Response({"error": "無效的家庭代碼"}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        user.FamilyID = family
        user.save()

        return Response({"message": f"成功加入家庭：{family.FamilyName}"}, status=status.HTTP_200_OK)