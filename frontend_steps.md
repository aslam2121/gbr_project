# Frontend Development Steps (HTML/CSS/Bootstrap)

## Step 1 — Project Initialization
**Goal:** Prepare the basic frontend project folder structure.

**Actions:**
1. Create a `frontend/` directory.
2. Inside, create subfolders: `assets/css`, `assets/js`, `assets/img`, `pages`.
3. Create an `index.html` file with basic HTML5 boilerplate.

**Prompt for Agents:**  
"Initialize a static HTML/CSS/Bootstrap structure with the above folder setup."

---

## Step 2 — Include Bootstrap & Basic Styling
**Goal:** Set up Bootstrap and custom stylesheet.

**Actions:**
1. Link to Bootstrap CSS (via CDN) in `index.html`.
2. Link to a custom `style.css` file inside `assets/css/`.
3. Add a sample navbar to verify Bootstrap is working.

**Prompt for Agents:**  
"Add Bootstrap 5 via CDN and verify with a sample navbar."

---

## Step 3 — Create Base Template Structure
**Goal:** Define reusable template parts.

**Actions:**
1. Create `header.html` and `footer.html` inside `pages/partials/`.
2. Use consistent Bootstrap containers and grid layouts.
3. Prepare placeholder areas for dynamic content.

**Prompt for Agents:**  
"Build header and footer partials that can be reused across all pages."

---

## Step 4 — Implement Homepage Layout
**Goal:** Create the main homepage with navigation to other sections.

**Actions:**
1. Add navigation links to About Us, How GBR Works, Company, Investor, Expert, New Members, Contact Us, Policies, FAQ.
2. Add a hero section with placeholder text.
3. Add responsive design support.

**Prompt for Agents:**  
"Design a Bootstrap homepage with responsive navigation and a hero section."

---

## Step 5 — Create 'About Us' Page
**Goal:** Build a clean About Us section.

**Actions:**
1. Create `pages/about.html`.
2. Add company description from project brief.
3. Apply Bootstrap typography and spacing classes.

**Prompt for Agents:**  
"Create About Us page with company intro text styled using Bootstrap."

---

## Step 6 — Repeat for All Content Pages
**Goal:** Add all other static pages (How GBR Works, Company, Investor, Expert, New Members, Contact Us, Policies, FAQ).

**Actions:**
1. Create individual `.html` files in `pages/`.
2. Link them in navbar.
3. Use Bootstrap layout.

**Prompt for Agents:**  
"Generate individual HTML pages for all menu items with placeholder content."

---

## Step 7 — Create Login Page (Frontend)
**Goal:** Set up login UI.

**Actions:**
1. Create `pages/login.html`.
2. Add username/password form using Bootstrap form components.
3. Add a submit button.

**Prompt for Agents:**  
"Design a Bootstrap login form with username and password inputs."

---

## Step 8 — Create Registration Page (Frontend)
**Goal:** Build registration form UI.

**Actions:**
1. Create `pages/register.html`.
2. Include form fields for new member registration details.
3. Include category & period selection dropdowns.

**Prompt for Agents:**  
"Create registration form with text inputs and dropdowns."

---

## Step 9 — Create Listings UI
**Goal:** Build selection-based listing pages (Continents → Countries → Industries → Companies).

**Actions:**
1. Create placeholder pages for each listing stage.
2. Add Bootstrap cards/tables for listing items.

**Prompt for Agents:**  
"Create selection UI pages for continent, country, industry, and company listings."

---

## Step 10 — Company Details & Contact Options
**Goal:** Create company details page.

**Actions:**
1. Create `pages/company-details.html`.
2. Add sections for company info, chat/video icons, and contact details.
3. Use Bootstrap icons or Font Awesome.

**Prompt for Agents:**  
"Create a company details page with contact options using Bootstrap icons."
