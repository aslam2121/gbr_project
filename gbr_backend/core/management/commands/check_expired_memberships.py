from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Member

class Command(BaseCommand):
    help = 'Checks for expired memberships and deactivates them.'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        expired_members = Member.objects.filter(expiry_date__lt=today, is_active=True)
        count = expired_members.update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f'Deactivated {count} expired members.'))
