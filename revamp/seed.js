const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./tfa.db');
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

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

(async () => {
  try {
    console.log('Seeding volunteers...');
    const volunteers = [
      ['Alex Johnson','alex@tfa.org','555-111-2222','Board member'],
      ['Priya Patel','priya@tfa.org','555-333-4444',null],
      ['Marco Rossi','marco@tfa.org',null,'Speaks Spanish & Italian'],
      ['Taylor Kim','taylor@tfa.org','555-999-0000','Student volunteer']
    ];
    for (const v of volunteers) {
      await run(`INSERT OR IGNORE INTO volunteers(name,email,phone,notes) VALUES (?,?,?,?)`, v);
    }

    console.log('Seeding events...');
    const today = new Date();
    function iso(d){ const z = new Date(d); return z.toISOString().slice(0,10); }
    function addDays(n){ const d = new Date(today); d.setDate(d.getDate()+n); return d; }

    const events = [
      ['Food Pantry Sorting', iso(addDays(3)), null, 'Main Warehouse', 'Sort and package donations'],
      ['Community Clothing Drive', iso(addDays(10)), null, 'Downtown Center', 'Accept and organize clothing donations'],
      ['Fundraiser Phone Bank', iso(addDays(14)), null, 'HQ', 'Call past donors']
    ];
    for (const e of events) {
      await run(`INSERT INTO events(name,start_date,end_date,location,description) VALUES (?,?,?,?,?)`, e);
    }

    const evs = await all(`SELECT id,name,start_date FROM events ORDER BY id ASC`);
    const vols = await all(`SELECT id,name FROM volunteers ORDER BY id ASC`);

    console.log('Seeding hours logs...');
    const logs = [
      [vols[0].id, evs[0].id, iso(addDays(-2)), 2.5, 'Evening shift'],
      [vols[0].id, evs[1].id, iso(addDays(-1)), 1.75, 'Setup crew'],
      [vols[1].id, evs[0].id, iso(addDays(-3)), 3.0, 'Packed boxes'],
      [vols[2].id, evs[2].id, iso(addDays(-1)), 2.0, 'Bilingual calls'],
      [vols[3].id, evs[1].id, iso(addDays(-5)), 4.0, 'Donation intake']
    ];
    for (const l of logs) {
      await run(`INSERT INTO hours_logs(volunteer_id,event_id,date,hours,notes) VALUES (?,?,?,?,?)`, l);
    }

    console.log('Seed complete.');
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
})();
