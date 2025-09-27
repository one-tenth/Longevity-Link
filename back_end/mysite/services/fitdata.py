from django.db import transaction
from django.utils import timezone
from ..models import FitData

@transaction.atomic
def upsert_steps(user, date, steps: int):
    """
    同一使用者＋日期唯一；存在就更新步數，不同才寫入。
    回傳 (obj, created, updated)
    """
    obj, created = FitData.objects.select_for_update().get_or_create(
        UserID=user,
        date=date,
        defaults={"steps": steps},
    )
    updated = False
    if not created and obj.steps != steps:
        obj.steps = steps
        # 若模型有 updated_at 欄位就一併更新
        if hasattr(obj, "updated_at"):
            obj.updated_at = timezone.now()
        obj.save(update_fields=["steps"] + (["updated_at"] if hasattr(obj, "updated_at") else []))
        updated = True
    return obj, created, updated
