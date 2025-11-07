const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const DB_FILE = './tfa.db';
const API_KEY = process.env.TFA_API_KEY || 'dev-key';
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- very light API key check for API routes only ---
app.use('/api', (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (API_KEY && key !== API_KEY) return res.status(401).json({error:'Unauthorized'});
  next();
});

const db = new sqlite3.Database(DB_FILE);

// Bootstrapping: run schema once
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

// Helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err){ err ? reject(err) : resolve(this); });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

// ===== Volunteers =====
app.get('/api/volunteers', async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const rows = await all(`
    SELECT id,name,email,phone,joined_at,notes
    FROM volunteers
    WHERE (? = '' OR lower(name) LIKE ? OR lower(email) LIKE ?)
    ORDER BY name ASC
  `, [q, `%${q}%`, `%${q}%`]);
  res.json(rows);
});

app.post('/api/volunteers', async (req, res) => {
  const {name, email, phone, notes} = req.body || {};
  if (!name || !email) return res.status(400).json({error:'name and email required'});
  try {
    const r = await run(`
      INSERT INTO volunteers(name,email,phone,notes) VALUES (?,?,?,?)
    `, [name.trim(), email.trim().toLowerCase(), phone||null, notes||null]);
    const row = await get(`SELECT * FROM volunteers WHERE id=?`, [r.lastID]);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({error:String(e.message)});
  }
});

// ===== Events =====
app.get('/api/events', async (req, res) => {
  const rows = await all(`
    SELECT id,name,start_date,end_date,location,description
    FROM events
    ORDER BY date(start_date) ASC
  `);
  res.json(rows);
});

app.post('/api/events', async (req, res) => {
  const {name, start_date, end_date, location, description} = req.body || {};
  if (!name || !start_date) return res.status(400).json({error:'name and start_date required'});
  const r = await run(`
    INSERT INTO events(name,start_date,end_date,location,description) VALUES (?,?,?,?,?)
  `, [name.trim(), start_date, end_date||null, location||null, description||null]);
  const row = await get(`SELECT * FROM events WHERE id=?`, [r.lastID]);
  res.status(201).json(row);
});

// ===== Hours (Logs) =====
app.post('/api/logs', async (req, res) => {
  const { volunteer_id, event_id, date, hours, notes } = req.body || {};
  if (!volunteer_id || !date || !hours) return res.status(400).json({error:'volunteer_id, date, hours required'});
  const r = await run(`
    INSERT INTO hours_logs(volunteer_id,event_id,date,hours,notes) VALUES (?,?,?,?,?)
  `, [volunteer_id, event_id||null, date, Number(hours), notes||null]);
  const row = await get(`SELECT * FROM hours_logs WHERE id=?`, [r.lastID]);
  res.status(201).json(row);
});

// Detail & Summary Reports
app.get('/api/reports', async (req, res) => {
  const { view='detail', group='volunteer', start, end, vq='', eq='' } = req.query;

  let where = `1=1`;
  const params = [];
  if (start) { where += ` AND date(h.date) >= date(?)`; params.push(start); }
  if (end)   { where += ` AND date(h.date) <= date(?)`; params.push(end); }
  if (vq)    { where += ` AND (lower(v.name) LIKE ? OR lower(v.email) LIKE ?)`; params.push(`%${vq.toLowerCase()}%`, `%${vq.toLowerCase()}%`); }
  if (eq)    { where += ` AND (e.name IS NOT NULL AND lower(e.name) LIKE ?)`; params.push(`%${eq.toLowerCase()}%`); }

  if (view === 'detail') {
    const rows = await all(`
      SELECT
        h.id, h.date, h.hours, h.notes,
        v.id AS volunteer_id, v.name AS volunteer_name, v.email AS volunteer_email,
        e.id AS event_id, e.name AS event_name
      FROM hours_logs h
      JOIN volunteers v ON v.id = h.volunteer_id
      LEFT JOIN events e ON e.id = h.event_id
      WHERE ${where}
      ORDER BY date(h.date) DESC, lower(v.name) ASC
    `, params);
    return res.json({ view, rows });
  }

  let groupExpr = `v.name`;
  if (group === 'event') { groupExpr = `COALESCE(e.name,'Unassigned')`; }
  if (group === 'month') { groupExpr = `strftime('%Y-%m', h.date)`; }

  const rows = await all(`
    SELECT ${groupExpr} AS "group", SUM(h.hours) AS hours
    FROM hours_logs h
    JOIN volunteers v ON v.id = h.volunteer_id
    LEFT JOIN events e ON e.id = h.event_id
    WHERE ${where}
    GROUP BY 1
    ORDER BY hours DESC
  `, params);

  res.json({ view:'summary', group, rows });
});

app.listen(PORT, () => console.log(`TFA CRM API on http://localhost:${PORT}`));
