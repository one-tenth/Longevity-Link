from django.contrib import admin
from .models import Family,User,Hos,HealthCare,Med,CallRecord,Scam



class FamilyAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Family._meta.fields]  # 自動顯示所有欄位
class UserAdmin(admin.ModelAdmin):
    list_display = [field.name for field in User._meta.fields]  # 自動顯示所有欄位
class HospitalAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Hos._meta.fields]  # 自動顯示所有欄位
class HealthCareAdmin(admin.ModelAdmin):
    list_display = [field.name for field in HealthCare._meta.fields]  # 自動顯示所有欄位
class MedicineAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Med._meta.fields]  # 自動顯示所有欄位
class CallRecordAdmin(admin.ModelAdmin):
    list_display = [field.name for field in CallRecord._meta.fields]  # 自動顯示所有欄位
class ScamAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Scam._meta.fields]  # 自動顯示所有欄位
# Register your models here.
admin.site.register(Family,FamilyAdmin)
admin.site.register(User,UserAdmin)
admin.site.register(Hos,HospitalAdmin)
admin.site.register(HealthCare,HealthCareAdmin)
admin.site.register(Med,MedicineAdmin)
admin.site.register(CallRecord,CallRecordAdmin)
admin.site.register(Scam,ScamAdmin)
