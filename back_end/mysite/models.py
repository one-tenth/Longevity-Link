from django.db import models
from django.core.validators import RegexValidator
from django.core.validators import MinValueValidator, MaxValueValidator

class Family(models.Model):
    FamilyID = models.AutoField(primary_key=True)
    Fcode = models.CharField(max_length=50)
    FamilyName = models.CharField(max_length=10)
    Created_Time = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Family"
        verbose_name_plural = "Family"

class User(models.Model):
    UserID = models.AutoField(primary_key=True)
    Name = models.CharField(max_length=10)
    Gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')])
    Borndate = models.DateField()
    Phone = models.CharField(max_length=15, validators=[RegexValidator(regex=r'^\+8869\d{8}$')], unique=True)
    Password = models.CharField(max_length=20)
    FamilyID = models.ForeignKey(Family, on_delete=models.CASCADE, db_column='FamilyID')
    RelatedId = models.ForeignKey(
        'self',                # 參照自己
        on_delete=models.SET_NULL,
        null=True,             # 最上層類別可以沒有父類別
        blank=True,
        related_name='RelatedFamily'
    )
    Created_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "User"

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
    Pluse = models.CharField(max_length=5)
    Numsteps = models.CharField(max_length=5)
    Date = models.DateTimeField()

    class Meta:
        verbose_name = "Health care"
        verbose_name_plural = "Health care"

class Med(models.Model):
    MedId = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, db_column='UserID')
    Disease = models.CharField(max_length=10)
    MedName = models.CharField(max_length=10)
    MedNote = models.CharField(max_length=50)
    MedTime = models.DateTimeField()

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
