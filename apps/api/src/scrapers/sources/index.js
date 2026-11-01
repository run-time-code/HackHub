'use strict';

const devpost = require('./devpost');
const devfolio = require('./devfolio');
const unstop = require('./unstop');
const hackerearth = require('./hackerearth');
const googleSearch = require('./googleSearch');
const { createHtmlSource } = require('./html');
const htmlSources = require('./htmlSources.json');

// Order matters: earlier sources win the canonical row when the same hackathon
// is cross-posted, and the richer feeds are listed first.
const builtIn = [devpost, devfolio, unstop, hackerearth, googleSearch];
const configured = (Array.isArray(htmlSources) ? htmlSources : [])
  .filter((source) => source && source.key && source.url && source.itemSelector)
  .map(createHtmlSource);

const all = [...builtIn, ...configured];

function listSources() {
  return all.map((source) => ({
    key: source.key,
    label: source.label,
    homepage: source.homepage,
    enabled: source.enabled(),
  }));
}

/**
 * Resolves the adapters to run. An explicit list overrides the env filter;
 * adapters that report themselves disabled are always dropped.
 */
function resolveSources({ sources } = {}) {
  const requested = (sources && sources.length ? sources : require('../../config').scrapers.sources)
    .map((key) => String(key).trim().toLowerCase())
    .filter(Boolean);

  const selected = requested.length
    ? all.filter((source) => requested.includes(source.key))
    : all;

  return selected.filter((source) => source.enabled());
}

module.exports = { all, listSources, resolveSources };
