# Project Testing Checklist

This checklist helps you verify features after each development step.  
Mark each box `[x]` when the feature works as expected.

---

## ✅ Steps 1–16 (Completed)

### Frontend
- [✅] Home page loads with Bootstrap styling
- [✅] Navbar links work for:
  - [✅] About Us
  - [✅] Contact Us
  - [✅] Policies
  - [✅] FAQ
- [✅] Header and footer are consistent across all pages (template inheritance)

### Authentication
- [✅] Register page creates a new user
- [✅] New user is logged in automatically after registration
- [ ] Login page works with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Logout works and redirects to home
- [ ] Navbar updates based on login status
- [ ] Member-only page redirects to login if user is not authenticated

### Admin Access
- [ ] Can log in to `/admin/` with superuser credentials
- [ ] Can view and edit User objects

---

## ⏳ Steps 17–19 (Listings)
- [ ] Can create continents, countries, industries, and companies in admin
- [ ] Continent list page shows all continents
- [ ] Clicking a continent shows its countries
- [ ] Clicking a country shows its industries
- [ ] Clicking an industry shows its companies
- [ ] Clicking a company shows its details page

---

## ⏳ Steps 20–22 (Membership Management & Analytics)
- [ ] Membership expiry logic disables expired members
- [ ] Admin can add new members manually
- [ ] Admin can delete members
- [ ] Admin can edit membership dates
- [ ] Soon-to-expire members are visible in admin filters
- [ ] Page visits are tracked in the database
- [ ] Admin or dashboard can display daily/weekly/monthly visit counts

---

## ⏳ Steps 23–25 (Chat, Video Chat, Payments)
### Chat
- [ ] "Start Chat" button appears on company details page
- [ ] Chat page allows sending/receiving messages (WebSocket)

### Video Chat
- [ ] "Start Video Call" button appears on company details page
- [ ] Video page shows local video
- [ ] Video page shows remote video after connection

### Payments
- [ ] Payment page displays correct amount
- [ ] Test payment (sandbox) processes successfully
- [ ] Successful payment updates membership expiry date
- [ ] Failed payment shows error message

---

## 🚀 Final Deployment
- [ ] Domain connected and SSL enabled
- [ ] Project deployed on dedicated server
- [ ] Environment variables configured (secrets, DB credentials)
- [ ] Debug mode disabled in production
- [ ] Static files collected
- [ ] Backup system in place
