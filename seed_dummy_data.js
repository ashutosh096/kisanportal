import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, run } from './server/db.js';

async function seedData() {
  console.log('🌱 Starting comprehensive test data seeding...');

  const commonPassword = 'pass123';
  const hashedPass = await bcrypt.hash(commonPassword, 10);
  const adminHashedPass = await bcrypt.hash('admin123', 10);

  // 1. Get SuperAdmin ID
  const superadmins = await query(`SELECT id FROM users WHERE role = 'superadmin' LIMIT 1`);
  const superadminId = superadmins[0]?.id || 1;

  // 2. Company Admins
  const companyAdmins = [
    { username: 'admin1', name: 'AgriCorp India Admin', mobile: '9876543210' },
    { username: 'admin2', name: 'KisanTech Solutions Admin', mobile: '9876543211' },
    { username: 'admin3', name: 'GreenHarvest Agritech Admin', mobile: '9876543212' },
  ];

  const adminIds = [];

  for (const adm of companyAdmins) {
    const existing = await query(`SELECT id FROM users WHERE LOWER(username) = LOWER(?)`, [adm.username]);
    let admId;
    if (existing.length > 0) {
      admId = existing[0].id;
      await run(
        `UPDATE users SET name = ?, password_hash = ?, status = 'active' WHERE id = ?`,
        [adm.name, adminHashedPass, admId]
      );
    } else {
      const res = await run(
        `INSERT INTO users (username, password_hash, role, name, mobile, status, admin_id)
         VALUES (?, ?, 'admin', ?, ?, 'active', ?) RETURNING id`,
        [adm.username, adminHashedPass, adm.name, adm.mobile, superadminId]
      );
      admId = res.lastID;
    }
    adminIds.push({ id: admId, username: adm.username, name: adm.name });
  }

  console.log(`✅ Created/updated ${adminIds.length} Company Admins.`);

  // 3. Team Members for Hierarchy & Team Members page testing
  const teamMembers = [
    { username: 'supercoadmin', name: 'Vikram Singh (Super CoAdmin)', role: 'coadmin', adminId: superadminId },
    { username: 'superviewer', name: 'Priya Sharma (Super Viewer)', role: 'viewer', adminId: superadminId },
    { username: 'manager1', name: 'Amit Verma (AgriCorp Manager)', role: 'manager', adminId: adminIds[0].id },
    { username: 'coadmin1', name: 'Neha Gupta (AgriCorp CoAdmin)', role: 'coadmin', adminId: adminIds[0].id },
    { username: 'viewer1', name: 'Rohan Mehta (AgriCorp Viewer)', role: 'viewer', adminId: adminIds[0].id },
    { username: 'manager2', name: 'Sunil Kumar (KisanTech Manager)', role: 'manager', adminId: adminIds[1].id },
    { username: 'viewer2', name: 'Kavita Singh (KisanTech Viewer)', role: 'viewer', adminId: adminIds[1].id },
    { username: 'manager3', name: 'Deepak Joshi (GreenHarvest Manager)', role: 'manager', adminId: adminIds[2].id },
    { username: 'coadmin3', name: 'Pooja Rani (GreenHarvest CoAdmin)', role: 'coadmin', adminId: adminIds[2].id },
  ];

  for (const tm of teamMembers) {
    const existing = await query(`SELECT id FROM users WHERE LOWER(username) = LOWER(?)`, [tm.username]);
    if (existing.length === 0) {
      await run(
        `INSERT INTO users (username, password_hash, role, name, status, admin_id)
         VALUES (?, ?, ?, ?, 'active', ?)`,
        [tm.username, hashedPass, tm.role, tm.name, tm.adminId]
      );
    }
  }

  console.log(`✅ Created/updated ${teamMembers.length} Team Members.`);

  // 4. Surveyors (4 per Company Admin)
  const surveyorsData = [
    // Admin 1 Surveyors
    { username: 'surveyor_a1', name: 'Rajesh Farmer Scout', admin: adminIds[0] },
    { username: 'surveyor_a2', name: 'Anil Crop Specialist', admin: adminIds[0] },
    { username: 'surveyor_a3', name: 'Kavita Soil Auditor', admin: adminIds[0] },
    { username: 'surveyor_a4', name: 'Sanjay Field Agent', admin: adminIds[0] },
    // Admin 2 Surveyors
    { username: 'surveyor_b1', name: 'Manoj Krishi Mitra', admin: adminIds[1] },
    { username: 'surveyor_b2', name: 'Sunita Field Executive', admin: adminIds[1] },
    { username: 'surveyor_b3', name: 'Pankaj Agronomist', admin: adminIds[1] },
    { username: 'surveyor_b4', name: 'Dinesh Survey Officer', admin: adminIds[1] },
    // Admin 3 Surveyors
    { username: 'surveyor_c1', name: 'Ritu Field Surveyor', admin: adminIds[2] },
    { username: 'surveyor_c2', name: 'Mahesh Agri Inspector', admin: adminIds[2] },
    { username: 'surveyor_c3', name: 'Seema Farm Analyst', admin: adminIds[2] },
    { username: 'surveyor_c4', name: 'Vijay Krishi Officer', admin: adminIds[2] },
  ];

  const createdSurveyors = [];

  for (const surv of surveyorsData) {
    const existing = await query(`SELECT id FROM users WHERE LOWER(username) = LOWER(?)`, [surv.username]);
    let sId;
    if (existing.length > 0) {
      sId = existing[0].id;
      await run(
        `UPDATE users SET name = ?, password_hash = ?, admin_id = ?, status = 'active' WHERE id = ?`,
        [surv.name, hashedPass, surv.admin.id, sId]
      );
    } else {
      const res = await run(
        `INSERT INTO users (username, password_hash, role, name, mobile, status, admin_id)
         VALUES (?, ?, 'surveyor', ?, '9800000000', 'active', ?) RETURNING id`,
        [surv.username, hashedPass, surv.name, surv.admin.id]
      );
      sId = res.lastID;
    }
    createdSurveyors.push({ id: sId, username: surv.username, name: surv.name, admin_id: surv.admin.id });
  }

  console.log(`✅ Created/updated ${createdSurveyors.length} Field Surveyors.`);

  // 5. Create Farmers & Form 2A & Form 2B Visits
  const sampleFirstNames = ['Ramesh', 'Suresh', 'Dinesh', 'Anita', 'Sunita', 'Kamlesh', 'Harish', 'Gopal', 'Radha', 'Mukesh', 'Mahendra', 'Sarita', 'Brijesh', 'Vijay', 'Santosh'];
  const sampleLastNames = ['Patel', 'Verma', 'Sharma', 'Singh', 'Yadav', 'Joshi', 'Gupta', 'Choudhary', 'Mishra', 'Kumar'];
  const sampleVillages = ['Kalyanpur, Kanpur', 'Bilhaur, Kanpur', 'Chaubepur, Kanpur', 'Rania, Kanpur', 'Mandhana, Kanpur', 'Akbarpur, Kanpur', 'Shivrajpur, Kanpur', 'Ghatampur, Kanpur', 'Bidhuna, UP', 'Kannauj, UP'];
  const sampleCrops = ['Wheat', 'Paddy', 'Mustard', 'Sugarcane', 'Maize'];

  let farmerCounter = 500;
  let farmerCount = 0;
  let visitCount = 0;
  const todayStr = new Date().toISOString().split('T')[0];

  for (const s of createdSurveyors) {
    for (let fIdx = 1; fIdx <= 10; fIdx++) {
      farmerCounter++;
      farmerCount++;
      const fId = `F-2026-TST-${farmerCounter}`;
      const fName = `${sampleFirstNames[fIdx % sampleFirstNames.length]} ${sampleLastNames[(fIdx * 3) % sampleLastNames.length]}`;
      const villageLoc = sampleVillages[fIdx % sampleVillages.length];
      const contact = `91${Math.floor(100000000 + Math.random() * 900000000)}`;
      const crop = sampleCrops[fIdx % sampleCrops.length];

      // Check if farmer exists
      const existingFarmer = await query(`SELECT farmer_id FROM farmers WHERE farmer_id = ?`, [fId]);
      if (existingFarmer.length === 0) {
        await run(
          `INSERT INTO farmers (
            farmer_id, name, contact, location, date, surveyor_id, surveyor_name, admin_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            fId, fName, contact, villageLoc, todayStr,
            s.id, s.name, s.admin_id
          ]
        );

        // Form 2A Seasonal Record
        const f2aRes = await run(
          `INSERT INTO form2a_seasonal (
            farmer_id, season_name, total_land, ownership, soil_testing, water_testing,
            cow_dung_used, cow_dung_qty, crop, crop_reason, area, sowing_date, variety,
            seed_qty_per_acre, seed_type, sowing_type, harvest_date, expected_yield,
            expert_advice, crop_growth_stage, crop_height, flowering_status, seed_age, is_active,
            admin_id, surveyor_id, surveyor_name
          ) VALUES (?, 'Kharif-Rabi 2026', '3.5', 'Own', 'yes', 'yes', 'yes', '20 quintals', ?, 'Best yield', '2.5', '2026-06-15', 'HD-2967', '40 kg', 'Certified', 'Line Sowing', '2026-11-20', '45 quintals', 'NPK Balanced', 'Vegetative Stage', '45 cm', '10% Flowering', '30 days', true, ?, ?, ?) RETURNING id`,
          [fId, crop, s.admin_id, s.id, s.name]
        );

        const f2aId = f2aRes.lastID;

        // Form 2B Visits (3 visit entries for first 5 farmers of each surveyor)
        if (fIdx <= 5) {
          const visitDates = ['2026-07-10T10:30:00.000Z', '2026-07-25T11:00:00.000Z', '2026-08-08T09:15:00.000Z'];
          for (let vIdx = 0; vIdx < visitDates.length; vIdx++) {
            visitCount++;
            await run(
              `INSERT INTO form2b_visits (
                client_generated_id, farmer_id, form2a_id, surveyor_id, surveyor_name, admin_id,
                visit_date, gps_location, plowing, plowing_count, pesticide_used, pesticide_qty,
                pesticide_brand, supplement_used, supplement_qty, supplement_brand, fertilizer_used,
                fertilizer_qty, fertilizer_brand, irrigation_done, irrigation_source, irrigation_type,
                irrigation_depth, weeding_done, additional_activities, crop_health_status, visit_notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, '26.5156° N, 80.2256° E', 'yes', '2', 'yes', '500 ml', 'Chlorpyrifos', 'yes', '2 kg', 'Bio-Zyme', 'yes', '50 kg', 'Urea & DAP', 'yes', 'Borewell', 'Flood', '3 inches', 'yes', 'Mulching & Pruning', ?, ?)`,
              [
                crypto.randomUUID(),
                fId, f2aId, s.id, s.name, s.admin_id, visitDates[vIdx],
                vIdx === 2 ? 'Excellent Harvest Stage' : 'Good Crop Growth',
                `Routine farm inspection #${vIdx + 1}. Soil moisture optimal, crops healthy.`
              ]
            );
          }
        }
      }
    }
  }

  console.log(`✅ Seeded ${farmerCount} Farmers with Form 2A seasonal data and ${visitCount} Form 2B visit entries.`);
  console.log('🎉 Seeding completed successfully!');
  process.exit(0);
}

seedData().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
