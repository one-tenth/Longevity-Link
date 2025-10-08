from rest_framework import serializers

from .models import User,Med,FitData,Family,MedTimeSetting,Hos,CallRecord,Scam,LocaRecord

from .models import User,Med,FitData,LocaRecord

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

            'UserID': {'read_only': True}  # ✅ 這行是關鍵
        }


from zoneinfo import ZoneInfo
class CallRecordSerializer(serializers.ModelSerializer):
    ScamCategory = serializers.SerializerMethodField()   # ✅ 保留你原本的欄位與邏輯
    PhoneTime_tw = serializers.SerializerMethodField()   # ✅ 新增：台灣時區 ISO
    PhoneTime_hm_tw = serializers.SerializerMethodField()# ✅ 新增：台灣時區 HH:MM
    # （若你想只讀，下面兩個也可加 read_only=True；預設輸出用就好）
    # status 與 duration_sec 直接用 Model 欄位（你已加在 Model）
    # 若不想讓前端修改，可在 View/Serializer 另一支「Create/Update」控制

    class Meta:
        model = CallRecord
        # ✅ 保留原本 fields，僅「加上」新的欄位，不移除、不改名
        fields = [
            'CallId',
            'UserId',
            'PhoneName',
            'Phone',
            'PhoneTime',        # DB 內的 UTC（DateTimeField）
            'PhoneTime_tw',     # 轉 Asia/Taipei 的 ISO
            'PhoneTime_hm_tw',  # 轉 Asia/Taipei 的 HH:MM
            'status',           # 新欄位：通話狀態
            'duration_sec',     # 新欄位：通話秒數
            'IsScam',
            'ScamCategory',
        ]
        read_only_fields = ['ScamCategory', 'PhoneTime_tw', 'PhoneTime_hm_tw']

    def get_ScamCategory(self, obj):
        # ✅ 保留你的 Scam 查詢邏輯
        try:
            scam = Scam.objects.get(Phone=obj.Phone)
            return scam.Category
        except Scam.DoesNotExist:
            return None

    def get_PhoneTime_tw(self, obj):
        # ✅ 將 DB 的 UTC PhoneTime 轉為台灣時區 ISO
        if not obj.PhoneTime:
            return None
        return obj.PhoneTime.astimezone(ZoneInfo('Asia/Taipei')).isoformat()

    def get_PhoneTime_hm_tw(self, obj):
        # ✅ 只輸出到「幾點幾分」（台灣時區）
        if not obj.PhoneTime:
            return None
        return obj.PhoneTime.astimezone(ZoneInfo('Asia/Taipei')).strftime('%H:%M')
        
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

from rest_framework import serializers
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from zoneinfo import ZoneInfo
from datetime import datetime
from .models import CallRecord
TYPE_MAP = {
    '1': 'INCOMING', '2': 'OUTGOING', '3': 'MISSED', '4': 'VOICEMAIL',
    '5': 'REJECTED', '6': 'BLOCKED', '7': 'ANSWERED_EXTERNALLY',
}

class CallRecordCreateSerializer(serializers.ModelSerializer):
    # 允許傳 Android 的 type（1~7），或直接傳 status 也行
    type = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = CallRecord
        fields = ['PhoneName', 'Phone', 'PhoneTime', 'status', 'duration_sec', 'IsScam', 'type']

    def validate(self, attrs):
        # 1) type → status（有傳 type 就覆蓋）
        t = attrs.pop('type', None)
        if t is not None:
            attrs['status'] = TYPE_MAP.get(str(t), 'UNKNOWN')

        # 2) PhoneTime：接受 ISO(+08:00)/epoch(秒或毫秒)/無時區字串(視為台灣時間)
        raw = attrs.get('PhoneTime')
        dt = None
        if isinstance(raw, (int, float)) or (isinstance(raw, str) and raw.isdigit()):
            n = int(raw)
            if n > 10_000_000_000:  # ms
                dt = timezone.datetime.fromtimestamp(n / 1000.0, tz=timezone.utc)
            else:
                dt = timezone.datetime.fromtimestamp(n, tz=timezone.utc)
        elif isinstance(raw, str):
            dt = parse_datetime(raw)  # 若含時區會回 aware
            if dt is None:
                tw = ZoneInfo('Asia/Taipei')
                for f in ['%Y-%m-%d %H:%M:%S','%Y-%m-%d %H:%M','%Y/%m/%d %H:%M:%S','%Y/%m/%d %H:%M','%Y-%m-%dT%H:%M:%S','%Y-%m-%d']:
                    try:
                        naive = datetime.strptime(raw, f)
                        dt = naive.replace(tzinfo=tw).astimezone(timezone.utc)
                        break
                    except Exception:
                        pass
        else:
            dt = timezone.now()

        if dt is None:
            raise serializers.ValidationError({'PhoneTime': '無法解析時間格式'})

        # 3) 存 UTC，且「只到分鐘」：清秒/微秒
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone=timezone.utc)
        attrs['PhoneTime'] = dt.astimezone(timezone.utc).replace(second=0, microsecond=0)

        # 4) duration_sec 非負
        d = attrs.get('duration_sec') or 0
        if d < 0:
            attrs['duration_sec'] = 0
        return attrs