const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const DB_FILE = process.env.DB_FILE || './tfa.db';
const API_KEY = process.env.TFA_API_KEY || 'dev-key';
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- API key authentication for API routes ---
app.use('/api', (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (API_KEY && key !== API_KEY) {
    return res.status(401).json({error:'Unauthorized - Invalid API key'});
  }
  next();
});

const db = new sqlite3.Database(DB_FILE);

// Bootstrap: run schema once
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

// ===== Database Helpers =====
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

// Simple password hashing (use bcrypt in production!)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// ============================================
// AUTHENTICATION ENDPOINTS (Basic Implementation)
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await get(`
      SELECT id, email, role, is_active, password_hash 
      FROM users 
      WHERE email = ?
    `, [email.toLowerCase().trim()]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last_login
    await run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [user.id]);

    // Return user info (without password)
    delete user.password_hash;
    res.json({ 
      success: true, 
      user,
      message: 'Login successful'
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Register new volunteer account
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Create user account
    const userResult = await run(`
      INSERT INTO users(email, password_hash, role, is_active) 
      VALUES (?, ?, 'volunteer', 1)
    `, [email.toLowerCase().trim(), hashPassword(password)]);

    // Create volunteer profile
    const volResult = await run(`
      INSERT INTO volunteers(user_id, name, email, phone, status) 
      VALUES (?, ?, ?, ?, 'active')
    `, [userResult.lastID, name.trim(), email.toLowerCase().trim(), phone || null]);

    const user = await get(`SELECT id, email, role FROM users WHERE id = ?`, [userResult.lastID]);
    
    res.status(201).json({ 
      success: true, 
      user,
      message: 'Registration successful'
    });
  } catch (e) {
    if (e.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: String(e.message) });
    }
  }
});

// ============================================
// VOLUNTEERS ENDPOINTS
// ============================================

// Get all volunteers with filtering
app.get('/api/volunteers', async (req, res) => {
  try {
    const { q = '', status = '', skills = '' } = req.query;
    
    let where = '1=1';
    const params = [];

    if (q) {
      where += ` AND (lower(v.name) LIKE ? OR lower(v.email) LIKE ? OR v.phone LIKE ?)`;
      const searchTerm = `%${q.toLowerCase()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      where += ` AND v.status = ?`;
      params.push(status);
    }

    if (skills) {
      where += ` AND (v.skills LIKE ?)`;
      params.push(`%${skills}%`);
    }

    const rows = await all(`
      SELECT 
        v.*,
        u.role as user_role,
        (SELECT COUNT(*) FROM hours_logs WHERE volunteer_id = v.id AND status = 'approved') as total_logs,
        (SELECT COALESCE(SUM(hours), 0) FROM hours_logs WHERE volunteer_id = v.id AND status = 'approved') as total_hours
      FROM volunteers v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE ${where}
      ORDER BY v.name ASC
    `, params);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Get single volunteer by ID
app.get('/api/volunteers/:id', async (req, res) => {
  try {
    const volunteer = await get(`
      SELECT 
        v.*,
        u.email as user_email,
        u.role as user_role,
        (SELECT COUNT(*) FROM hours_logs WHERE volunteer_id = v.id AND status = 'approved') as total_logs,
        (SELECT COALESCE(SUM(hours), 0) FROM hours_logs WHERE volunteer_id = v.id AND status = 'approved') as total_hours
      FROM volunteers v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.id = ?
    `, [req.params.id]);

    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Get categories
    const categories = await all(`
      SELECT c.* FROM categories c
      JOIN volunteer_categories vc ON c.id = vc.category_id
      WHERE vc.volunteer_id = ?
    `, [req.params.id]);

    volunteer.categories = categories;

    res.json(volunteer);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Create new volunteer
app.post('/api/volunteers', async (req, res) => {
  try {
    const {
      name, email, phone, alternate_phone, address, city, state, zip_code,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      status, availability, skills, interests, 
      email_notifications, sms_notifications, notes
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' });
    }

    const result = await run(`
      INSERT INTO volunteers(
        name, email, phone, alternate_phone, address, city, state, zip_code,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        status, availability, skills, interests, 
        email_notifications, sms_notifications, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      name.trim(), email.toLowerCase().trim(), phone || null, alternate_phone || null,
      address || null, city || null, state || null, zip_code || null,
      emergency_contact_name || null, emergency_contact_phone || null, emergency_contact_relationship || null,
      status || 'Active', availability || null, skills || null, interests || null,
      email_notifications !== undefined ? email_notifications : 1,
      sms_notifications !== undefined ? sms_notifications : 0,
      notes || null
    ]);

    const volunteer = await get(`SELECT * FROM volunteers WHERE id = ?`, [result.lastID]);
    res.status(201).json(volunteer);
  } catch (e) {
    if (e.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(400).json({ error: String(e.message) });
    }
  }
});

// Update volunteer
app.put('/api/volunteers/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = [
      'name', 'email', 'phone', 'alternate_phone', 'address', 'city', 'state', 'zip_code',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      'status', 'availability', 'skills', 'interests',
      'email_notifications', 'sms_notifications', 'notes'
    ];
    
    const setFields = [];
    const params = [];
    
    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        setFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }
    
    if (setFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    params.push(id);
    
    await run(`
      UPDATE volunteers 
      SET ${setFields.join(', ')}
      WHERE id = ?
    `, params);
    
    const volunteer = await get(`SELECT * FROM volunteers WHERE id = ?`, [id]);
    res.json(volunteer);
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

// Delete volunteer
app.delete('/api/volunteers/:id', async (req, res) => {
  try {
    await run(`DELETE FROM volunteers WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Volunteer deleted' });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// ============================================
// EVENTS ENDPOINTS
// ============================================

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const { status = '', type = '', upcoming = '' } = req.query;
    
    let where = '1=1';
    const params = [];

    if (status) {
      where += ` AND status = ?`;
      params.push(status);
    }

    if (type) {
      where += ` AND event_type = ?`;
      params.push(type);
    }

    if (upcoming === 'true') {
      where += ` AND date(start_date) >= date('now')`;
    }

    const rows = await all(`
      SELECT 
        e.*,
        (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registration_count
      FROM events e
      WHERE ${where}
      ORDER BY date(start_date) ASC
    `, params);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Get single event
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await get(`SELECT * FROM events WHERE id = ?`, [req.params.id]);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get registrations
    const registrations = await all(`
      SELECT 
        er.*,
        v.name as volunteer_name,
        v.email as volunteer_email,
        v.phone as volunteer_phone
      FROM event_registrations er
      JOIN volunteers v ON er.volunteer_id = v.id
      WHERE er.event_id = ?
      ORDER BY er.registered_at DESC
    `, [req.params.id]);

    event.registrations = registrations;

    res.json(event);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Create event
app.post('/api/events', async (req, res) => {
  try {
    const {
      name, description, start_date, end_date, start_time, end_time,
      location, address, city, state, zip_code, event_type, status, capacity,
      organizer_name, organizer_email, organizer_phone, requirements,
      min_volunteers, max_volunteers, created_by
    } = req.body;

    if (!name || !start_date) {
      return res.status(400).json({ error: 'Name and start_date required' });
    }

    const result = await run(`
      INSERT INTO events(
        name, description, start_date, end_date, start_time, end_time,
        location, address, city, state, zip_code, event_type, status, capacity,
        organizer_name, organizer_email, organizer_phone, requirements,
        min_volunteers, max_volunteers, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      name.trim(), description || null, start_date, end_date || null,
      start_time || null, end_time || null, location || null,
      address || null, city || null, state || null, zip_code || null,
      event_type || null, status || 'scheduled', capacity || null,
      organizer_name || null, organizer_email || null, organizer_phone || null,
      requirements || null, min_volunteers || null, max_volunteers || null,
      created_by || null
    ]);

    const event = await get(`SELECT * FROM events WHERE id = ?`, [result.lastID]);
    res.status(201).json(event);
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

// Update event
app.put('/api/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    
    const allowedFields = [
      'name', 'description', 'start_date', 'end_date', 'start_time', 'end_time',
      'location', 'address', 'city', 'state', 'zip_code', 'event_type', 'status', 'capacity',
      'organizer_name', 'organizer_email', 'organizer_phone', 'requirements',
      'min_volunteers', 'max_volunteers'
    ];
    
    const setFields = [];
    const params = [];
    
    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        setFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }
    
    if (setFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    params.push(id);
    
    await run(`UPDATE events SET ${setFields.join(', ')} WHERE id = ?`, params);
    
    const event = await get(`SELECT * FROM events WHERE id = ?`, [id]);
    res.json(event);
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  try {
    await run(`DELETE FROM events WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Event deleted' });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// ============================================
// EVENT REGISTRATIONS
// ============================================

// Register volunteer for event
app.post('/api/events/:eventId/register', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { volunteer_id, notes } = req.body;

    if (!volunteer_id) {
      return res.status(400).json({ error: 'volunteer_id required' });
    }

    // Check event capacity
    const event = await get(`SELECT * FROM events WHERE id = ?`, [eventId]);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.capacity && event.registered_count >= event.capacity) {
      return res.status(400).json({ error: 'Event is at full capacity' });
    }

    const result = await run(`
      INSERT INTO event_registrations(event_id, volunteer_id, status, notes) 
      VALUES (?, ?, 'registered', ?)
    `, [eventId, volunteer_id, notes || null]);

    const registration = await get(`SELECT * FROM event_registrations WHERE id = ?`, [result.lastID]);
    res.status(201).json(registration);
  } catch (e) {
    if (e.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Already registered for this event' });
    } else {
      res.status(400).json({ error: String(e.message) });
    }
  }
});

// Update registration status
app.put('/api/registrations/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    await run(`
      UPDATE event_registrations 
      SET status = ?, notes = COALESCE(?, notes),
          confirmed_at = CASE WHEN ? = 'confirmed' THEN datetime('now') ELSE confirmed_at END
      WHERE id = ?
    `, [status, notes || null, status, req.params.id]);

    const registration = await get(`SELECT * FROM event_registrations WHERE id = ?`, [req.params.id]);
    res.json(registration);
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

// Cancel registration
app.delete('/api/registrations/:id', async (req, res) => {
  try {
    await run(`DELETE FROM event_registrations WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Registration cancelled' });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// ============================================
// HOURS LOGS ENDPOINTS
// ============================================

// Get hours logs with filtering
app.get('/api/logs', async (req, res) => {
  try {
    const { volunteer_id = '', event_id = '', status = '', start_date = '', end_date = '' } = req.query;
    
    let where = '1=1';
    const params = [];

    if (volunteer_id) {
      where += ` AND h.volunteer_id = ?`;
      params.push(volunteer_id);
    }

    if (event_id) {
      where += ` AND h.event_id = ?`;
      params.push(event_id);
    }

    if (status) {
      where += ` AND h.status = ?`;
      params.push(status);
    }

    if (start_date) {
      where += ` AND date(h.date) >= date(?)`;
      params.push(start_date);
    }

    if (end_date) {
      where += ` AND date(h.date) <= date(?)`;
      params.push(end_date);
    }

    const rows = await all(`
      SELECT 
        h.*,
        v.name as volunteer_name,
        v.email as volunteer_email,
        e.name as event_name,
        u.email as approved_by_email
      FROM hours_logs h
      JOIN volunteers v ON h.volunteer_id = v.id
      LEFT JOIN events e ON h.event_id = e.id
      LEFT JOIN users u ON h.approved_by = u.id
      WHERE ${where}
      ORDER BY date(h.date) DESC, h.created_at DESC
    `, params);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Create hours log
app.post('/api/logs', async (req, res) => {
  try {
    const { volunteer_id, event_id, date, hours, notes, status } = req.body;

    if (!volunteer_id || !date || !hours) {
      return res.status(400).json({ error: 'volunteer_id, date, and hours required' });
    }

    if (hours <= 0 || hours > 24) {
      return res.status(400).json({ error: 'Hours must be between 0 and 24' });
    }

    const result = await run(`
      INSERT INTO hours_logs(volunteer_id, event_id, date, hours, notes, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [volunteer_id, event_id || null, date, Number(hours), notes || null, status || 'pending']);

    const log = await get(`SELECT * FROM hours_logs WHERE id = ?`, [result.lastID]);
    res.status(201).json(log);
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

// Update hours log
app.put('/api/logs/:id', async (req, res) => {
  try {
    const { event_id, date, hours, notes, status, approved_by } = req.body;
    
    const updates = [];
    const params = [];

    if (event_id !== undefined) { updates.push('event_id = ?'); params.push(event_id); }
    if (date) { updates.push('date = ?'); params.push(date); }
    if (hours) {
      if (hours <= 0 || hours > 24) {
        return res.status(400).json({ error: 'Hours must be between 0 and 24' });
      }
      updates.push('hours = ?');
      params.push(Number(hours));
    }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (status) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'approved' && approved_by) {
        updates.push('approved_by = ?', 'approved_at = datetime(\'now\')');
        params.push(approved_by);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(req.params.id);

    await run(`UPDATE hours_logs SET ${updates.join(', ')} WHERE id = ?`, params);

    const log = await get(`SELECT * FROM hours_logs WHERE id = ?`, [req.params.id]);
    res.json(log);
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

// Delete hours log
app.delete('/api/logs/:id', async (req, res) => {
  try {
    await run(`DELETE FROM hours_logs WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Hours log deleted' });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// ============================================
// VOLUNTEER NOTES ENDPOINTS
// ============================================

// Get notes for a volunteer
app.get('/api/volunteers/:id/notes', async (req, res) => {
  try {
    const { include_private = 'false' } = req.query;
    
    let where = 'volunteer_id = ?';
    if (include_private !== 'true') {
      where += ' AND is_private = 0';
    }

    const notes = await all(`
      SELECT 
        vn.*,
        u.email as created_by_email
      FROM volunteer_notes vn
      LEFT JOIN users u ON vn.created_by = u.id
      WHERE ${where}
      ORDER BY vn.created_at DESC
    `, [req.params.id]);

    res.json(notes);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Add note to volunteer
app.post('/api/volunteers/:id/notes', async (req, res) => {
  try {
    const { note_type, note, is_private, created_by } = req.body;

    if (!note) {
      return res.status(400).json({ error: 'Note content required' });
    }

    const result = await run(`
      INSERT INTO volunteer_notes(volunteer_id, created_by, note_type, note, is_private) 
      VALUES (?, ?, ?, ?, ?)
    `, [req.params.id, created_by || null, note_type || 'general', note, is_private || 0]);

    const newNote = await get(`SELECT * FROM volunteer_notes WHERE id = ?`, [result.lastID]);
    res.status(201).json(newNote);
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

// ============================================
// CATEGORIES ENDPOINTS
// ============================================

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const { type = '' } = req.query;
    
    let where = '1=1';
    const params = [];

    if (type) {
      where += ` AND category_type = ?`;
      params.push(type);
    }

    const categories = await all(`
      SELECT * FROM categories WHERE ${where} ORDER BY name ASC
    `, params);

    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Create category
app.post('/api/categories', async (req, res) => {
  try {
    const { name, category_type, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    const result = await run(`
      INSERT INTO categories(name, category_type, description) 
      VALUES (?, ?, ?)
    `, [name.trim(), category_type || null, description || null]);

    const category = await get(`SELECT * FROM categories WHERE id = ?`, [result.lastID]);
    res.status(201).json(category);
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

// ============================================
// REPORTS ENDPOINTS
// ============================================

app.get('/api/reports', async (req, res) => {
  try {
    const { view='detail', group='volunteer', start, end, vq='', eq='', status='approved' } = req.query;

    let where = `h.status = ?`;
    const params = [status];

    if (start) { where += ` AND date(h.date) >= date(?)`; params.push(start); }
    if (end)   { where += ` AND date(h.date) <= date(?)`; params.push(end); }
    if (vq)    { where += ` AND (lower(v.name) LIKE ? OR lower(v.email) LIKE ?)`; 
                 params.push(`%${vq.toLowerCase()}%`, `%${vq.toLowerCase()}%`); }
    if (eq)    { where += ` AND (e.name IS NOT NULL AND lower(e.name) LIKE ?)`; 
                 params.push(`%${eq.toLowerCase()}%`); }

    if (view === 'detail') {
      const rows = await all(`
        SELECT
          h.id, h.date, h.hours, h.notes, h.status,
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
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = {
      total_volunteers: 0,
      active_volunteers: 0,
      total_events: 0,
      upcoming_events: 0,
      total_hours: 0,
      pending_hours: 0,
      total_registrations: 0
    };

    stats.total_volunteers = (await get(`SELECT COUNT(*) as count FROM volunteers`)).count;
    stats.active_volunteers = (await get(`SELECT COUNT(*) as count FROM volunteers WHERE status = 'Active'`)).count;
    stats.total_events = (await get(`SELECT COUNT(*) as count FROM events`)).count;
    stats.upcoming_events = (await get(`SELECT COUNT(*) as count FROM events WHERE date(start_date) >= date('now') AND status = 'scheduled'`)).count;
    stats.total_hours = (await get(`SELECT COALESCE(SUM(hours), 0) as total FROM hours_logs WHERE status = 'approved'`)).total;
    stats.pending_hours = (await get(`SELECT COALESCE(SUM(hours), 0) as total FROM hours_logs WHERE status = 'pending'`)).total;
    stats.total_registrations = (await get(`SELECT COUNT(*) as count FROM event_registrations`)).count;

    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`\n🚀 TFA CRM API running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${DB_FILE}`);
  console.log(`🔑 API Key: ${API_KEY}\n`);
});
