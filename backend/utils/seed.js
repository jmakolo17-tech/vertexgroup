/**
 * Seed script — run once: node utils/seed.js
 * Creates the admin user and sample team members.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');
const connectDB = require('../config/db');

const TEAM = [
  { name: 'Vertex Admin',      email: process.env.ADMIN_EMAIL || 'admin@vertexgroup.africa', password: process.env.ADMIN_PASSWORD || 'ChangeMe2025!', role: 'super_admin', countries: [] },
  { name: 'Kwame Asante',      email: 'k.asante@vertexgroup.africa',  password: 'Vertex2025!', role: 'salesperson', countries: ['Ghana', 'Senegal'] },
  { name: 'Fatima Ndiaye',     email: 'f.ndiaye@vertexgroup.africa',  password: 'Vertex2025!', role: 'coach',       countries: ['DRC', 'Senegal'] },
  { name: 'Jean-Pierre Mbeki', email: 'jp.mbeki@vertexgroup.africa',  password: 'Vertex2025!', role: 'salesperson', countries: ['Nigeria', 'DRC'] },
  { name: 'Amara Diallo',      email: 'a.diallo@vertexgroup.africa',  password: 'Vertex2025!', role: 'coach',       countries: ['Morocco', 'Kenya'] },
];

(async () => {
  await connectDB();
  for (const u of TEAM) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`  skipping (exists): ${u.email}`);
      continue;
    }
    await User.create(u);
    console.log(`  created: ${u.email} [${u.role}]`);
  }
  console.log('Seed complete.');
  mongoose.connection.close();
})();
