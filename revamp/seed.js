const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const crypto = require('crypto');

const db = new sqlite3.Database('./tfa.db');
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

// Helper to hash passwords (simple for demo - use bcrypt in production)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

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
    console.log('🌱 Seeding enhanced database...\n');

    // ============================================
    // SEED USERS (for authentication)
    // ============================================
    console.log('👤 Seeding users...');
    const users = [
      ['admin@tfa.org', hashPassword('admin123'), 'admin', 1],
      ['staff@tfa.org', hashPassword('staff123'), 'staff', 1],
      ['alex@tfa.org', hashPassword('volunteer123'), 'volunteer', 1],
      ['priya@tfa.org', hashPassword('volunteer123'), 'volunteer', 1],
      ['marco@tfa.org', hashPassword('volunteer123'), 'volunteer', 1],
      ['taylor@tfa.org', hashPassword('volunteer123'), 'volunteer', 1],
    ];

    for (const [email, password_hash, role, is_active] of users) {
      await run(`
        INSERT OR IGNORE INTO users(email, password_hash, role, is_active) 
        VALUES (?,?,?,?)
      `, [email, password_hash, role, is_active]);
    }

    const userRecords = await all(`SELECT id, email, role FROM users ORDER BY id ASC`);
    console.log(`   ✓ Created ${userRecords.length} users`);

    // ============================================
    // SEED CATEGORIES
    // ============================================
    console.log('\n🏷️  Seeding categories...');
    const categories = [
      ['Spanish Speaking', 'volunteer_skill', 'Volunteers who speak Spanish'],
      ['Italian Speaking', 'volunteer_skill', 'Volunteers who speak Italian'],
      ['Driver', 'volunteer_skill', 'Has valid driver license and can transport'],
      ['Cooking', 'volunteer_skill', 'Cooking and food preparation skills'],
      ['Teaching', 'volunteer_skill', 'Teaching or tutoring experience'],
      ['Technology', 'volunteer_skill', 'Computer and technology skills'],
      ['Food Distribution', 'event_type', 'Food pantry and distribution events'],
      ['Clothing Drive', 'event_type', 'Clothing collection and distribution'],
      ['Fundraising', 'event_type', 'Fundraising activities'],
      ['Training', 'event_type', 'Training and orientation sessions'],
    ];

    for (const [name, type, desc] of categories) {
      await run(`
        INSERT OR IGNORE INTO categories(name, category_type, description) 
        VALUES (?,?,?)
      `, [name, type, desc]);
    }

    const categoryRecords = await all(`SELECT id, name FROM categories ORDER BY id ASC`);
    console.log(`   ✓ Created ${categoryRecords.length} categories`);

    // ============================================
    // SEED VOLUNTEERS (enhanced)
    // ============================================
    console.log('\n🤝 Seeding volunteers...');
    const volunteers = [
      {
        user_id: userRecords.find(u => u.email === 'alex@tfa.org')?.id,
        name: 'Alex Johnson',
        email: 'alex@tfa.org',
        phone: '555-111-2222',
        alternate_phone: '555-111-3333',
        address: '123 Main St',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37201',
        emergency_contact_name: 'Sarah Johnson',
        emergency_contact_phone: '555-111-4444',
        emergency_contact_relationship: 'Spouse',
        status: 'Active',
        availability: 'weekdays,evenings',
        skills: 'spanish,driving',
        interests: 'Food distribution, Community outreach',
        email_notifications: 1,
        sms_notifications: 1,
        notes: 'Board member, very reliable'
      },
      {
        user_id: userRecords.find(u => u.email === 'priya@tfa.org')?.id,
        name: 'Priya Patel',
        email: 'priya@tfa.org',
        phone: '555-333-4444',
        address: '456 Oak Ave',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37203',
        emergency_contact_name: 'Raj Patel',
        emergency_contact_phone: '555-333-5555',
        emergency_contact_relationship: 'Father',
        status: 'Active',
        availability: 'weekends',
        skills: 'teaching,technology',
        interests: 'Youth programs, Education',
        email_notifications: 1,
        sms_notifications: 0,
        notes: 'Great with technology'
      },
      {
        user_id: userRecords.find(u => u.email === 'marco@tfa.org')?.id,
        name: 'Marco Rossi',
        email: 'marco@tfa.org',
        phone: '555-555-6666',
        address: '789 Elm St',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37205',
        emergency_contact_name: 'Maria Rossi',
        emergency_contact_phone: '555-555-7777',
        emergency_contact_relationship: 'Sister',
        status: 'Active',
        availability: 'flexible',
        skills: 'spanish,italian,cooking',
        interests: 'Food programs, Cultural events',
        email_notifications: 1,
        sms_notifications: 1,
        notes: 'Speaks Spanish & Italian fluently'
      },
      {
        user_id: userRecords.find(u => u.email === 'taylor@tfa.org')?.id,
        name: 'Taylor Kim',
        email: 'taylor@tfa.org',
        phone: '555-999-0000',
        address: '321 Pine Rd',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37204',
        emergency_contact_name: 'Jennifer Kim',
        emergency_contact_phone: '555-999-1111',
        emergency_contact_relationship: 'Mother',
        status: 'Active',
        availability: 'evenings,weekends',
        skills: 'social_media,photography',
        interests: 'Marketing, Social media, Events',
        email_notifications: 1,
        sms_notifications: 1,
        notes: 'Student volunteer, excellent social media skills'
      },
      {
        user_id: userRecords.find(u => u.email === 'staff@tfa.org')?.id,
        name: 'Staff Member',
        email: 'staff@tfa.org',
        phone: '555-200-3000',
        address: '500 Office Blvd',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37201',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '555-200-3001',
        emergency_contact_relationship: 'Colleague',
        status: 'Active',
        availability: 'weekdays',
        skills: 'coordination,management',
        interests: 'Volunteer coordination, Program management',
        email_notifications: 1,
        sms_notifications: 0,
        notes: 'Staff member - coordinates volunteer activities'
      },
      {
        user_id: null,
        name: 'Jordan Lee',
        email: 'jordan@email.com',
        phone: '555-777-8888',
        address: '654 Cedar Ln',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37206',
        emergency_contact_name: 'Chris Lee',
        emergency_contact_phone: '555-777-9999',
        emergency_contact_relationship: 'Partner',
        status: 'On-hold',
        availability: 'weekdays',
        skills: 'driving,logistics',
        interests: 'Transportation, Delivery',
        email_notifications: 1,
        sms_notifications: 0,
        notes: 'On hold due to work commitments, will return in 3 months'
      }
    ];

    for (const vol of volunteers) {
      await run(`
        INSERT INTO volunteers(
          user_id, name, email, phone, alternate_phone, address, city, state, zip_code,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
          status, availability, skills, interests, 
          email_notifications, sms_notifications, notes
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        vol.user_id, vol.name, vol.email, vol.phone, vol.alternate_phone || null,
        vol.address || null, vol.city || null, vol.state || null, vol.zip_code || null,
        vol.emergency_contact_name || null, vol.emergency_contact_phone || null, 
        vol.emergency_contact_relationship || null, vol.status, vol.availability || null,
        vol.skills || null, vol.interests || null, vol.email_notifications,
        vol.sms_notifications, vol.notes || null
      ]);
    }

    const volRecords = await all(`SELECT id, name, email FROM volunteers ORDER BY id ASC`);
    console.log(`   ✓ Created ${volRecords.length} volunteers`);

    // ============================================
    // ASSIGN CATEGORIES TO VOLUNTEERS
    // ============================================
    console.log('\n🔗 Linking volunteers to categories...');
    const volCategoryLinks = [
      [volRecords[0].id, categoryRecords.find(c => c.name === 'Spanish Speaking')?.id],
      [volRecords[0].id, categoryRecords.find(c => c.name === 'Driver')?.id],
      [volRecords[1].id, categoryRecords.find(c => c.name === 'Teaching')?.id],
      [volRecords[1].id, categoryRecords.find(c => c.name === 'Technology')?.id],
      [volRecords[2].id, categoryRecords.find(c => c.name === 'Spanish Speaking')?.id],
      [volRecords[2].id, categoryRecords.find(c => c.name === 'Italian Speaking')?.id],
      [volRecords[2].id, categoryRecords.find(c => c.name === 'Cooking')?.id],
      [volRecords[4].id, categoryRecords.find(c => c.name === 'Driver')?.id],
    ];

    for (const [vol_id, cat_id] of volCategoryLinks) {
      if (vol_id && cat_id) {
        await run(`INSERT OR IGNORE INTO volunteer_categories(volunteer_id, category_id) VALUES (?,?)`, [vol_id, cat_id]);
      }
    }
    console.log(`   ✓ Created ${volCategoryLinks.length} category links`);

    // ============================================
    // SEED EVENTS (enhanced)
    // ============================================
    console.log('\n📅 Seeding events...');
    const today = new Date();
    function iso(d) { return d.toISOString().slice(0,10); }
    function addDays(n) { const d = new Date(today); d.setDate(d.getDate()+n); return d; }

    const adminUser = userRecords.find(u => u.role === 'admin');
    
    const events = [
      {
        name: 'Food Pantry Sorting',
        description: 'Sort and package food donations for distribution to families in need',
        start_date: iso(addDays(3)),
        end_date: iso(addDays(3)),
        start_time: '09:00',
        end_time: '13:00',
        location: 'Main Warehouse',
        address: '100 Industrial Pkwy',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37210',
        event_type: 'volunteer',
        status: 'scheduled',
        capacity: 15,
        organizer_name: 'Admin User',
        organizer_email: 'admin@tfa.org',
        organizer_phone: '555-100-2000',
        requirements: 'Comfortable with physical work, able to lift 25 lbs',
        min_volunteers: 5,
        max_volunteers: 15,
        created_by: adminUser?.id
      },
      {
        name: 'Community Clothing Drive',
        description: 'Accept and organize clothing donations from the community',
        start_date: iso(addDays(10)),
        end_date: iso(addDays(10)),
        start_time: '10:00',
        end_time: '16:00',
        location: 'Downtown Center',
        address: '200 Main St',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37201',
        event_type: 'volunteer',
        status: 'scheduled',
        capacity: 10,
        organizer_name: 'Admin User',
        organizer_email: 'admin@tfa.org',
        organizer_phone: '555-100-2000',
        requirements: 'Friendly and welcoming attitude',
        min_volunteers: 3,
        max_volunteers: 10,
        created_by: adminUser?.id
      },
      {
        name: 'Fundraiser Phone Bank',
        description: 'Call past donors to update them on our work and request continued support',
        start_date: iso(addDays(14)),
        end_date: iso(addDays(14)),
        start_time: '17:00',
        end_time: '20:00',
        location: 'TFA Headquarters',
        address: '300 Volunteer Blvd',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37203',
        event_type: 'fundraiser',
        status: 'scheduled',
        capacity: 8,
        organizer_name: 'Admin User',
        organizer_email: 'admin@tfa.org',
        organizer_phone: '555-100-2000',
        requirements: 'Good phone manner, comfortable with fundraising',
        min_volunteers: 4,
        max_volunteers: 8,
        created_by: adminUser?.id
      },
      {
        name: 'Volunteer Orientation',
        description: 'Orientation session for new volunteers - learn about TFA and our programs',
        start_date: iso(addDays(7)),
        end_date: iso(addDays(7)),
        start_time: '18:00',
        end_time: '19:30',
        location: 'TFA Headquarters',
        address: '300 Volunteer Blvd',
        city: 'Nashville',
        state: 'TN',
        zip_code: '37203',
        event_type: 'training',
        status: 'scheduled',
        capacity: 20,
        organizer_name: 'Staff User',
        organizer_email: 'staff@tfa.org',
        organizer_phone: '555-100-3000',
        requirements: 'None - all are welcome!',
        min_volunteers: 1,
        max_volunteers: 20,
        created_by: adminUser?.id
      }
    ];

    for (const evt of events) {
      await run(`
        INSERT INTO events(
          name, description, start_date, end_date, start_time, end_time,
          location, address, city, state, zip_code, event_type, status, capacity,
          organizer_name, organizer_email, organizer_phone, requirements,
          min_volunteers, max_volunteers, created_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        evt.name, evt.description, evt.start_date, evt.end_date || null,
        evt.start_time || null, evt.end_time || null, evt.location || null,
        evt.address || null, evt.city || null, evt.state || null, evt.zip_code || null,
        evt.event_type || null, evt.status, evt.capacity || null,
        evt.organizer_name || null, evt.organizer_email || null, evt.organizer_phone || null,
        evt.requirements || null, evt.min_volunteers || null, evt.max_volunteers || null,
        evt.created_by || null
      ]);
    }

    const evtRecords = await all(`SELECT id, name, start_date FROM events ORDER BY id ASC`);
    console.log(`   ✓ Created ${evtRecords.length} events`);

    // ============================================
    // SEED EVENT REGISTRATIONS
    // ============================================
    console.log('\n📝 Seeding event registrations...');
    const registrations = [
      [evtRecords[0].id, volRecords[0].id, 'confirmed'],
      [evtRecords[0].id, volRecords[1].id, 'registered'],
      [evtRecords[0].id, volRecords[2].id, 'confirmed'],
      [evtRecords[1].id, volRecords[0].id, 'confirmed'],
      [evtRecords[1].id, volRecords[3].id, 'registered'],
      [evtRecords[2].id, volRecords[2].id, 'confirmed'],
      [evtRecords[3].id, volRecords[1].id, 'confirmed'],
      [evtRecords[3].id, volRecords[3].id, 'confirmed'],
    ];

    for (const [event_id, volunteer_id, status] of registrations) {
      await run(`
        INSERT INTO event_registrations(event_id, volunteer_id, status) 
        VALUES (?,?,?)
      `, [event_id, volunteer_id, status]);
    }
    console.log(`   ✓ Created ${registrations.length} event registrations`);

    // ============================================
    // SEED HOURS LOGS (with approval status)
    // ============================================
    console.log('\n⏰ Seeding hours logs...');
    const logs = [
      [volRecords[0].id, evtRecords[0].id, iso(addDays(-2)), 2.5, 'approved', adminUser?.id, 'Evening shift - sorted canned goods'],
      [volRecords[0].id, evtRecords[1].id, iso(addDays(-1)), 1.75, 'approved', adminUser?.id, 'Setup crew for clothing drive'],
      [volRecords[1].id, evtRecords[0].id, iso(addDays(-3)), 3.0, 'approved', adminUser?.id, 'Packed boxes for distribution'],
      [volRecords[2].id, evtRecords[2].id, iso(addDays(-1)), 2.0, 'approved', adminUser?.id, 'Bilingual phone calls - great results!'],
      [volRecords[3].id, evtRecords[1].id, iso(addDays(-5)), 4.0, 'pending', null, 'Donation intake and sorting'],
      [volRecords[0].id, null, iso(addDays(-10)), 1.5, 'approved', adminUser?.id, 'Office administration help'],
      [volRecords[1].id, null, iso(addDays(-7)), 2.0, 'pending', null, 'Website updates and testing'],
    ];

    for (const [vol_id, evt_id, date, hours, status, approved_by, notes] of logs) {
      const result = await run(`
        INSERT INTO hours_logs(volunteer_id, event_id, date, hours, status, approved_by, notes) 
        VALUES (?,?,?,?,?,?,?)
      `, [vol_id, evt_id || null, date, hours, status, approved_by || null, notes || null]);
      
      // If approved, set approved_at date
      if (status === 'approved') {
        await run(`UPDATE hours_logs SET approved_at = datetime('now') WHERE id = ?`, [result.lastID]);
      }
    }
    console.log(`   ✓ Created ${logs.length} hours logs`);

    // ============================================
    // SEED VOLUNTEER NOTES
    // ============================================
    console.log('\n📋 Seeding volunteer notes...');
    const notes = [
      [volRecords[0].id, adminUser?.id, 'general', 'Alex is extremely reliable and has never missed a shift', 0],
      [volRecords[0].id, adminUser?.id, 'achievement', 'Completed 50 volunteer hours milestone!', 0],
      [volRecords[1].id, adminUser?.id, 'phone_call', 'Called to discuss availability for upcoming tech training event', 0],
      [volRecords[2].id, adminUser?.id, 'meeting', 'Met with Marco about leading bilingual outreach program', 0],
      [volRecords[3].id, adminUser?.id, 'general', 'Taylor is great with social media - should involve in marketing', 0],
      [volRecords[4].id, adminUser?.id, 'general', 'Jordan needs to be contacted in 2 months to check availability', 1],
    ];

    for (const [vol_id, created_by, note_type, note, is_private] of notes) {
      await run(`
        INSERT INTO volunteer_notes(volunteer_id, created_by, note_type, note, is_private) 
        VALUES (?,?,?,?,?)
      `, [vol_id, created_by || null, note_type, note, is_private]);
    }
    console.log(`   ✓ Created ${notes.length} volunteer notes`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n✅ Database seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   • ${userRecords.length} users (admin, staff, volunteers)`);
    console.log(`   • ${categoryRecords.length} categories`);
    console.log(`   • ${volRecords.length} volunteers`);
    console.log(`   • ${evtRecords.length} events`);
    console.log(`   • ${registrations.length} event registrations`);
    console.log(`   • ${logs.length} hours logs`);
    console.log(`   • ${notes.length} volunteer notes`);
    console.log('\n🔑 Test Accounts:');
    console.log('   Admin:     admin@tfa.org / admin123');
    console.log('   Staff:     staff@tfa.org / staff123');
    console.log('   Volunteer: alex@tfa.org / volunteer123\n');
    
  } catch (e) {
    console.error('❌ Error seeding database:', e);
  } finally {
    db.close();
  }
})();
