/**
 * TFA CRM Authentication Helper
 * Shared authentication functions for all pages
 */

const TFA_AUTH = {
  API_KEY: 'dev-key',
  API_BASE: '/api',
  
  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('tfa_current_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  /**
   * Get user role
   */
  getUserRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  },

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    return this.getUserRole() === role;
  },

  /**
   * Check if user is admin or staff
   */
  isAdminOrStaff() {
    const role = this.getUserRole();
    return role === 'admin' || role === 'staff';
  },

  /**
   * Check if user is admin only
   */
  isAdmin() {
    return this.getUserRole() === 'admin';
  },

  /**
   * Check if user is staff only
   */
  isStaff() {
    return this.getUserRole() === 'staff';
  },

  /**
   * Sign out user
   */
  signOut() {
    localStorage.removeItem('tfa_current_user');
    localStorage.removeItem('tfa_api_key');
    localStorage.removeItem('tfa_remember_me');
    window.location.href = 'log_in.html';
  },

  /**
   * Redirect to login if not authenticated
   */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'log_in.html';
      return false;
    }
    return true;
  },

  /**
   * Require admin or staff (for operational pages)
   * Staff can access: volunteer management, events, reports, campaigns
   */
  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdminOrStaff()) {
      alert('Access denied. Admin or staff role required.');
      window.location.href = 'dashboard_volunteer.html';
      return false;
    }
    return true;
  },

  /**
   * Require admin only (for sensitive operations)
   * Admin only: user management, system settings, etc.
   */
  requireAdminOnly() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) {
      alert('Access denied. Administrator role required.');
      window.location.href = 'dashboard_admin.html';
      return false;
    }
    return true;
  },

  /**
   * Make authenticated API call
   */
  async apiCall(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.API_KEY,
      ...options.headers
    };

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  },

  /**
   * Display user info in header (if element exists)
   */
  displayUserInfo() {
    const user = this.getCurrentUser();
    if (!user) return;

    // Update any element with id="userEmail"
    const emailEl = document.getElementById('userEmail');
    if (emailEl) {
      emailEl.textContent = user.email;
    }

    // Update any element with id="userRole"
    const roleEl = document.getElementById('userRole');
    if (roleEl) {
      const roleLabels = {
        'admin': 'Administrator',
        'staff': 'Staff',
        'volunteer': 'Volunteer'
      };
      roleEl.textContent = roleLabels[user.role] || user.role;
    }
  },

  /**
   * Initialize sign-out button
   */
  initSignOutButton() {
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to sign out?')) {
          this.signOut();
        }
      });
    }
  }
};

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  TFA_AUTH.displayUserInfo();
  TFA_AUTH.initSignOutButton();
});

