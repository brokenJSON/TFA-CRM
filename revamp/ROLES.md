# Role-Based Access Control

## Overview

The TFA CRM system has three distinct user roles with different levels of access:

1. **Admin** - Full system access
2. **Staff** - Limited administrative access (operational tasks only)
3. **Volunteer** - Basic access (view own data, log hours)

---

## Role Definitions

### 🔴 Admin (Administrator)
**Full system access** - Can perform all operations

**Access:**
- ✅ All staff features
- ✅ User management (create/edit/delete user accounts)
- ✅ System settings and configuration
- ✅ Advanced reporting and analytics
- ✅ All volunteer management features
- ✅ All event management features
- ✅ All campaign management features

**Use Cases:**
- System administrators
- Organization leadership
- IT personnel

---

### 🟡 Staff
**Limited administrative access** - Can perform operational tasks but not system management

**Access:**
- ✅ Volunteer management (view, add, edit volunteers)
- ✅ Event management (create, edit, manage events)
- ✅ Reports and analytics
- ✅ Campaign management
- ✅ Approve/reject volunteer hours
- ❌ User account management (cannot create admin/staff accounts)
- ❌ System settings
- ❌ Advanced administrative functions

**Use Cases:**
- Volunteer coordinators
- Event managers
- Program staff
- Office administrators

---

### 🟢 Volunteer
**Basic access** - Can view and manage own data

**Access:**
- ✅ View own profile
- ✅ Log volunteer hours
- ✅ View upcoming events
- ✅ View own hours history
- ❌ Cannot access admin/staff features
- ❌ Cannot view other volunteers' data
- ❌ Cannot manage events or campaigns

**Use Cases:**
- Regular volunteers
- Community members
- Event participants

---

## Access Control Implementation

### Authentication Functions

#### `requireAuth()`
- Requires any authenticated user
- Used for: Volunteer dashboard, public authenticated pages

#### `requireAdmin()`
- Requires admin OR staff role
- Used for: Volunteer management, events, reports, campaigns
- **Both admin and staff can access these pages**

#### `requireAdminOnly()`
- Requires admin role ONLY
- Used for: User management, system settings, sensitive operations
- **Only admin can access these pages**

---

## Current Page Access

### Public Pages (No Authentication)
- `index.html` - Homepage
- `log_in.html` - Login page
- `register.html` - Registration page

### Volunteer Pages (`requireAuth()`)
- `dashboard_volunteer.html` - Volunteer dashboard

### Staff Pages (`requireAdmin()`)
- `dashboard_staff.html` - Staff dashboard (staff and admin can access)
- `reports.html` - Reports and analytics
- `events.html` - Events manager
- `campaigns.html` - Campaign scheduler

### Admin-Only Pages (`requireAdminOnly()`)
- `dashboard_admin.html` - Admin dashboard (admin only)
- *Future: User Management*
- *Future: System Settings*
- *Future: Advanced Configuration*

---

## Menu Display

### Homepage Menu (`index.html`)

**Public (Not Logged In):**
- Homepage
- Log In
- Register

**Volunteer (Logged In):**
- Homepage
- My Dashboard

**Staff (Logged In):**
- Homepage
- Staff Dashboard
- Reports
- Events Manager
- Campaigns

**Admin (Logged In):**
- Homepage
- Staff Dashboard
- Admin Dashboard
- Reports
- Events Manager
- Campaigns
- *(Future: Admin-only menu items)*

---

## Code Examples

### Check User Role
```javascript
// Check if admin
if (TFA_AUTH.isAdmin()) {
  // Admin-only code
}

// Check if staff
if (TFA_AUTH.isStaff()) {
  // Staff-only code
}

// Check if admin or staff
if (TFA_AUTH.isAdminOrStaff()) {
  // Admin/Staff code
}
```

### Protect Pages
```javascript
// Allow admin or staff
TFA_AUTH.requireAdmin();

// Allow only admin
TFA_AUTH.requireAdminOnly();

// Allow any authenticated user
TFA_AUTH.requireAuth();
```

### Conditional UI Elements
```javascript
// Hide admin-only buttons for staff
if (TFA_AUTH.isAdmin()) {
  document.getElementById('adminOnlyButton').style.display = '';
} else {
  document.getElementById('adminOnlyButton').style.display = 'none';
}
```

---

## Database Roles

In the `users` table, the `role` field can be:
- `'admin'` - Administrator
- `'staff'` - Staff member
- `'volunteer'` - Volunteer

**Constraint:** The database enforces these three values only.

---

## Test Accounts

After running `npm run seed`:

| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| Admin | admin@tfa.org | admin123 | Full access |
| Staff | staff@tfa.org | staff123 | Limited admin access |
| Volunteer | alex@tfa.org | volunteer123 | Basic access |

---

## Future Enhancements

### Planned Admin-Only Features
- User account management page
- System configuration page
- Advanced analytics dashboard
- Database backup/restore
- API key management
- Audit logs

### Planned Staff Features
- Bulk volunteer import
- Email campaign templates
- Event registration management
- Volunteer communication tools

---

## Security Notes

1. **Role checks are client-side** - For production, add server-side validation
2. **API endpoints** should verify roles on the backend
3. **Sensitive operations** should use `requireAdminOnly()`
4. **Staff limitations** are enforced in the frontend; backend should also validate

---

## Migration Notes

If you need to change a user's role:

```sql
-- Make a user admin
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';

-- Make a user staff
UPDATE users SET role = 'staff' WHERE email = 'user@example.com';

-- Make a user volunteer
UPDATE users SET role = 'volunteer' WHERE email = 'user@example.com';
```

---

**Last Updated**: November 2025

