# serializers.py
from rest_framework import serializers

from .models import User, Med, FitData, Family, MedTimeSetting, Hos


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


class MedSerializer(serializers.ModelSerializer):  # ✅ 保持不變
    class Meta:
        model = Med
        fields = '__all__'


class MedTimeSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedTimeSetting
        fields = '__all__'


# ✅ 只保留「單一版本」的 FamilySerializer，包含 FamilyName 與 Fcode
class FamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = ['id', 'FamilyName', 'Fcode']  # 或用 '__all__' 亦可，只要包含 FamilyName 與 Fcode 即可


class ReminderItemSerializer(serializers.Serializer):
    at = serializers.CharField()
    med_name = serializers.CharField()
    freq = serializers.CharField()
    prescription_id = serializers.CharField()
    disease = serializers.CharField()
    user_id = serializers.IntegerField()


# ✅ /account/me/ 回傳中補上 FamilyName 與 Fcode（攤平成頂層）
class UserMeSerializer(serializers.ModelSerializer):
    FamilyName = serializers.SerializerMethodField()
    Fcode = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['UserID', 'Name', 'Phone', 'Gender', 'Borndate', 'FamilyID', 'FamilyName', 'Fcode']

    def get_FamilyName(self, obj):
        fam = getattr(obj, 'FamilyID', None)
        return getattr(fam, 'FamilyName', None) if fam else None

    def get_Fcode(self, obj):
        fam = getattr(obj, 'FamilyID', None)
        return getattr(fam, 'Fcode', None) if fam else None


class HosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hos
        fields = '__all__'
        extra_kwargs = {
            'UserID': {'read_only': True}  # ✅ 保持不變
        }
