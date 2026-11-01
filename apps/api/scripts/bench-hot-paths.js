'use strict';

// Hot-path benchmark against an in-memory MongoDB with a realistic catalogue.
//
//   node scripts/bench-hot-paths.js [hackathons=20000] [users=20000]
//
// Reports p50/p95/max for the two read paths every logged-in page hits:
// GET /hackathons (list) and GET /users/discover (ranked teammates).

process.env.LOG_LEVEL = 'fatal';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Hackathon = require('../models/Hackathon');
const User = require('../models/User');
const {
  invalidateHackathonCache,
  listHackathons,
} = require('../src/services/hackathonsService');
const { searchTeammates } = require('../src/services/usersService');

const HACKATHONS = Number(process.argv[2] || 20000);
const USERS = Number(process.argv[3] || 20000);
const ROUNDS = 25;
const SKILLS = ['React', 'Node.js', 'Python', 'Flutter', 'Rust', 'Go', 'ML'];

function percentile(sorted, p) {
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

// Cache is cleared before every sample so the numbers are the database path,
// not a warm in-process cache hit (a cached response is ~0.05ms).
async function time(label, fn) {
  const samples = [];

  for (let i = 0; i < ROUNDS; i += 1) {
    invalidateHackathonCache();
    const startedAt = process.hrtime.bigint();
    await fn();
    samples.push(Number(process.hrtime.bigint() - startedAt) / 1e6);
  }

  samples.sort((a, b) => a - b);
  console.log(
    `${label.padEnd(34)} p50=${percentile(samples, 50).toFixed(1)}ms `
      + `p95=${percentile(samples, 95).toFixed(1)}ms max=${samples[samples.length - 1].toFixed(1)}ms`
  );
}

function hackathonDocs(count) {
  const now = Date.now();
  const domains = ['web', 'ai', 'mobile', 'blockchain', 'data'];

  return Array.from({ length: count }, (_, i) => ({
    hackathon_id: `bench-${i}`,
    slug: `bench-${i}`,
    title: `Benchmark Hackathon ${i}`,
    description: 'Synthetic row for the hot-path benchmark.',
    url: `https://example.com/${i}`,
    mode: i % 2 ? 'ONLINE' : 'OFFLINE',
    status: i % 3 === 0 ? 'upcoming' : i % 3 === 1 ? 'ongoing' : 'completed',
    domain: [domains[i % domains.length]],
    domains: [domains[i % domains.length]],
    tags: [SKILLS[i % SKILLS.length]],
    skills: [SKILLS[i % SKILLS.length]],
    prizeAmount: (i % 50) * 1000,
    startDate: new Date(now + (i % 90) * 86400000),
    endDate: new Date(now + (i % 90) * 86400000 + 3 * 86400000),
    event_start: new Date(now + (i % 90) * 86400000),
    event_end: new Date(now + (i % 90) * 86400000 + 3 * 86400000),
    registration_deadline: new Date(now + (i % 90) * 86400000),
    is_active: true,
    is_hidden: false,
  }));
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  await Hackathon.insertMany(hackathonDocs(HACKATHONS), { ordered: false });
  await Hackathon.syncIndexes();

  await User.insertMany(
    Array.from({ length: USERS }, (_, i) => ({
      name: `Bench User ${i}`,
      email: `bench-${i}@example.com`,
      skills: [SKILLS[i % SKILLS.length]],
      discoverable: true,
      lookingForTeam: true,
    })),
    { ordered: false }
  );
  await User.syncIndexes();

  console.log(`dataset: ${HACKATHONS} hackathons, ${USERS} users\n`);

  await time('GET /hackathons?first=20', () => listHackathons({ first: '20' }));
  await time('GET /hackathons?search=ai', () => listHackathons({ search: 'ai', first: '20' }));
  await time('GET /hackathons?domain=web', () => listHackathons({ domain: 'web', first: '20' }));
  await time('GET /users/discover?skills=react', () => searchTeammates({ skills: 'react' }));

  await mongoose.disconnect();
  await mongo.stop();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
