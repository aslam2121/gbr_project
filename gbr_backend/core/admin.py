from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Member, Continent, Country, Industry, Company, PageVisit
from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from datetime import timedelta
from django.utils import timezone

class MemberCreationForm(forms.ModelForm):
    password1 = forms.CharField(label='Password', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Password confirmation', widget=forms.PasswordInput)

    class Meta:
        model = Member
        fields = ('username', 'email', 'expiry_date', 'is_active')

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Passwords don't match")
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user

class MemberChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField()
    class Meta:
        model = Member
        fields = ('username', 'email', 'password', 'expiry_date', 'is_active')

class ExpiryFilter(admin.SimpleListFilter):
    title = 'Expiry Status'
    parameter_name = 'expiry_status'
    def lookups(self, request, model_admin):
        return (
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('soon', 'Expiring Soon'),
        )
    def queryset(self, request, queryset):
        today = timezone.now().date()
        soon = today + timedelta(days=30)
        if self.value() == 'active':
            return queryset.filter(is_active=True, expiry_date__gte=today)
        if self.value() == 'inactive':
            return queryset.filter(is_active=False)
        if self.value() == 'soon':
            return queryset.filter(is_active=True, expiry_date__range=(today, soon))
        return queryset

class MemberAdmin(UserAdmin):
    add_form = MemberCreationForm
    form = MemberChangeForm
    model = Member
    list_display = ('username', 'email', 'join_date', 'expiry_date', 'is_active')
    list_filter = (ExpiryFilter,)
    search_fields = ('username', 'email')
    ordering = ('expiry_date',)
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Membership', {'fields': ('join_date', 'expiry_date', 'is_active')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'expiry_date', 'is_active', 'password1', 'password2'),
        }),
    )

admin.site.register(Member, MemberAdmin)
admin.site.register(Continent)
admin.site.register(Country)
admin.site.register(Industry)
admin.site.register(Company)
admin.site.register(PageVisit)
