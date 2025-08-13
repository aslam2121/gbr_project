import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from .models import Company, ChatMessage
from channels.db import database_sync_to_async
from django.utils import timezone

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.company_id = self.scope['url_route']['kwargs']['company_id']
        self.room_group_name = f'chat_{self.company_id}'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        user = self.scope['user']
        await self.save_message(user, self.company_id, message)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'username': user.username if user.is_authenticated else 'Anonymous',
                'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'username': event['username'],
            'timestamp': event['timestamp'],
        }))

    @database_sync_to_async
    def save_message(self, user, company_id, message):
        company = Company.objects.get(id=company_id)
        ChatMessage.objects.create(user=user, company=company, message=message)
