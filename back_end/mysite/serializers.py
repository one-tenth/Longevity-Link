#定義前端與後端交換資料的格式
from rest_framework import serializers

from .models import User,Med,FitData,Family,MedTimeSetting,Hos,LocaRecord

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


class ReminderItemSerializer(serializers.Serializer):
    at = serializers.CharField()
    med_name = serializers.CharField()
    freq = serializers.CharField()
    prescription_id = serializers.CharField()
    disease = serializers.CharField()
    user_id = serializers.IntegerField()
    
class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['UserID', 'Name', 'Phone', 'Gender', 'Borndate', 'FamilyID']

class FamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = ['id', 'Fcode'] 

class HosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hos
        fields = '__all__'
        extra_kwargs = {
            'UserID': {'read_only': True}  # ✅ 這行是關鍵
        }


class LocaRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hos
        fields = '__all__'
        extra_kwargs = {
            'UserID': {'read_only': True}  
        }


from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import LocaRecord

User = get_user_model()

class LocationUploadSerializer(serializers.Serializer):
    # 統一格式 lat/lon
    lat = serializers.FloatField(required=True)
    lon = serializers.FloatField(required=True)

    def validate(self, attrs):
        lat, lon = attrs['lat'], attrs['lon']
        if not (-90 <= lat <= 90):
            raise serializers.ValidationError({"lat": "緯度必須在 -90 ~ 90"})
        
        if not (-180 <= lon <= 180):
            raise serializers.ValidationError({"lon": "經度必須在 -180 ~ 180"})
        return attrs

    def create(self, validated_data):
        user = self.context['user']  # view 傳入 request.user為長者
        return LocaRecord.objects.create(
            UserID=user,
            Latitude=validated_data['lat'],
            Longitude=validated_data['lon'],
        )

class LocationLatestSerializer(serializers.ModelSerializer):

    lat = serializers.SerializerMethodField()
    lon = serializers.SerializerMethodField()
    ts  = serializers.DateTimeField(source='Timestamp')

    class Meta:
        model  = LocaRecord
        fields = ['lat', 'lon', 'ts']

    def get_lat(self, obj): return float(obj.Latitude)
    def get_lon(self, obj): return float(obj.Longitude)
