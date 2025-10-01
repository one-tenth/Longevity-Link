from django.db import models
from django.core.validators import RegexValidator
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import uuid
from django.utils import timezone
from django.conf import settings


import random
import string

def generate_family_code():
    return ''.join(random.choices(string.digits, k=5))  # 例如 4832

class Family(models.Model):
    FamilyID = models.AutoField(primary_key=True)
    Fcode = models.CharField(max_length=10, unique=True, default=generate_family_code)
    FamilyName = models.CharField(max_length=10)
    Created_Time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.FamilyName} ({self.Fcode})"

    class Meta:
        verbose_name = "Family"
        verbose_name_plural = "Family"

class CustomUserManager(BaseUserManager):
    #建立使用者帳號
    def create_user(self, Phone, password=None, **extra_fields):
        Name = extra_fields.get('Name')
        Gender = extra_fields.get('Gender')
        Borndate = extra_fields.get('Borndate')

        user = self.model(Phone=Phone, Name=Name, Gender=Gender, Borndate=Borndate)
        user.set_password(password)
        user.save()
        return user

    #建立超級使用者帳號
    def create_superuser(self, Phone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)   #指定 is_staff = True 可以進後台
        extra_fields.setdefault('is_superuser', True)   #指定 is_superuser = True 擁有全部權限
        return self.create_user(Phone, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    UserID = models.AutoField(primary_key=True)
    Name = models.CharField(max_length=10, null=True, blank=True)  # 靠 API 驗證資料完整性
    Gender = models.CharField(
        max_length=1,
        choices=[('M', 'Male'), ('F', 'Female')],
        null=True, blank=True
    )
    Borndate = models.DateField(null=True, blank=True)
    Phone = models.CharField(
        max_length=10,
        unique=True,
        validators=[RegexValidator(regex=r'^09\d{8}$')]
    )
    FamilyID = models.ForeignKey(
        'Family',
        on_delete=models.CASCADE,
        db_column='FamilyID',
        null=True, blank=True
    )
    RelatedID = models.ForeignKey(
        'self',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='related_family'
    )
    avatar = models.CharField(   # ⭐ 新增頭貼欄位
        max_length=50,
        default="boy.png"        # 預設頭貼
    )
    Created_time = models.DateTimeField(auto_now_add=True)

    is_family = models.BooleanField(default=True)   # 預設是家人
    is_elder = models.BooleanField(default=False)   # 如果是老人就會設為 True

    is_active = models.BooleanField(default=True)   # 可登入
    is_staff = models.BooleanField(default=False)   # 可進後台（僅限 superuser）

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='mysite_user_set',
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='mysite_user_permissions_set',
        blank=True
    )

    USERNAME_FIELD = 'Phone'
    REQUIRED_FIELDS = ['Name']

    objects = CustomUserManager()

    def __str__(self):
        return self.Phone

    class Meta:
        db_table = 'User'


class Hos(models.Model):
    HosId = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, db_column='UserID')
    ClinicPlace = models.CharField(max_length=20)
    ClinicDate = models.DateField()
    Doctor = models.CharField(max_length=10)
    Num = models.IntegerField()

    class Meta:
        verbose_name = "Hos"
        verbose_name_plural = "Hos"



from django.db import models
from django.conf import settings

class HealthCare(models.Model):
    PERIOD_CHOICES = [
        ('morning', '早上'),
        ('evening', '晚上'),
    ]

    HealthID   = models.AutoField(primary_key=True)
    UserID     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    Systolic   = models.IntegerField()
    Diastolic  = models.IntegerField()
    Pulse      = models.IntegerField(null=True, blank=True)

    # 原始時間欄位
    Date       = models.DateTimeField(auto_now_add=True)          # 後端收到時間（UTC 儲存）
    CapturedAt = models.DateTimeField(null=True, blank=True)      # 前端拍照時間（UTC 儲存，或你現在是已轉台北，但建議存 UTC）

    # 裝置/輔助欄位
    DeviceTZ   = models.CharField(max_length=64, null=True, blank=True)
    EpochMs    = models.BigIntegerField(null=True, blank=True)

    # 新增：時段 & 台北的日（用來做唯一性）
    Period     = models.CharField(max_length=10, choices=PERIOD_CHOICES)     # morning/evening
    LocalDate  = models.DateField()                                           # CapturedAt 轉 Asia/Taipei 後的日期

    class Meta:
        verbose_name = "Health care"
        verbose_name_plural = "Health care"
        # ✅ 限制：同一個人、同一個「台北日」、同一個時段，不可重複
        constraints = [
            models.UniqueConstraint(
                fields=["UserID", "LocalDate", "Period"],
                name="uniq_user_localdate_period"
            )
        ]

    def __str__(self):
        return f"{self.UserID} {self.LocalDate} {self.Period} - {self.Systolic}/{self.Diastolic}"




class Med(models.Model):
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, db_column='UserID')
    MedId = models.AutoField(primary_key=True)
    Disease = models.CharField(max_length=50)
    MedName = models.CharField(max_length=50)
    AdministrationRoute = models.CharField(max_length=10)  # oral / topical
    DosageFrequency = models.CharField(max_length=50)
    Effect = models.CharField(max_length=100)
    SideEffect = models.CharField(max_length=100)
    PrescriptionID = models.UUIDField(default=uuid.uuid4)
    created_at = models.DateTimeField(default=timezone.now)  # ✅ 新增這行


    class Meta:
        verbose_name = "Med"
        verbose_name_plural = "Med"

class MedTimeSetting(models.Model):
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, db_column='UserID')
    MorningTime = models.TimeField(null=True, blank=True)    # 早上
    NoonTime = models.TimeField(null=True, blank=True)       # 中午
    EveningTime = models.TimeField(null=True, blank=True)    # 晚上
    Bedtime = models.TimeField(null=True, blank=True)        # 睡前
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "MedTimeSetting"
        verbose_name_plural = "MedTimeSetting"

class CallRecord(models.Model):
    CallId = models.AutoField(primary_key=True)
    UserId = models.ForeignKey(User, on_delete=models.CASCADE, db_column='UserId')
    PhoneName = models.CharField(max_length=50)  
    Phone = models.CharField(max_length=20)      
    PhoneTime = models.CharField(max_length=20)  
    IsScam = models.BooleanField(default=False)

    def to_dict(self):
        return {
            'CallId': self.CallId,
            'UserId': self.UserId_id,  # 外鍵 id
            'PhoneName': self.PhoneName,
            'Phone': self.Phone,
            'PhoneTime': self.PhoneTime,
            'IsScam': self.IsScam,
        }

    class Meta:
        verbose_name = "Call record"
        verbose_name_plural = "Call record"

class Scam(models.Model):
    ScamId = models.AutoField(primary_key=True)
    Phone = models.ForeignKey(CallRecord, on_delete=models.CASCADE, db_column='Phone')
    Category = models.CharField(max_length=10)

    class Meta:
        verbose_name = "Scam"
        verbose_name_plural = "Scam"

from django.db import models
from django.conf import settings

class FitData(models.Model):
    UserID = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='UserID')
    date = models.DateField()  # ✅ 改成日期
    steps = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)  # 建立時間
    updated_at = models.DateTimeField(auto_now=True)      # 更新時間

    class Meta:
        unique_together = ('UserID', 'date')  # ✅ 同一天只能有一筆
        verbose_name = "FitData"
        verbose_name_plural = "FitData"


class LocaRecord(models.Model):
    LocationID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, db_column='UserID') #長者的
    Latitude = models.FloatField()
    Longitude = models.FloatField()
    Timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "LocaRecord"
        verbose_name_plural = "LocaRecords"
        indexes = [
            models.Index(fields=['UserID', '-Timestamp']),  
        ]
        ordering = ['-Timestamp'] 