from django.contrib import admin
from .models import Family, User, Hos, HealthCare, Med, CallRecord, Scam,FitData
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin 

class FamilyAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Family._meta.fields]

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    model = User
    list_display = (
     'Phone', 'Name', 'Gender', 'Borndate',
    'FamilyID', 'RelatedID', 'Created_time',  'is_superuser'
)
    list_filter = ('is_staff', 'is_superuser', 'Gender')
    search_fields = ('Phone', 'Name')

    ordering = ('UserID',)
    
    fieldsets = (   #編輯頁面的欄位分區
        (None, {'fields': ('Phone', 'password')}),  #無標題區塊，顯示電話與密碼欄位
        (_('Personal info'), {'fields': ('Name', 'Gender', 'Borndate', 'FamilyID', 'RelatedID')}),      #標題是「Personal info」（個人資訊），包含姓名、性別、生日、家庭與關係資訊。
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),  #權限相關設定
        (_('Important dates'), {'fields': ('last_login', )}), 
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('Phone', 'Name', 'password1', 'password2'),
        }),
    )
class HospitalAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Hos._meta.fields]

class HealthCareAdmin(admin.ModelAdmin):
    list_display = [field.name for field in HealthCare._meta.fields]

class MedicineAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Med._meta.fields]

class CallRecordAdmin(admin.ModelAdmin):
    list_display = [field.name for field in CallRecord._meta.fields]

class ScamAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Scam._meta.fields]

class FitDataAdmin(admin.ModelAdmin):
    list_display = [field.name for field in FitData._meta.fields]
    
class FitDataAdmin(admin.ModelAdmin):
    list_display = ['UserID', 'steps', 'timestamp']

# 註冊
admin.site.register(Family, FamilyAdmin)
admin.site.register(Hos, HospitalAdmin)
admin.site.register(HealthCare, HealthCareAdmin)
admin.site.register(Med, MedicineAdmin)
admin.site.register(CallRecord, CallRecordAdmin)
admin.site.register(Scam, ScamAdmin)
admin.site.register(FitData, FitDataAdmin)