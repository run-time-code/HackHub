'use strict';

// SSE streams are long-lived sockets. Without a cap, one authenticated client
// can hold an unbounded number of EventSource connections (and connections
// keep their response buffers, heartbeat timers and event listeners), which
// exhausts file descriptors and memory on the instance. Limits are per
// instance; a multi-instance deployment should enforce the global limit at
// the load balancer too.

const MAX_STREAMS_PER_USER = 3;
const MAX_STREAMS_TOTAL = 500;

const streamsByUser = new Map();
let totalStreams = 0;

function tryAcquire(userId) {
  const key = String(userId);

  if (totalStreams >= MAX_STREAMS_TOTAL) {
    return false;
  }

  const current = streamsByUser.get(key) || 0;

  if (current >= MAX_STREAMS_PER_USER) {
    return false;
  }

  streamsByUser.set(key, current + 1);
  totalStreams += 1;
  return true;
}

function release(userId) {
  const key = String(userId);
  const current = streamsByUser.get(key) || 0;

  if (current <= 0) {
    return;
  }

  if (current === 1) {
    streamsByUser.delete(key);
  } else {
    streamsByUser.set(key, current - 1);
  }

  totalStreams = Math.max(0, totalStreams - 1);
}

function stats() {
  return { total: totalStreams, users: streamsByUser.size };
}

module.exports = {
  MAX_STREAMS_PER_USER,
  MAX_STREAMS_TOTAL,
  tryAcquire,
  release,
  stats,
};
