# TFA CRM (Enhanced)

A comprehensive volunteer management system for The Family Advocates, featuring robust database design, authentication capabilities, and full CRUD operations.

## Quick start

```bash
cd revamp
npm install

# If you get sqlite3 errors on Windows, rebuild the module:
npm rebuild sqlite3

# Seed the database with sample data
npm run seed

# Start the server
npm start
```

Open http://localhost:4000 in your browser.

## Pages

- **Homepage**: `/index.html`
- **Volunteer Dashboard**: `/dashboard_volunteer.html`
- **Admin Dashboard**: `/dashboard_admin.html`
- **Reports**: `/reports.html`
- **Events**: `/events.html`
- **Login**: `/log_in.html`
- **Register**: `/register.html`

## Test Accounts

After running `npm run seed`, you can use these test accounts:

- **Admin**: `admin@tfa.org` / `admin123`
- **Staff**: `staff@tfa.org` / `staff123`
- **Volunteer**: `alex@tfa.org` / `volunteer123`

## Database Structure

The enhanced database includes the following tables:

### Core Tables
- **users** - User accounts with authentication (admin, staff, volunteer roles)
- **sessions** - Session management for authentication
- **volunteers** - Comprehensive volunteer profiles with emergency contacts, skills, availability
- **events** - Events with capacity management, location, organizer details
- **event_registrations** - Volunteer sign-ups for events
- **hours_logs** - Volunteer hour tracking with approval workflow
- **volunteer_notes** - Activity log and notes for each volunteer
- **categories** - Skills, event types, and other categorizations
- **volunteer_categories** - Many-to-many relationship for volunteer skills
- **event_categories** - Many-to-many relationship for event types

### Key Features
- **Foreign key constraints** with proper CASCADE/SET NULL behaviors
- **Check constraints** for data validation (email format, status values, hour limits)
- **Automatic timestamps** with triggers (created_at, updated_at)
- **Indexes** for query performance
- **Approval workflow** for volunteer hours
- **Status tracking** for volunteers, events, and registrations
- **Emergency contact** information for volunteers
- **Event capacity management** with automatic registration counting

## 🔌 API Endpoints

All API endpoints require an `x-api-key` header. Default key is `dev-key` (see environment configuration).

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - New volunteer registration

### Volunteers
- `GET /api/volunteers` - List all volunteers (supports filtering)
- `GET /api/volunteers/:id` - Get single volunteer
- `POST /api/volunteers` - Create volunteer
- `PUT /api/volunteers/:id` - Update volunteer
- `DELETE /api/volunteers/:id` - Delete volunteer
- `GET /api/volunteers/:id/notes` - Get volunteer notes
- `POST /api/volunteers/:id/notes` - Add note to volunteer

### Events
- `GET /api/events` - List all events (supports filtering)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:eventId/register` - Register volunteer for event

### Event Registrations
- `PUT /api/registrations/:id` - Update registration status
- `DELETE /api/registrations/:id` - Cancel registration

### Hours Logs
- `GET /api/logs` - List hours logs (supports filtering)
- `POST /api/logs` - Create hours log
- `PUT /api/logs/:id` - Update hours log (includes approval)
- `DELETE /api/logs/:id` - Delete hours log

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category

### Reports & Analytics
- `GET /api/reports` - Generate detailed or summary reports
- `GET /api/dashboard/stats` - Dashboard statistics

## Environment Configuration

Copy `env.example` to `.env` and customize:

```bash
cp env.example .env
```

Key configuration options:
```
PORT=4000
TFA_API_KEY=dev-key
DB_FILE=./tfa.db
```

## Database Management

### Reset Database
To start fresh with new sample data:
```bash
# Delete the existing database
del tfa.db  # Windows
rm tfa.db   # Mac/Linux

# Reseed
npm run seed
```

### View Database
You can inspect the SQLite database using:
- [DB Browser for SQLite](https://sqlitebrowser.org/) (GUI)
- SQLite CLI: `sqlite3 tfa.db`

## Security Features

- **Password hashing** (SHA-256 for demo - use bcrypt in production)
- **API key authentication**
- **Email format validation**
- **Role-based access control** (admin, staff, volunteer)
- **Input validation** and sanitization
- **SQL injection protection** via parameterized queries
- **Foreign key constraints** for data integrity

## What's New in Enhanced Version

### Database Improvements
**Users & Authentication** - Secure user accounts with role-based access  
**Enhanced Volunteer Profiles** - Emergency contacts, skills, preferences, status tracking  
**Advanced Event Management** - Capacity limits, registration tracking, event types  
**Approval Workflow** - Hour logs require admin approval  
**Activity Logging** - Track all volunteer interactions and notes  
**Categories & Tags** - Flexible categorization for skills and event types  
**Automatic Updates** - Triggers maintain data consistency  
**Performance Indexes** - Optimized queries for large datasets  

### API Improvements
**Full CRUD Operations** - Create, Read, Update, Delete for all resources  
**Advanced Filtering** - Search and filter across all endpoints  
**Relationships** - Proper joins and related data fetching  
**Dashboard Stats** - Real-time statistics for admin dashboard  

## Troubleshooting

### SQLite3 Module Issues

If you encounter errors like "invalid ELF header" or "bindings file not found":

**On Windows (Command Prompt or PowerShell):**
```bash
npm rebuild sqlite3
# OR
npm uninstall sqlite3
npm install sqlite3 --build-from-source
```

**If running in WSL:**
- Either use Windows Command Prompt/PowerShell to run the app
- OR delete node_modules and reinstall in WSL: `rm -rf node_modules && npm install`

### Node.js Version Issues

This application works best with Node.js LTS versions (v18.x, v20.x, or v22.x). If you're on v24.x+ and experiencing issues, consider downgrading to an LTS version.

## Notes

- **This is a development version** - Add proper authentication middleware, rate limiting, and security hardening before production use
- **Password hashing** - Uses simple SHA-256 for demo; implement bcrypt or argon2 for production
- **Session management** - Currently basic; implement JWT or secure session cookies for production
- **Database** - SQLite is suitable for small-medium deployments; consider PostgreSQL/MySQL for larger scale
- **CORS** - Currently allows all origins; restrict in production

## Next Steps for Production

1. Implement proper authentication middleware (JWT or session-based)
2. Add input validation library (e.g., Joi, Yup)
3. Replace SHA-256 with bcrypt for password hashing
4. Add rate limiting (e.g., express-rate-limit)
5. Implement logging (e.g., winston, morgan)
6. Add email notifications (e.g., nodemailer)
7. Set up proper error handling and monitoring
8. Add unit and integration tests
9. Deploy with HTTPS and environment-specific configs
10. Add backup strategy for database

