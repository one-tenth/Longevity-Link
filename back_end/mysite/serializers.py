from rest_framework import serializers
from .models import User, Med, FitData, Family, MedTimeSetting, Hos


class UserRegisterSerializer(serializers.ModelSerializer):
    Phone = serializers.CharField(max_length=10)
    password = serializers.CharField(write_only=True)
    Name = serializers.CharField(max_length=10)
    Gender = serializers.ChoiceField(choices=['M', 'F'])
    Borndate = serializers.DateField()
    avatar = serializers.CharField(required=False, allow_blank=True)  # ⭐ 新增頭貼欄位
    creator_id = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = User
        fields = ['Phone', 'Name', 'Gender', 'Borndate', 'password', 'avatar', 'creator_id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        creator_id = validated_data.pop('creator_id', None)
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
        fields = ['UserID', 'Name', 'Phone', 'Gender', 'Borndate', 'FamilyID', 'RelatedID', 'avatar']  # ⭐ 加 avatar


class MedNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Med
        fields = ['MedId', 'Disease']


class FitDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitData
        fields = ['steps', 'timestamp']


class MedSerializer(serializers.ModelSerializer):
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
        fields = ['id', 'FamilyName', 'Fcode']


class ReminderItemSerializer(serializers.Serializer):
    at = serializers.CharField()
    med_name = serializers.CharField()
    freq = serializers.CharField()
    prescription_id = serializers.CharField()
    disease = serializers.CharField()
    user_id = serializers.IntegerField()


class UserMeSerializer(serializers.ModelSerializer):
    FamilyName = serializers.SerializerMethodField()
    Fcode = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'UserID', 'Name', 'Phone', 'Gender', 'Borndate',
            'FamilyID', 'FamilyName', 'Fcode', 'avatar'  # ⭐ 加 avatar
        ]

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
            'UserID': {'read_only': True}
        }
