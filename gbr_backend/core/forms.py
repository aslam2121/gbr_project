from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import Member

class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = Member
        fields = ('username', 'email', 'password1', 'password2')
