#定義前端與後端交換資料的格式
from rest_framework import serializers
from .models import User,Med,FitData

class UserRegisterSerializer(serializers.ModelSerializer):
    Phone = serializers.CharField(max_length=10)
    password = serializers.CharField(write_only=True)
    Name = serializers.CharField(max_length=10)
    Gender = serializers.ChoiceField(choices=['M', 'F'])
    Borndate = serializers.DateField()

    class Meta:
        model = User
        fields = ['Phone', 'Name', 'Gender', 'Borndate', 'password']

    
    def create(self, validated_data):
        password = validated_data.pop('password')
        phone = validated_data.get('Phone')
        name = validated_data.get('Name')
        gender = validated_data.get('Gender')
        borndate = validated_data.get('Borndate')

        user = User.objects.create_user(
            Phone=phone,
            Name=name,
            Gender=gender,
            Borndate=borndate,
            password=password
        )
        return user

class MedNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Med
        fields = ['MedId', 'Disease']

class FitDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitData
        fields = ['steps', 'timestamp']
