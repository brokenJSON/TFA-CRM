# Authentication Guide

## Overview

The TFA CRM now has a complete authentication system integrated across all pages.

## Key Features

✅ **Real Authentication** - Login and registration use backend API  
✅ **Sign Out Button** - Available on all authenticated pages  
✅ **Role-Based Access** - Admin, Staff, and Volunteer roles  
✅ **Protected Pages** - Automatically redirect to login if not authenticated  
✅ **User Info Display** - Shows logged-in user's email in header  

---

## Test Accounts

After running `npm run seed`, use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@tfa.org | admin123 |
| Staff | staff@tfa.org | staff123 |
| Volunteer | alex@tfa.org | volunteer123 |
| Volunteer | priya@tfa.org | volunteer123 |

---

## Page Protection

### Admin-Only Pages
These require admin or staff role:
- `dashboard_admin.html` - Admin dashboard
- `reports.html` - Reports and analytics
- `events.html` - Events manager
- `campaigns.html` - Campaign scheduler

### Volunteer Pages
These require any authenticated user:
- `dashboard_volunteer.html` - Volunteer dashboard

### Public Pages
These don't require authentication:
- `index.html` - Homepage
- `log_in.html` - Login page
- `register.html` - Registration page

---

## Sign Out Button

All authenticated pages now have a **Sign Out** button in the top-right header.

**What happens when you sign out:**
1. Clears user session from localStorage
2. Redirects to login page (`log_in.html`)
3. Requires re-authentication to access protected pages

---

## Authentication Helper (`auth.js`)

A shared authentication helper script is available at `/assets/js/auth.js`.

### Available Functions

#### Check Authentication
```javascript
// Check if user is logged in
TFA_AUTH.isLoggedIn()  // Returns true/false

// Get current user
TFA_AUTH.getCurrentUser()  // Returns user object or null

// Get user role
TFA_AUTH.getUserRole()  // Returns 'admin', 'staff', 'volunteer', or null
```

#### Role Checking
```javascript
// Check specific role
TFA_AUTH.hasRole('admin')  // Returns true/false

// Check if admin or staff
TFA_AUTH.isAdminOrStaff()  // Returns true/false
```

#### Page Protection
```javascript
// Require authentication (any role)
TFA_AUTH.requireAuth()  // Redirects to login if not authenticated

// Require admin/staff role
TFA_AUTH.requireAdmin()  // Redirects if not admin/staff
```

#### API Calls
```javascript
// Make authenticated API call
const data = await TFA_AUTH.apiCall('/volunteers', {
  method: 'GET'
});

// POST example
const newVolunteer = await TFA_AUTH.apiCall('/volunteers', {
  method: 'POST',
  body: JSON.stringify({ name: 'John Doe', email: 'john@email.com' })
});
```

#### Sign Out
```javascript
// Sign out current user
TFA_AUTH.signOut()
```

---

## Using Authentication in Your Pages

### 1. Include the auth.js script

```html
<script src="assets/js/auth.js"></script>
```

### 2. Protect the page (optional)

```html
<script>
  // For admin pages
  TFA_AUTH.requireAdmin();
  
  // OR for any authenticated user
  TFA_AUTH.requireAuth();
</script>
```

### 3. Add sign-out button to header

```html
<header id="header">
  <a href="index.html" class="logo"><strong>Your Page Title</strong></a>
  <ul class="icons">
    <li><span id="userEmail" style="margin-right:1em;color:#7f888f;"></span></li>
    <li><a href="#" id="signOutBtn" class="button small" style="margin:0;">Sign Out</a></li>
  </ul>
</header>
```

### 4. Make API calls with authentication

```javascript
// Old way (manual)
const response = await fetch('/api/volunteers', {
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'dev-key'
  }
});

// New way (using helper)
const volunteers = await TFA_AUTH.apiCall('/volunteers');
```

---

## How It Works

### Login Flow
1. User enters email and password on `log_in.html`
2. Frontend calls `/api/auth/login` with credentials
3. Backend validates credentials against database
4. If valid, user info is stored in localStorage
5. User is redirected to appropriate dashboard based on role

### Registration Flow
1. User fills form on `register.html`
2. Frontend calls `/api/auth/register` with details
3. Backend creates:
   - User account in `users` table
   - Volunteer profile in `volunteers` table
4. User is redirected to login page
5. User can now log in with new credentials

### Authentication Check
1. When page loads, `auth.js` checks localStorage
2. If `requireAuth()` or `requireAdmin()` is called:
   - Checks if user exists in localStorage
   - Checks if user has required role
   - Redirects to login if not authenticated/authorized

### Sign Out
1. User clicks "Sign Out" button
2. Confirmation dialog appears
3. If confirmed:
   - Clears localStorage
   - Redirects to login page

---

## localStorage Keys

The authentication system uses these localStorage keys:

- `tfa_current_user` - Current user object (id, email, role, etc.)
- `tfa_api_key` - API key for backend calls
- `tfa_remember_me` - Remember me checkbox state

---

## Security Notes

### Current Implementation (Development)
- ✅ Password hashing (SHA-256)
- ✅ API key authentication
- ✅ Role-based access control
- ✅ Session management via localStorage

### Production Improvements Needed
- ⚠️ Use bcrypt instead of SHA-256 for passwords
- ⚠️ Implement JWT tokens instead of localStorage
- ⚠️ Add HTTPS/SSL certificates
- ⚠️ Add rate limiting
- ⚠️ Add session expiration
- ⚠️ Add CSRF protection
- ⚠️ Add password reset functionality

---

## Troubleshooting

### "Access denied" message
- You're trying to access an admin page with a volunteer account
- Log in with an admin or staff account

### Infinite redirect loop
- Clear your browser's localStorage
- Go to DevTools > Application > Local Storage > Clear All
- Refresh the page

### Sign out button not working
- Make sure `auth.js` is loaded before other scripts
- Check browser console for JavaScript errors

### API calls failing
- Make sure the server is running (`npm start`)
- Check that API key matches in `auth.js` and `.env`
- Check browser console Network tab for request details

---

## Next Steps

1. **Test all pages** - Make sure sign out works on every page
2. **Test role access** - Verify volunteers can't access admin pages
3. **Test registration** - Create new accounts and log in
4. **Update frontend forms** - Use `TFA_AUTH.apiCall()` for all API requests

---

**Last Updated**: November 2025

