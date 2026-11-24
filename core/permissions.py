from rest_framework.permissions import BasePermission


class IsEventHostOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        host = getattr(obj, "host", getattr(obj, "owner", None))
        return bool(request.user and request.user.is_authenticated and host == request.user)