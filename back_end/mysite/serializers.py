#定義前端與後端交換資料的格式
from rest_framework import serializers

from .models import User,Med,FitData,Family,MedTimeSetting

from .models import User,Med,FitData,LocaRecord

class UserRegisterSerializer(serializers.ModelSerializer):
    Phone = serializers.CharField(max_length=10)
    password = serializers.CharField(write_only=True)
    Name = serializers.CharField(max_length=10)
    Gender = serializers.ChoiceField(choices=['M', 'F'])
    Borndate = serializers.DateField()
    creator_id = serializers.IntegerField(required=False, write_only=True)  # 新增欄位，前端可傳入

    class Meta:
        model = User
        fields = ['Phone', 'Name', 'Gender', 'Borndate', 'password', 'creator_id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        creator_id = validated_data.pop('creator_id', None)  # 預設為 None
        user = User(**validated_data)
        user.set_password(password)

        if creator_id:
            try:
                creator = User.objects.get(UserID=creator_id)
                user.RelatedID = creator
                user.FamilyID = creator.FamilyID
            except User.DoesNotExist:
                raise serializers.ValidationError({"creator_id": "找不到指定的創建者。"})

        user.save()
        return user

class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['UserID', 'Name', 'Phone', 'Gender', 'Borndate', 'FamilyID', 'RelatedID']


class MedNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Med
        fields = ['MedId', 'Disease']

class FitDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitData
        fields = ['steps', 'timestamp']
        
class MedSerializer(serializers.ModelSerializer):  # ✅ 正確
    class Meta:
        model = Med
        fields = '__all__'
class MedTimeSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedTimeSetting
        fields = '__all__'
class FamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = '__all__'

class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['UserID', 'Name', 'Phone', 'Gender', 'Borndate', 'FamilyID']

class FamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = ['id', 'Fcode'] 


class LocaRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocaRecord
        fields = ['LocationID', 'UserID', 'Latitude', 'Longitude', 'Timestamp']
        read_only_fields = ['LocationID', 'Timestamp']  # UserID 可保留可寫，或一律 read_only 由後端注入

    def validate(self, attrs):
        lat = attrs.get('Latitude')
        lng = attrs.get('Longitude')
        if lat is None or lng is None:
            raise serializers.ValidationError('缺少座標')
        if not (-90.0 <= float(lat) <= 90.0) or not (-180.0 <= float(lng) <= 180.0):
            raise serializers.ValidationError('座標超出範圍（lat:-90~90, lng:-180~180）')
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.Timestamp:
            data['Timestamp'] = instance.Timestamp.isoformat()
        return data
