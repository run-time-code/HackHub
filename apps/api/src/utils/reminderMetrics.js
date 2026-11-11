'use strict';

const state = {
  runsTotal: 0,
  schedulerErrorsTotal: 0,
  jobsProcessedTotal: 0,
  jobsSentTotal: 0,
  jobsFailedTotal: 0,
  jobsDeferredTotal: 0,
  lastRunAt: 0,
  lastSuccessfulRunAt: 0,
  lastRunDurationMs: 0,
  running: false,
};

function startRun() {
  const startedAt = Date.now();
  state.runsTotal += 1;
  state.lastRunAt = startedAt;
  state.running = true;
  return startedAt;
}

function finishRun(startedAt, succeeded) {
  state.running = false;
  state.lastRunDurationMs = Date.now() - startedAt;
  if (succeeded) state.lastSuccessfulRunAt = Date.now();
}

function recordJobProcessed() {
  state.jobsProcessedTotal += 1;
}

function recordJobSent() {
  state.jobsSentTotal += 1;
}

function recordJobFailed() {
  state.jobsFailedTotal += 1;
}

function recordJobDeferred() {
  state.jobsDeferredTotal += 1;
}

function recordSchedulerError() {
  state.schedulerErrorsTotal += 1;
}

function getReminderMetrics() {
  return { ...state };
}

module.exports = {
  startRun,
  finishRun,
  recordJobProcessed,
  recordJobSent,
  recordJobFailed,
  recordJobDeferred,
  recordSchedulerError,
  getReminderMetrics,
};
