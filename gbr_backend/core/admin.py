from django.contrib import admin
from .models import Member, Continent, Country, Industry, Company
from datetime import timedelta
from django.utils import timezone

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

class MemberAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'join_date', 'expiry_date', 'is_active')
    list_filter = (ExpiryFilter,)
    search_fields = ('username', 'email')
    ordering = ('expiry_date',)

admin.site.register(Member, MemberAdmin)
admin.site.register(Continent)
admin.site.register(Country)
admin.site.register(Industry)
admin.site.register(Company)
