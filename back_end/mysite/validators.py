# 驗證最長密碼

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class MaximumLengthValidator:
    def __init__(self, max_length=16):
        self.max_length = max_length

    def validate(self, password, user=None):
        if len(password) > self.max_length:
            raise ValidationError(
                _(f"密碼長度不得超過 {self.max_length} 個字元。"),
                code='password_too_long',
            )

    def get_help_text(self):
        return _(f"密碼長度不得超過 {self.max_length} 個字元。")
