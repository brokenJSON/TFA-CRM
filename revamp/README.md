# TFA CRM (Local)

A tiny, ready-to-run stack for volunteers, events, hours logs, and reports.

## Quick start

```bash
cd tfa-crm
npm install
npm run seed     # creates tfa.db and seeds sample data
npm start        # http://localhost:4000
```

Open http://localhost:4000 in your browser.

- Volunteer Dashboard: `/volunteer_dashboard.html`
- Admin Directory: `/dashboard_admin.html`
- Reports: `/reports.html`

API uses an API key header. Default key is `dev-key` (see `.env.example`).

## Env

Copy `.env.example` to `.env` if you want to change:

```
TFA_API_KEY=dev-key
PORT=4000
```

## Notes

- DB is SQLite (`tfa.db` in project root).
- To reset: delete `tfa.db`, then `npm run seed` again.
- This is intentionally minimal; add authentication and role checks before production.
