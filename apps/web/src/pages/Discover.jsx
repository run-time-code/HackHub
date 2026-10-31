import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import HackathonCard from "../components/HackathonCard";
import {
  getHackathonFacets,
  getHackathonRecommendations,
  getHackathons,
  saveHackathon,
} from "../lib/api/hackathons";

const FILTER_KEYS = ["q", "domain", "skill", "mode", "location", "source", "upcoming", "hasPrize", "sort"];
const EMPTY_FILTERS = {
  q: "",
  domain: "",
  skill: "",
  mode: "",
  location: "",
  source: "",
  upcoming: false,
  hasPrize: false,
  sort: "title",
};

function filtersFromParams(params) {
  return {
    q: params.get("q") || "",
    domain: params.get("domain") || "",
    skill: params.get("skill") || "",
    mode: params.get("mode") || "",
    location: params.get("location") || "",
    source: params.get("source") || "",
    upcoming: params.get("upcoming") === "true",
    hasPrize: params.get("hasPrize") === "true",
    sort: params.get("sort") || "title",
  };
}

function idFor(hackathon) {
  return String(hackathon.id || hackathon._id || hackathon.slug || "");
}

function comparisonDate(value) {
  if (!value) return "Not announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default function Discover() {
  const location = useLocation();
  return <DiscoveryPage key={location.search} />;
}

function DiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const routeParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const routeFilters = useMemo(() => filtersFromParams(routeParams), [routeParams]);
  const [filters, setFilters] = useState(routeFilters);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [savedIds, setSavedIds] = useState([]);
  const [facets, setFacets] = useState({ domains: [], skills: [], modes: [], sources: [] });
  const [facetsError, setFacetsError] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [recommendationsVersion, setRecommendationsVersion] = useState(0);
  const [comparison, setComparison] = useState([]);

  const page = Math.max(Number(routeParams.get("page")) || 1, 1);
  const requestKey = `${queryString}:${retryVersion}`;
  const isLoading = loadedRequestKey !== requestKey;
  const visibleError = isLoading ? "" : error;

  useEffect(() => {
    let isCurrent = true;
    const requestFilters = { ...routeFilters, page, limit: 24 };
    if (!routeFilters.upcoming) delete requestFilters.upcoming;
    if (!routeFilters.hasPrize) delete requestFilters.hasPrize;
    getHackathons(requestFilters)
      .then((result) => {
        if (isCurrent) {
          setItems(result.items);
          setPagination(result.pagination);
          setError("");
        }
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message || "Could not load hackathons.");
      })
      .finally(() => {
        if (isCurrent) setLoadedRequestKey(requestKey);
      });
    return () => { isCurrent = false; };
  }, [page, requestKey, routeFilters]);

  useEffect(() => {
    let isCurrent = true;
    getHackathonFacets()
      .then((result) => {
        if (isCurrent) setFacets(result);
      })
      .catch((requestError) => {
        if (isCurrent) setFacetsError(requestError.message || "Could not load filter options.");
      });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    getHackathonRecommendations()
      .then((result) => {
        if (isCurrent) {
          setRecommendations(result.items);
          setRecommendationsError("");
        }
      })
      .catch((requestError) => {
        if (isCurrent) setRecommendationsError(requestError.message || "Could not load recommendations.");
      });
    return () => { isCurrent = false; };
  }, [recommendationsVersion]);

  function writeUrl(values, { clear = false, keepPage = false } = {}) {
    const next = clear ? new URLSearchParams() : new URLSearchParams(searchParams);
    for (const key of FILTER_KEYS) {
      const value = values[key];
      if (value === true) next.set(key, "true");
      else if (value && value !== EMPTY_FILTERS[key]) next.set(key, String(value).trim());
      else next.delete(key);
    }
    if (!keepPage) next.delete("page");
    setSearchParams(next, { preventScrollReset: true });
  }

  function submitFilters(event) {
    event.preventDefault();
    writeUrl(filters);
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next, { preventScrollReset: true });
  }

  function load() {
    setError("");
    setRetryVersion((version) => version + 1);
  }

  async function handleSave(id) {
    setBusyId(id);
    setMessage("");
    setMessageIsError(false);
    try {
      await saveHackathon(id);
      setSavedIds((current) => current.includes(id) ? current : [...current, id]);
      setMessage("Hackathon saved to your dashboard.");
    } catch (requestError) {
      setMessageIsError(true);
      setMessage(`Could not save this hackathon: ${requestError.message}`);
    } finally {
      setBusyId("");
    }
  }

  function toggleComparison(hackathon) {
    const id = idFor(hackathon);
    if (comparison.some((item) => idFor(item) === id)) {
      setComparison((current) => current.filter((item) => idFor(item) !== id));
      return;
    }
    if (comparison.length >= 3) {
      setMessage("Compare up to three hackathons at a time.");
      setMessageIsError(true);
      return;
    }
    setMessage("");
    setComparison((current) => [...current, hackathon]);
  }

  return (
    <div className="space-y-7">
      <section>
        <p className="field-label">THE OPEN CALL / 02</p>
        <h1 className="product-heading mt-2">Find your next build.</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Search, filter, compare, and find the open call that fits your next build.</p>
      </section>

      <section aria-labelledby="recommendations-title" className="space-y-4">
        <div>
          <p className="field-label">A GOOD PLACE TO START</p>
          <h2 id="recommendations-title" className="mt-1 text-xl font-semibold text-slate-950">Recommended for you</h2>
          <p className="mt-1 text-sm text-slate-600">A transparent heuristic using your saved interests and skills, event dates, prize disclosure, and listing details—not a prediction of outcomes.</p>
        </div>
        {recommendationsError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p>{recommendationsError}</p>
            <button type="button" onClick={() => setRecommendationsVersion((version) => version + 1)} className="mt-2 font-semibold underline">Try recommendations again</button>
          </div>
        ) : recommendations.length ? (
          <div className="event-board grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.slice(0, 3).map((hackathon) => {
              const id = idFor(hackathon);
              return (
                <HackathonCard
                  key={`recommended-${id}`}
                  hackathon={hackathon}
                  onSave={handleSave}
                  isSaving={busyId === id}
                  isSaved={savedIds.includes(id)}
                  onCompare={toggleComparison}
                  isCompared={comparison.some((item) => idFor(item) === id)}
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No active listings to recommend yet. Add interests and skills to your profile to personalize future suggestions.</p>
        )}
      </section>

      <form onSubmit={submitFilters} className="discovery-filters grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="discover-q" className="mb-1 block text-xs font-semibold text-slate-600">Event or organizer</label>
          <input id="discover-q" type="search" value={filters.q} onChange={(event) => setFilters((old) => ({ ...old, q: event.target.value }))} placeholder="Name or organizer" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100" />
        </div>
        <div>
          <label htmlFor="discover-domain" className="mb-1 block text-xs font-semibold text-slate-600">Domain</label>
          <select id="discover-domain" value={filters.domain} onChange={(event) => setFilters((old) => ({ ...old, domain: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
            <option value="">All domains</option>
            {facets.domains.map((facet) => <option key={facet.value} value={facet.value}>{facet.value} ({facet.count})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="discover-skill" className="mb-1 block text-xs font-semibold text-slate-600">Skill</label>
          <select id="discover-skill" value={filters.skill} onChange={(event) => setFilters((old) => ({ ...old, skill: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
            <option value="">Any skill</option>
            {facets.skills.map((facet) => <option key={facet.value} value={facet.value}>{facet.value} ({facet.count})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="discover-mode" className="mb-1 block text-xs font-semibold text-slate-600">Mode</label>
          <select id="discover-mode" value={filters.mode} onChange={(event) => setFilters((old) => ({ ...old, mode: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
            <option value="">Any mode</option>
            {facets.modes.map((facet) => <option key={facet.value} value={facet.value}>{facet.value} ({facet.count})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="discover-location" className="mb-1 block text-xs font-semibold text-slate-600">Location</label>
          <input id="discover-location" value={filters.location} onChange={(event) => setFilters((old) => ({ ...old, location: event.target.value }))} placeholder="City or region" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100" />
        </div>
        <div>
          <label htmlFor="discover-source" className="mb-1 block text-xs font-semibold text-slate-600">Platform</label>
          <select id="discover-source" value={filters.source} onChange={(event) => setFilters((old) => ({ ...old, source: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
            <option value="">All platforms</option>
            {facets.sources.map((facet) => <option key={facet.value} value={facet.value}>{facet.value} ({facet.count})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="discover-sort" className="mb-1 block text-xs font-semibold text-slate-600">Sort by</label>
          <select id="discover-sort" value={filters.sort} onChange={(event) => setFilters((old) => ({ ...old, sort: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
            <option value="title">Name</option>
            <option value="newest">Recently updated</option>
            <option value="deadline">Nearest deadline</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2 xl:col-span-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={filters.upcoming} onChange={(event) => setFilters((old) => ({ ...old, upcoming: event.target.checked }))} />
            Upcoming only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={filters.hasPrize} onChange={(event) => setFilters((old) => ({ ...old, hasPrize: event.target.checked }))} />
            Prize announced
          </label>
          <button type="submit" className="field-action rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Apply filters</button>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); writeUrl({}, { clear: true }); }} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Clear filters</button>
          {facetsError && <span role="status" className="text-sm text-amber-900">Filter options unavailable: {facetsError}</span>}
        </div>
      </form>

      {message && <p role={messageIsError ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${messageIsError ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p>}
      {visibleError ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="font-semibold text-rose-900">Hackathons could not be loaded</h2>
          <p className="mt-1 text-sm text-rose-800">{visibleError}</p>
          <button type="button" onClick={load} className="mt-4 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-white">Try again</button>
        </div>
      ) : isLoading ? (
        <p role="status" className="py-14 text-center text-sm text-slate-600">Loading hackathons…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No hackathons found</h2>
          <p className="mt-2 text-sm text-slate-600">Try changing or clearing your search filters.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {items.length} hackathon{items.length === 1 ? "" : "s"} shown
              {pagination?.total != null && ` · ${pagination.total} total`}
            </p>
            {pagination?.total > 24 && (
              <nav aria-label="Hackathon pages" className="flex items-center gap-2">
                <button type="button" disabled={page <= 1 || isLoading} onClick={() => changePage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
                <span className="text-sm text-slate-600">Page {page} of {Math.ceil(pagination.total / 24)}</span>
                <button type="button" disabled={page >= Math.ceil(pagination.total / 24) || isLoading} onClick={() => changePage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
              </nav>
            )}
          </div>
          <div className="event-board grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((hackathon) => {
              const id = idFor(hackathon);
              return (
                <HackathonCard
                  key={id || hackathon.title}
                  hackathon={hackathon}
                  onSave={handleSave}
                  isSaving={busyId === id}
                  isSaved={savedIds.includes(id)}
                  onCompare={toggleComparison}
                  isCompared={comparison.some((item) => idFor(item) === id)}
                />
              );
            })}
          </div>
        </>
      )}
      {comparison.length > 0 && (
        <section aria-labelledby="comparison-title" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="comparison-title" className="text-lg font-semibold text-slate-950">Compare hackathons</h2>
              <p className="text-sm text-slate-600">{comparison.length} of 3 selected</p>
            </div>
            <button type="button" onClick={() => setComparison([])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Clear comparison</button>
          </div>
          {comparison.length < 2 ? (
            <p role="status" className="text-sm text-slate-600">Select one more hackathon to compare them side by side.</p>
          ) : <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Hackathon comparison table">
            <table className="min-w-[36rem] w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th scope="col" className="border-b p-3 text-slate-600">Details</th>
                  {comparison.map((item) => <th key={idFor(item)} scope="col" className="min-w-48 border-b p-3 align-top text-slate-950">{item.title || item.name || "Hackathon"}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Organizer", (item) => item.organizer || "Not specified"],
                  ["Mode", (item) => item.mode || "Not specified"],
                  ["Location", (item) => item.location || "Not specified"],
                  ["Prize", (item) => item.prizePool || item.prize || "Not announced"],
                  ["Registration deadline", (item) => comparisonDate(item.registrationDeadline)],
                  ["Submission deadline", (item) => comparisonDate(item.submissionDeadline)],
                  ["Skills", (item) => (item.skills || []).join(", ") || "Not specified"],
                  ["Domains", (item) => (item.domains || []).join(", ") || "Not specified"],
                  ["Worth score", (item) => Number.isFinite(Number(item.worthScore)) ? `${item.worthScore}/100` : "Not available"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row" className="border-b p-3 font-medium text-slate-600">{label}</th>
                    {comparison.map((item) => <td key={idFor(item)} className="border-b p-3 align-top text-slate-800">{value(item)}</td>)}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="p-3 font-medium text-slate-600">Actions</th>
                  {comparison.map((item) => <td key={idFor(item)} className="p-3"><Link className="font-semibold text-emerald-800 underline" to={`/discover/${encodeURIComponent(item.slug || idFor(item))}`}>View details</Link></td>)}
                </tr>
              </tbody>
            </table>
          </div>}
        </section>
      )}
      {busyId && <p className="sr-only" role="status">Saving hackathon…</p>}
    </div>
  );
}
