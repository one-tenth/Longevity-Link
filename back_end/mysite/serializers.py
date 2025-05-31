#定義前端與後端交換資料的格式
from rest_framework import serializers
from .models import User

class UserRegisterSerializer(serializers.ModelSerializer):
    Phone = serializers.CharField(max_length=10)
    password = serializers.CharField(write_only=True)
    Name = serializers.CharField(max_length=10)
    Gender = serializers.ChoiceField(choices=['M', 'F'])
    Borndate = serializers.DateField()

    class Meta:
        model = User
        fields = ['Phone', 'Name', 'Gender', 'Borndate', 'password']  # 確保這裡包括了 Gender 和 Borndate

    def create(self, validated_data):
        print(f"Validated data in create: {validated_data}")
        return User.objects.create_user(**validated_data)