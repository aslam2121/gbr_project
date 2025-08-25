from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.utils import timezone

class Member(AbstractUser):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    category = models.CharField(max_length=50)
    period = models.CharField(max_length=50)
    join_date = models.DateField(default=timezone.now)
    expiry_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    groups = models.ManyToManyField(Group, related_name='member_groups', blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name='member_permissions', blank=True)
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='pending')
    last_payment_date = models.DateTimeField(null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.username

    class Meta:
        verbose_name = "Member"
        verbose_name_plural = "Members"

class Continent(models.Model):
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

class Country(models.Model):
    name = models.CharField(max_length=100)
    continent = models.ForeignKey(Continent, on_delete=models.CASCADE, related_name='countries')
    def __str__(self):
        return self.name

class Industry(models.Model):
    name = models.CharField(max_length=100)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='industries')
    def __str__(self):
        return self.name

class Company(models.Model):
    name = models.CharField(max_length=150)
    industry = models.ForeignKey(Industry, on_delete=models.CASCADE, related_name='companies')
    description = models.TextField()
    contact_info = models.CharField(max_length=255)
    chat_code = models.CharField(max_length=255, blank=True)
    def __str__(self):
        return self.name

class PageVisit(models.Model):
    path = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.path} at {self.timestamp}"


class Page(models.Model):
    """Model to store GrapesJS built pages"""
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    html_content = models.TextField()
    css_content = models.TextField(blank=True)
    created_by = models.ForeignKey(Member, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_published = models.BooleanField(default=False)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-created_at']

class ChatMessage(models.Model):
    user = models.ForeignKey(Member, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.user.username}: {self.message[:20]}"
