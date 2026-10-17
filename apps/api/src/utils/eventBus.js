'use strict';

const { EventEmitter } = require('node:events');

// In-process pub/sub used to fan notifications out to open SSE streams.
// A single API instance needs nothing more; with several instances, run a
// shared bus (e.g. Redis pub/sub) so a notification created on one instance
// reaches streams connected to another.
const bus = new EventEmitter();
bus.setMaxListeners(0);

function userChannel(userId) {
  return `user:${String(userId)}`;
}

function publishNotification(userId, notification) {
  bus.emit(userChannel(userId), notification);
}

function subscribeToUser(userId, listener) {
  const channel = userChannel(userId);
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}

module.exports = { publishNotification, subscribeToUser };
