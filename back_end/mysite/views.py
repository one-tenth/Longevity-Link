from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import *




#一開始測試
@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, world!(你好世界)"})

#先創建家庭
class CreateFamilyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fcode       = request.data.get('Fcode')
        family_name = request.data.get('FamilyName')
        errors = {}
        if not fcode:
            errors['Fcode'] = ['家庭代碼欄為必填。']
        if not family_name:
            errors['FamilyName'] = ['家庭名稱欄為必填。']
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        #家庭代碼不可重複
        if Family.objects.filter(Fcode=fcode).exists():
            return Response(
                {'Fcode': ['此代碼已被使用，請換一個。']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 建立家庭
        family = Family.objects.create(
            Fcode=fcode,
            FamilyName=family_name
        )

        # 把目前使用者加入此家庭
        user = request.user
        user.FamilyID = family
        user.save()

        return Response({
            'detail':       f'已建立家庭「{family.FamilyName}」並加入',
            'FamilyID':     family.FamilyID,
            'Fcode':        family.Fcode,
            'FamilyName':   family.FamilyName,
            'Created_Time': family.Created_Time,
        }, status=status.HTTP_201_CREATED)

#使用者加入家庭
class JoinFamilyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fcode = request.data.get('Fcode')
        if not fcode:
            return Response(
                {'Fcode': ['輸入家庭代碼。']},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            family = Family.objects.get(Fcode=fcode)
        except Family.DoesNotExist:
            return Response(
                {'detail': '無效的家庭代碼。'},
                status=status.HTTP_404_NOT_FOUND
            )


        user = request.user
        user.FamilyID = family
        user.save()

        return Response(
            {'detail': f'已成功加入家庭「{family.FamilyName}」。'},
            status=status.HTTP_200_OK
        )
