from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from .forms import SignUpForm
from .models import Continent, Country, Industry, Company
from django.db.models import Count
from django.utils import timezone
from core.models import PageVisit

# Create your views here.
def home(request):
    return render(request, 'index.html')

def about(request):
    return render(request, 'pages/about.html')

def contact(request):
    return render(request, 'pages/contact.html')

def policies(request):
    return render(request, 'pages/policies.html')

def faq(request):
    return render(request, 'pages/faq.html')

def register(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('home')
    else:
        form = SignUpForm()
    return render(request, 'registration/register.html', {'form': form})

@login_required
def member_dashboard(request):
    return render(request, 'member_dashboard.html')

def list_continents(request):
    continents = Continent.objects.all()
    return render(request, 'listings/continents.html', {'continents': continents})

def list_countries(request, continent_id):
    continent = get_object_or_404(Continent, id=continent_id)
    countries = continent.countries.all()
    return render(request, 'listings/countries.html', {'continent': continent, 'countries': countries})

def list_industries(request, country_id):
    country = get_object_or_404(Country, id=country_id)
    industries = country.industries.all()
    return render(request, 'listings/industries.html', {'country': country, 'industries': industries})

def list_companies(request, industry_id):
    industry = get_object_or_404(Industry, id=industry_id)
    companies = industry.companies.all()
    return render(request, 'listings/companies.html', {'industry': industry, 'companies': companies})

def company_detail(request, company_id):
    company = get_object_or_404(Company, id=company_id)
    return render(request, 'listings/company_detail.html', {'company': company})

def analytics_dashboard(request):
    total_hits = PageVisit.objects.count()
    today = timezone.now().date()
    daily_hits = PageVisit.objects.filter(timestamp__date=today).count()
    weekly_hits = PageVisit.objects.filter(timestamp__date__gte=today - timezone.timedelta(days=7)).count()
    monthly_hits = PageVisit.objects.filter(timestamp__date__gte=today - timezone.timedelta(days=30)).count()
    return render(request, 'analytics/dashboard.html', {
        'total_hits': total_hits,
        'daily_hits': daily_hits,
        'weekly_hits': weekly_hits,
        'monthly_hits': monthly_hits,
    })

def chat(request, company_id):
    company = get_object_or_404(Company, id=company_id)
    return render(request, 'chat.html', {'company': company})
