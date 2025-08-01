"""
URL configuration for back_end project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from mysite import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/hello/', views.hello_world),
    path('api/ocrblood/', views.BloodOCRView.as_view(), name='ocr_blood'),
    path('api/fitdata/', views.FitDataAPI.as_view(), name='fitdata'),
    path('api/fitdata/by-date/', views.FitDataByDateAPI.as_view()),
    path('api/healthcare/by-date/', views.HealthCareByDateAPI.as_view()),
    path('ocr-analyze/', views.OcrAnalyzeView.as_view(), name='ocr-analyze'),
    path('api/mednames/', views.MedNameListView.as_view(), name='medname-list'),
    path('api/meds/<uuid:prescription_id>/', views.get_med_by_prescription),
    path('api/delete-prescription/<uuid:prescription_id>/', views.DeletePrescriptionView.as_view()),
    path('api/create-med-time/', views.create_med_time_setting, name='create_med_time'),
    path('api/get-med-time/', views.get_med_time_setting),
    path('api/register/', views.register_user, name='register'),#因為要存入資料庫 所以寫這個
    path('api/account/login/', views.login, name='login'),# 因為要從資料庫拿出來 所以寫這個
    path('api/family/create/', views.CreateFamilyView.as_view(), name='create_family'),
    path('account/me/', views.get_me,name='get_me'),
    path('update_related/', views.update_related),
    path('family/members/', views.get_family_members),
]
