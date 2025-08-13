from django.db import models

# Create your models here.
class Member(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    category = models.CharField(max_length=50)
    period = models.CharField(max_length=50)
    join_date = models.DateField(auto_now_add=True)
    expiry_date = models.DateField()

    def __str__(self):
        return self.username
