from rest_framework.permissions import BasePermission

class IsElder(BasePermission):
   
    message = '只有長者帳號可以使用此功能'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'is_elder', False)
        )
