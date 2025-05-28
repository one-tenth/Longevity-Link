#定義前端與後端交換資料的格式
from rest_framework import serializers
from .models import User

class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['phone', 'name', 'gender', 'borndate', 'password']    #定義哪些欄位是前端可以提供的（註冊時必填）
        extra_kwargs = {
            'password': {'write_only': True},  # 密碼不能回傳
        }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
