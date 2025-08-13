from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.utils import timezone

class Member(AbstractUser):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    category = models.CharField(max_length=50)
    period = models.CharField(max_length=50)
    join_date = models.DateField(default=timezone.now)
    expiry_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    groups = models.ManyToManyField(Group, related_name='member_groups', blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name='member_permissions', blank=True)

    def __str__(self):
        return self.username

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
