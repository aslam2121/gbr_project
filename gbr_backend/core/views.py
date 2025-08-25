from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from .forms import SignUpForm
from .models import Continent, Country, Industry, Company, Member
from django.contrib.admin.views.decorators import staff_member_required
from core.models import PageVisit
from django.db.models import Count
from django.utils import timezone
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

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
    today = timezone.now().date()
    return render(request, 'member_dashboard.html', {'today': today})

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

@staff_member_required
def analytics_dashboard(request):
    today = timezone.now().date()
    visits = PageVisit.objects.all()
    total_visits = visits.count()
    daily_visits = visits.filter(timestamp__date=today).count()
    weekly_visits = visits.filter(timestamp__date__gte=today - timezone.timedelta(days=7)).count()
    monthly_visits = visits.filter(timestamp__date__gte=today - timezone.timedelta(days=30)).count()
    return render(request, 'analytics/analytics.html', {
        'total_visits': total_visits,
        'daily_visits': daily_visits,
        'weekly_visits': weekly_visits,
        'monthly_visits': monthly_visits,
    })

def chat(request, company_id):
    company = get_object_or_404(Company, id=company_id)
    return render(request, 'chat.html', {'company': company})

def video_chat(request, company_id):
    company = get_object_or_404(Company, id=company_id)
    return render(request, 'video_chat.html', {'company': company})

def payment(request):
    if request.method == 'POST':
        member = request.user if request.user.is_authenticated else None
        if member:
            member.payment_status = 'paid'
            member.last_payment_date = timezone.now()
            member.next_due_date = timezone.now().date() + timezone.timedelta(days=365)
            member.expiry_date = member.next_due_date
            member.save()
            return render(request, 'payment_success.html')
        else:
            return render(request, 'payment_failed.html')
    return render(request, 'payment.html')


# GrapesJS Page Builder Views
def test_grapesjs(request):
    """Test GrapesJS without login requirement"""
    return render(request, 'test_grapesjs.html')

@login_required
def page_builder(request):
    """Page builder interface using GrapesJS"""
    return render(request, 'page_builder.html')


@csrf_exempt
@login_required
def save_page(request):
    """Save page content from GrapesJS editor"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            html_content = data.get('html', '')
            css_content = data.get('css', '')
            
            # Here you can save to database or file system
            # For now, we'll save to a simple file
            page_content = {
                'html': html_content,
                'css': css_content,
                'created_by': request.user.username,
                'created_at': timezone.now().isoformat()
            }
            
            # Save to file (you might want to save to database instead)
            import os
            pages_dir = os.path.join('static', 'pages')
            os.makedirs(pages_dir, exist_ok=True)
            
            filename = f"page_{request.user.id}_{int(timezone.now().timestamp())}.json"
            filepath = os.path.join(pages_dir, filename)
            
            with open(filepath, 'w') as f:
                json.dump(page_content, f, indent=2)
            
            return JsonResponse({
                'success': True,
                'message': 'Page saved successfully',
                'filename': filename
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})
