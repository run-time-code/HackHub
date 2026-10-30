'use strict';

/**
 * Seed a local MongoDB with everything the k6 scenarios need:
 *   - a verified load-test account (see tools/loadtest/README.md)
 *   - a representative hackathon catalogue so browse/search hit real data
 *
 * Usage:
 *   MONGODB_URI=mongodb://127.0.0.1:27017/hackhub_loadtest node tools/loadtest/seed-local.js
 *
 * This is a *local* helper. It never touches staging or production.
 */

const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Hackathon = require(path.join(__dirname, '../../apps/api/models/Hackathon'));
const User = require(path.join(__dirname, '../../apps/api/models/User'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hackhub_loadtest';
const LOADTEST_EMAIL = process.env.LOADTEST_EMAIL || 'loadtest@example.com';
const LOADTEST_PASSWORD = process.env.LOADTEST_PASSWORD || 'Loadtest!2345';
const HACKATHON_COUNT = Number(process.env.HACKATHON_COUNT || 300);

const DOMAINS = ['ai', 'fintech', 'health', 'climate', 'education', 'games', 'blockchain', 'iot'];
const SKILLS = ['react', 'python', 'node', 'flutter', 'ml', 'figma', 'sql', 'go'];
const MODES = ['online', 'offline', 'hybrid'];
const WORDS = [
  'Neural', 'Green', 'Civic', 'Open', 'Rapid', 'Quantum', 'Urban', 'Global',
  'Smart', 'Cloud', 'Data', 'Edge',
];

function pick(list, i) {
  return list[i % list.length];
}

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  // Verified, unlocked account so POST /api/auth/login succeeds.
  const passwordHash = await bcrypt.hash(LOADTEST_PASSWORD, 10);
  await User.updateOne(
    { email: LOADTEST_EMAIL.toLowerCase() },
    {
      $set: {
        name: 'Load Test',
        email: LOADTEST_EMAIL.toLowerCase(),
        password: passwordHash,
        emailVerified: true,
        failedLoginAttempts: 0,
        lockUntil: null,
        role: 'student',
      },
    },
    { upsert: true }
  );

  const now = Date.now();
  const docs = [];
  for (let i = 0; i < HACKATHON_COUNT; i += 1) {
    const domain = pick(DOMAINS, i);
    const skill = pick(SKILLS, i);
    docs.push({
      hackathon_id: `loadtest-${i}`,
      title: `${pick(WORDS, i)} ${domain.toUpperCase()} Hackathon ${i}`,
      description: `Build something with ${skill} and ${domain}. Open call for students.`,
      organizer: `Organizer ${i % 25}`,
      url: `https://example.com/hackathons/loadtest-${i}`,
      sourceUrl: `https://example.com/hackathons/loadtest-${i}`,
      source: i % 2 === 0 ? 'devpost' : 'mlh',
      external_id: `loadtest-${i}`,
      mode: pick(MODES, i),
      location: i % 3 === 0 ? 'Chennai, India' : '',
      domains: [domain],
      skills: [skill],
      registration_deadline: new Date(now + (i + 1) * 86400000),
      submission_deadline: new Date(now + (i + 8) * 86400000),
      event_start: new Date(now + (i + 2) * 86400000),
      event_end: new Date(now + (i + 9) * 86400000),
      prize_pool: `$${(i % 10) * 1000}`,
      is_active: true,
      is_hidden: false,
    });
  }

  await Hackathon.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { hackathon_id: doc.hackathon_id },
        update: { $set: doc },
        upsert: true,
      },
    }))
  );

  const [users, hackathons] = await Promise.all([User.countDocuments(), Hackathon.countDocuments()]);
  console.log(`Seeded ${LOADTEST_EMAIL} · users=${users} hackathons=${hackathons}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
