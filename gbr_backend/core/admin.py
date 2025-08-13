from django.contrib import admin
from .models import Member, Continent, Country, Industry, Company

admin.site.register(Member)
admin.site.register(Continent)
admin.site.register(Country)
admin.site.register(Industry)
admin.site.register(Company)
