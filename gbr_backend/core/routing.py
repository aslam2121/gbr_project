from django.urls import re_path
from core.consumers import ChatConsumer, VideoCallConsumer

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<company_id>\d+)/$', ChatConsumer.as_asgi()),
    re_path(r'ws/video/(?P<company_id>\d+)/$', VideoCallConsumer.as_asgi()),
]
