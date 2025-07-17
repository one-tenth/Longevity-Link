from django.db import models
from django.core.validators import RegexValidator
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import uuid
from django.utils import timezone


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
    Name = models.CharField(max_length=10,null=True, blank=True)#靠 API 驗證資料完整性 這裡先允許空值
    Gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')],null=True, blank=True)
    Borndate = models.DateField(null=True, blank=True)
    Phone = models.CharField(
        max_length=10,
        unique=True,
        validators=[RegexValidator(regex=r'^09\d{8}$')]
    )
    FamilyID = models.ForeignKey('Family',on_delete=models.CASCADE,db_column='FamilyID',null=True, blank=True)
    RelatedID = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='related_family')
    Created_time = models.DateTimeField(auto_now_add=True)

    is_family = models.BooleanField(default=True)  # 預設是家人
    is_elder = models.BooleanField(default=False)  # 如果是老人就會設為 True

    is_active = models.BooleanField(default=True)   # 可登入
    is_staff = models.BooleanField(default=False)   # 可進後台（僅限 superuser）

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='mysite_user_set',  # 修改反向關聯名稱
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='mysite_user_permissions_set',  # 修改反向關聯名稱
        blank=True
    )

    USERNAME_FIELD = 'Phone'    #用phone當作登入的名稱
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

class HealthCare(models.Model):
    HealthID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, db_column='UserID')
    Systolic=models.IntegerField(    
        validators=[MinValueValidator(70), MaxValueValidator(250)],
    )
    Diastolic=models.IntegerField(
        validators=[MinValueValidator(40), MaxValueValidator(150)],
    )

    Pulse = models.IntegerField(
        validators=[MinValueValidator(30), MaxValueValidator(200)],
    )
    Date = models.DateTimeField()

    class Meta:
        verbose_name = "Health care"
        verbose_name_plural = "Health care"



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

class CallRecord(models.Model):
    CallId = models.AutoField(primary_key=True)
    UserId = models.ForeignKey(User, on_delete=models.CASCADE, db_column='UserId')
    PhoneName = models.CharField(max_length=10)
    Phone = models.CharField(max_length=15, validators=[RegexValidator(regex=r'^\+8869\d{8}$')], unique=True)
    PhoneTime = models.CharField(max_length=10)
    IsScam = models.BooleanField()

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

class FitData(models.Model):
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, db_column='UserID')
    steps = models.IntegerField()
    timestamp = models.DateTimeField()

    class Meta:
        verbose_name = "FitData"
        verbose_name_plural = "FitData"