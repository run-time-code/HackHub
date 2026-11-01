'use strict';

// Regression test for the admin report counters: the catalogue stores both
// camelCase and snake_case flag pairs, and the report previously counted only
// the snake_case field.

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Hackathon = require('../models/Hackathon');
const { getAdminReport } = require('../controllers/adminReportController');

describe('admin report flag counts', () => {
  let mongo;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    await Hackathon.create([
      { title: 'Camel active', isActive: true, is_active: false },
      { title: 'Snake active', isActive: false, is_active: true },
      {
        title: 'Camel hidden',
        isActive: false,
        is_active: false,
        isHidden: true,
        is_hidden: false,
      },
      {
        title: 'Snake hidden',
        isActive: false,
        is_active: false,
        isHidden: false,
        is_hidden: true,
      },
      {
        title: 'Camel featured',
        isActive: false,
        is_active: false,
        isFeatured: true,
        is_featured: false,
      },
      {
        title: 'Snake featured',
        isActive: false,
        is_active: false,
        isFeatured: false,
        is_featured: true,
      },
    ]);
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongo) {
      await mongo.stop();
    }
  });

  it('counts either field style for active, hidden and featured', async () => {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    await getAdminReport({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.report.hackathons.total, 6);
    assert.equal(res.body.report.hackathons.active, 2);
    assert.equal(res.body.report.hackathons.hidden, 2);
    assert.equal(res.body.report.hackathons.featured, 2);
  });
});
