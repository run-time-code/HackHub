'use strict';

const Hackathon = require('../../models/Hackathon');
const User = require('../../models/User');
const { serialize } = require('./hackathonsService');

const CANDIDATE_LIMIT = 500;
const DEFAULT_RECOMMENDATION_LIMIT = 12;

function normalizedList(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean))];
}

function matchingFraction(values, candidates) {
  if (!values.length) return null;
  const offered = candidates.map((value) => String(value).trim().toLowerCase());
  return values.filter((value) => offered.some((candidate) =>
    candidate === value || candidate.includes(value) || value.includes(candidate)
  )).length / values.length;
}

function matchingValues(values, candidates) {
  const offered = candidates.map((value) => String(value).trim().toLowerCase());
  return values.filter((value) => offered.some((candidate) =>
    candidate === value || candidate.includes(value) || value.includes(candidate)
  ));
}

function getDates(hackathon) {
  return [
    hackathon.registration_deadline,
    hackathon.submission_deadline,
    hackathon.event_start_date,
    hackathon.event_start,
  ].filter((value) => value && !Number.isNaN(new Date(value).getTime()));
}

function scoreHackathon(hackathon, profile, now = new Date()) {
  const interests = normalizedList(profile.preferences?.interests);
  const skills = normalizedList(profile.skills);
  const domains = [...(hackathon.domains || []), ...(hackathon.domain || []), hackathon.theme]
    .filter(Boolean);
  const eventSkills = hackathon.skills || [];
  const factors = [];

  if (interests.length) {
    const ratio = matchingFraction(interests, domains);
    factors.push({
      key: 'interests',
      label: 'Interest match',
      earned: Math.round(20 * ratio),
      possible: 20,
      matched: matchingValues(interests, domains),
    });
  }
  if (skills.length) {
    const ratio = matchingFraction(skills, eventSkills);
    factors.push({
      key: 'skills',
      label: 'Skill match',
      earned: Math.round(20 * ratio),
      possible: 20,
      matched: matchingValues(skills, eventSkills),
    });
  }

  const preferredMode = String(profile.preferences?.preferredMode || '').toLowerCase();
  if (preferredMode) {
    const mode = String(hackathon.mode || '').toLowerCase();
    factors.push({
      key: 'mode',
      label: 'Format preference',
      earned: mode === preferredMode ? 10 : 0,
      possible: 10,
      matched: [],
    });
  }

  const dates = getDates(hackathon);
  if (dates.length) {
    const hasFutureDate = dates.some((value) => new Date(value) >= now);
    factors.push({
      key: 'dates',
      label: 'Upcoming dates',
      earned: hasFutureDate ? 20 : 0,
      possible: 20,
      matched: [],
    });
  }

  const prize = hackathon.prize_pool || hackathon.prize;
  if (prize !== undefined && prize !== null && String(prize).trim()) {
    factors.push({
      key: 'prize',
      label: 'Prize information',
      earned: 10,
      possible: 10,
      matched: [],
    });
  }

  const completeness = [
    Boolean(hackathon.description && String(hackathon.description).trim()),
    Boolean(hackathon.organizer && String(hackathon.organizer).trim()),
    Boolean(hackathon.url || hackathon.sourceUrl),
    Boolean(domains.length || eventSkills.length),
  ].filter(Boolean).length;
  factors.push({
    key: 'details',
    label: 'Listing details',
    earned: completeness * 5,
    possible: 20,
    matched: [],
  });

  const possible = factors.reduce((sum, factor) => sum + factor.possible, 0);
  const earned = factors.reduce((sum, factor) => sum + factor.earned, 0);
  const matchedInterests = factors.find((factor) => factor.key === 'interests')?.matched || [];
  const matchedSkills = factors.find((factor) => factor.key === 'skills')?.matched || [];
  const reasons = [
    ...matchedInterests.map((value) => `Matches your interest in ${value}`),
    ...matchedSkills.map((value) => `Uses your ${value} skill`),
    preferredMode && String(hackathon.mode || '').toLowerCase() === preferredMode
      ? `Matches your ${preferredMode} format preference`
      : '',
  ].filter(Boolean);

  return {
    worthScore: possible ? Math.round((earned / possible) * 100) : 0,
    scoreBreakdown: {
      earned,
      possible,
      factors,
      methodology: 'Profile fit, upcoming dates, disclosed prize, and listing completeness. A heuristic, not a prediction of event outcomes.',
    },
    recommendationReasons: reasons,
  };
}

async function getRecommendations(userId, query = {}, now = new Date()) {
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_RECOMMENDATION_LIMIT, 1), 50);
  const user = await User.findById(userId)
    .select('skills preferences')
    .lean();
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const filter = { is_hidden: { $ne: true }, is_active: { $ne: false } };
  const candidates = await Hackathon.find(filter)
    .sort({ updatedAt: -1 })
    .limit(CANDIDATE_LIMIT)
    .lean();
  const eligible = candidates.filter((hackathon) => {
    const dates = getDates(hackathon);
    return !dates.length || dates.some((value) => new Date(value) >= now);
  });
  const items = eligible
    .map((hackathon) => ({
      ...serialize(hackathon),
      ...scoreHackathon(hackathon, user, now),
    }))
    .sort((left, right) =>
      right.worthScore - left.worthScore ||
      String(left.title).localeCompare(String(right.title))
    )
    .slice(0, limit);
  return { items, total: eligible.length, candidateCount: candidates.length };
}

module.exports = { getRecommendations, scoreHackathon };
