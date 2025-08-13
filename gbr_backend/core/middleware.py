from core.models import PageVisit
from django.utils.deprecation import MiddlewareMixin

class PageVisitMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        path = request.path
        if path.startswith('/admin') or path.startswith('/static'):
            return None
        PageVisit.objects.create(path=path)
        return None