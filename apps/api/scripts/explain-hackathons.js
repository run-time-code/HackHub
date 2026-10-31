'use strict';

const mongoose = require('mongoose');
const config = require('../src/config');
const Hackathon = require('../models/Hackathon');

const visibleHackathons = {
  is_hidden: { $ne: true },
  isHidden: { $ne: true },
  is_active: { $ne: false },
  isActive: { $ne: false },
};

const cases = [
  {
    name: 'catalogue-default-page',
    run: () => Hackathon.find(visibleHackathons)
      .sort({ title: 1, _id: 1 })
      .skip(0)
      .limit(20)
      .explain('executionStats'),
  },
  {
    name: 'catalogue-skill-and-mode',
    run: () => Hackathon.find({
      ...visibleHackathons,
      skills: 'React',
      mode: 'ONLINE',
    })
      .sort({ title: 1, _id: 1 })
      .limit(20)
      .explain('executionStats'),
  },
  {
    name: 'catalogue-prize-sort',
    run: () => Hackathon.find(visibleHackathons)
      .sort({ prize: -1, _id: 1 })
      .limit(20)
      .explain('executionStats'),
  },
  {
    name: 'catalogue-facet-aggregation',
    run: () => Hackathon.aggregate([
      { $match: visibleHackathons },
      {
        $facet: {
          modes: [{ $group: { _id: '$mode', count: { $sum: 1 } } }],
          domains: [{ $unwind: '$domain' }, { $group: { _id: '$domain', count: { $sum: 1 } } }],
          skills: [{ $unwind: '$skills' }, { $group: { _id: '$skills', count: { $sum: 1 } } }],
        },
      },
    ]).explain('executionStats'),
  },
];

function findExecutionStats(explain) {
  if (explain.executionStats) return explain.executionStats;
  for (const stage of explain.stages || []) {
    if (stage.$cursor?.executionStats) return stage.$cursor.executionStats;
  }
  return null;
}

async function main() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  try {
    for (const testCase of cases) {
      const explain = await testCase.run();
      const stats = findExecutionStats(explain);
      console.log(JSON.stringify({
        case: testCase.name,
        executionTimeMillis: stats?.executionTimeMillis ?? null,
        nReturned: stats?.nReturned ?? null,
        totalKeysExamined: stats?.totalKeysExamined ?? null,
        totalDocsExamined: stats?.totalDocsExamined ?? null,
        winningPlan: explain.queryPlanner?.winningPlan
          || explain.stages?.find((stage) => stage.$cursor)?.$cursor?.queryPlanner?.winningPlan
          || null,
      }));
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Catalogue explain diagnostics failed:', error.message);
  process.exitCode = 1;
});
