'use strict';

// Relationship cleanup for account deletion.
//
// Soft-deleting a user only flips `deletedAt`, but the account can no longer
// authenticate. Anything that still points at it (a team it leads, pending
// join requests it sent, reminders that would email it) becomes unusable for
// everybody else. These helpers release those relationships when the account
// is deleted and remove the remaining personal rows when the retention window
// ends. Both are idempotent because either step may be retried.

const { Team } = require('../src/models/team');
const { JoinRequest, PENDING_STATUS } = require('../src/models/joinRequest');
const { Notification } = require('../src/models/notification');
const { Reminder } = require('../src/models/reminder');
const SavedHackathon = require('../models/SavedHackathon');
const Registration = require('../models/Registration');
const logger = require('../src/utils/logger');

function teamSize(team) {
  return 1 + (team.members ? team.members.length : 0);
}

function successorOf(team, userId) {
  const candidates = (team.members || [])
    .filter((member) => String(member.user) !== String(userId))
    .sort((a, b) => new Date(a.joinedAt || 0) - new Date(b.joinedAt || 0));

  return candidates[0] || null;
}

// Hand a team the departing leader owned to its longest-standing member, or
// delete the team when nobody is left to own it.
async function releaseTeamLeadership(userId) {
  const teams = await Team.find({ leader: userId });

  for (const team of teams) {
    const successor = successorOf(team, userId);

    if (!successor) {
      await JoinRequest.updateMany(
        { team: team._id, status: PENDING_STATUS },
        { $set: { status: 'cancelled', respondedAt: new Date() } }
      );
      await team.deleteOne();
      continue;
    }

    team.members = team.members.filter(
      (member) => String(member.user) !== String(successor.user)
    );
    team.leader = successor.user;

    if (team.status === 'closed' && teamSize(team) < team.maxTeamSize) {
      team.status = 'open';
    }

    await team.save();

    await notificationsForNewLeader(team, successor.user);
  }
}

async function notificationsForNewLeader(team, userId) {
  try {
    await Notification.create({
      user: userId,
      type: 'leader_changed',
      title: 'You are now the team leader',
      message: `You are now the leader of ${team.name}.`,
      data: { teamId: String(team._id) },
    });
  } catch (error) {
    logger.warn(
      { err: error, teamId: String(team._id) },
      'leadership notification failed'
    );
  }
}

// Stop personal side effects without destroying retained data. Used as soon
// as the account is soft-deleted so a deleted address is never emailed again.
async function suspendUserSideEffects(userId) {
  await Reminder.updateMany({ user: userId, active: true }, { $set: { active: false } });

  await JoinRequest.updateMany(
    {
      status: PENDING_STATUS,
      $or: [{ user: userId }, { initiatedBy: userId }],
    },
    { $set: { status: 'cancelled', respondedAt: new Date() } }
  );

  await Team.updateMany({}, { $pull: { members: { user: userId } } });

  await releaseTeamLeadership(userId);
}

// Permanent erasure after the retention window.
async function purgeUserRows(userId) {
  const [saved, reminders, notifications, joinRequests, registrations] =
    await Promise.all([
      SavedHackathon.deleteMany({ user: userId }),
      Reminder.deleteMany({ user: userId }),
      Notification.deleteMany({ user: userId }),
      JoinRequest.deleteMany({
        $or: [{ user: userId }, { initiatedBy: userId }],
      }),
      Registration.deleteMany({ user: userId }),
    ]);

  return {
    savedHackathons: saved.deletedCount || 0,
    reminders: reminders.deletedCount || 0,
    notifications: notifications.deletedCount || 0,
    joinRequests: joinRequests.deletedCount || 0,
    registrations: registrations.deletedCount || 0,
  };
}

module.exports = {
  suspendUserSideEffects,
  purgeUserRows,
  releaseTeamLeadership,
};
