'use strict';

// Seeds the local HackHub instance for the security audit.
// Run from the repository root: node security-audit/seed.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const API = 'http://127.0.0.1:5000/api';
const OUT = path.join(__dirname, 'evidence', 'seed.json');
const PREFIX = 'audit_';

const Hackathon = require('../apps/api/models/Hackathon');

function cookieJar() {
  const jar = new Map();
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
    set: (res) => {
      const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      for (const c of raw) {
        const [pair] = c.split(';');
        const idx = pair.indexOf('=');
        const k = pair.slice(0, idx);
        const v = pair.slice(idx + 1);
        if (v === '') jar.delete(k); else jar.set(k, v);
      }
    },
  };
}

async function call(jar, method, url, body, extraHeaders = {}) {
  const headers = { origin: 'http://localhost:5173', ...extraHeaders };
  if (body) headers['content-type'] = 'application/json';
  if (jar.header()) headers.cookie = jar.header();
  const res = await fetch(API + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  jar.set(res);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json, headers: res.headers };
}

async function csrf(jar) {
  const r = await call(jar, 'GET', '/auth/csrf-token');
  return r.json.csrfToken;
}

async function registerAndLogin(email, name) {
  const jar = cookieJar();
  let token = await csrf(jar);
  const password = 'AuditPass1!';
  const reg = await call(jar, 'POST', '/auth/register', { name, email, password }, { 'x-csrf-token': token });
  token = await csrf(jar);
  const login = await call(jar, 'POST', '/auth/login', { email, password }, { 'x-csrf-token': token });
  if (login.status !== 200) throw new Error(`login ${email} failed: ${login.status} ${JSON.stringify(login.json)}`);
  token = await csrf(jar);
  return { email, name, password, jar, token, login: login.json };
}

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/hackhub');
  const User = require('../apps/api/models/User');

  await User.deleteMany({ email: /@audit\.local$/ });
  await Hackathon.deleteMany({ title: new RegExp('^AUDIT') });

  const hackathons = await Hackathon.insertMany([
    {
      title: 'AUDIT Hackathon Alpha',
      description: 'Seeded event for the audit. <img src=x onerror=alert(1)>',
      organizerName: 'Audit Org',
      skills: ['JavaScript', 'Node.js'],
      domains: ['Web'],
      domain: ['Web'],
      mode: 'ONLINE',
      prize_pool: '5000',
      status: 'upcoming',
      registrationDeadline: new Date(Date.now() + 7 * 864e5),
      eventStartDate: new Date(Date.now() + 14 * 864e5),
      eventEndDate: new Date(Date.now() + 16 * 864e5),
      isActive: true,
    },
    {
      title: 'AUDIT Hackathon Beta',
      description: 'Second seeded event.',
      organizerName: 'Audit Org',
      skills: ['Python'],
      domains: ['AI'],
      domain: ['AI'],
      mode: 'OFFLINE',
      location: 'Chennai',
      prize_pool: '1000',
      status: 'upcoming',
      eventStartDate: new Date(Date.now() + 21 * 864e5),
    },
    {
      title: 'AUDIT Hackathon Hidden',
      description: 'Should never be visible to normal users.',
      organizerName: 'Audit Org',
      mode: 'ONLINE',
      status: 'upcoming',
      isActive: true,
      isHidden: true,
    },
  ]);

  const alice = await registerAndLogin('alice@audit.local', 'Audit Alice');
  const bob = await registerAndLogin('bob@audit.local', 'Audit Bob');

  // Promote a third account to admin directly (admin routes are not public).
  const admin = await registerAndLogin('admin@audit.local', 'Audit Admin');
  await User.updateOne({ email: 'admin@audit.local' }, { $set: { role: 'admin' } });
  const adminLogin = await call(admin.jar, 'POST', '/auth/login', { email: admin.email, password: admin.password }, { 'x-csrf-token': await csrf(admin.jar) });

  const team = await call(alice.jar, 'POST', '/teams', {
    name: 'AUDIT Team One',
    description: 'Seeded team',
    hackathonId: String(hackathons[0]._id),
    rolesNeeded: ['Designer'],
    maxTeamSize: 4,
  }, { 'x-csrf-token': alice.token });
  if (team.status >= 300) throw new Error(`team create failed: ${team.status} ${JSON.stringify(team.json)}`);
  const teamId = team.json.data.id || team.json.data._id;

  const joinReq = await call(bob.jar, 'POST', `/teams/${teamId}/requests`, { message: 'Let me in' }, { 'x-csrf-token': bob.token });
  const saved = await call(alice.jar, 'POST', '/saved', { hackathonId: String(hackathons[0]._id), status: 'saved', notes: 'audit note' }, { 'x-csrf-token': alice.token });
  const reminder = await call(alice.jar, 'POST', '/reminders', { hackathonId: String(hackathons[0]._id), remindAt: new Date(Date.now() + 864e5).toISOString() }, { 'x-csrf-token': alice.token });

  const out = {
    hackathons: hackathons.map((h) => ({ id: String(h._id), title: h.title })),
    users: {
      alice: { email: alice.email, password: alice.password, cookie: alice.jar.header(), csrf: alice.token },
      bob: { email: bob.email, password: bob.password, cookie: bob.jar.header(), csrf: bob.token },
      admin: { email: admin.email, password: admin.password, cookie: admin.jar.header(), csrf: admin.token, loginStatus: adminLogin.status },
    },
    teamId,
    joinRequest: { status: joinReq.status, body: joinReq.json },
    saved: { status: saved.status, body: saved.json },
    reminder: { status: reminder.status, body: reminder.json },
    hiddenHackathonId: String(hackathons[2]._id),
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('SEED FAILED', err);
  await mongoose.disconnect();
  process.exit(1);
});
