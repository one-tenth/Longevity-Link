from rest_framework import serializers
from .models import Family

class FamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = ['FamilyID', 'Fcode', 'FamilyName', 'Created_Time']
        read_only_fields = ['FamilyID', 'Created_Time']
