# Backend Development Steps (Django)

## Step 1 — Initialize Django Project
**Goal:** Set up base Django project.

**Actions:**
1. Create virtual environment: `python -m venv venv`
2. Install Django: `pip install django`
3. Start project: `django-admin startproject gbr_backend`

**Prompt for Agents:**  
"Initialize Django project named gbr_backend."

---

## Step 2 — Create Core App
**Goal:** Add a main app for site functionality.

**Actions:**
1. Inside project, run: `python manage.py startapp core`
2. Add `core` to `INSTALLED_APPS`.

**Prompt for Agents:**  
"Create Django app 'core' and add to settings."

---

## Step 3 — Set Up Templates & Static Files
**Goal:** Configure Django to serve frontend templates.

**Actions:**
1. Set `TEMPLATES` and `STATICFILES_DIRS` in `settings.py`.
2. Create `templates/` and `static/` folders.
3. Move frontend HTML/CSS/JS files here.

**Prompt for Agents:**  
"Configure Django to serve HTML templates and static files."

---

## Step 4 — Create Models for Members
**Goal:** Store registered members' details.

**Actions:**
1. In `core/models.py`, create `Member` model with fields:
   - username, email, password, category, period, join_date, expiry_date
2. Run migrations.

**Prompt for Agents:**  
"Create Django model for members with expiry date tracking."

---

## Step 5 — Create Views for Static Pages
**Goal:** Serve About Us, How GBR Works, etc.

**Actions:**
1. Create views in `core/views.py` returning `render()` for each page.
2. Map in `urls.py`.

**Prompt for Agents:**  
"Create Django views for static content pages."

---

## Step 6 — Implement Login & Registration
**Goal:** Add Django authentication.

**Actions:**
1. Use Django's built-in auth system.
2. Create registration form view to add members.
3. Create login/logout views.

**Prompt for Agents:**  
"Implement Django authentication for login and signup."

---

## Step 7 — Implement Listing Logic
**Goal:** Dynamic selection of continents, countries, industries, companies.

**Actions:**
1. Create models for Continent, Country, Industry, Company.
2. Add relationships: Country → Continent, Industry → Country, Company → Industry.
3. Create views to filter based on selections.

**Prompt for Agents:**  
"Create database models for geographical and industry listings."

---

## Step 8 — Company Details & Contact
**Goal:** Show company info and chat/video options.

**Actions:**
1. Add view to fetch company details.
2. Integrate WebRTC for video/chat later.

**Prompt for Agents:**  
"Create view to display company details with placeholders for chat/video."

---

## Step 9 — Membership Management (Admin)
**Goal:** Admin control over members.

**Actions:**
1. Add expiry tracking logic (auto-disable expired members).
2. Add manual add/remove in Django admin.

**Prompt for Agents:**  
"Add admin controls for managing memberships."

---

## Step 10 — Analytics & Hit Counter
**Goal:** Track site visits.

**Actions:**
1. Add middleware to log page visits.
2. Store counts daily/weekly/monthly.

**Prompt for Agents:**  
"Add hit counter system in Django."
