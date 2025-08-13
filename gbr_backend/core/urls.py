from django.urls import path
from django.contrib.auth.views import LoginView, LogoutView
from core import views

urlpatterns = [
    path('', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('contact/', views.contact, name='contact'),
    path('policies/', views.policies, name='policies'),
    path('faq/', views.faq, name='faq'),
    path('login/', LoginView.as_view(template_name='registration/login.html', redirect_authenticated_user=True, next_page='dashboard'), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('register/', views.register, name='register'),
    path('dashboard/', views.member_dashboard, name='dashboard'),
    path('listings/', views.list_continents, name='list_continents'),
    path('listings/continent/<int:continent_id>/', views.list_countries, name='list_countries'),
    path('listings/country/<int:country_id>/', views.list_industries, name='list_industries'),
    path('listings/industry/<int:industry_id>/', views.list_companies, name='list_companies'),
    path('listings/company/<int:company_id>/', views.company_detail, name='company_detail'),
    path('listings/company/<int:company_id>/chat/', views.chat, name='chat'),
    path('listings/company/<int:company_id>/video/', views.video_chat, name='video_chat'),
    path('analytics/', views.analytics_dashboard, name='analytics_dashboard'),
    path('payment/', views.payment, name='payment'),
]
