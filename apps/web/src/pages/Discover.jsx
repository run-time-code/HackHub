import { useEffect, useState } from "react";
import HackathonCard from "../components/HackathonCard";
import { getHackathons, saveHackathon } from "../lib/api/hackathons";

export default function Discover() {
  const [filters, setFilters] = useState({ q: "", domain: "", mode: "" });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [savedIds, setSavedIds] = useState([]);

  const requestKey = `${JSON.stringify(appliedFilters)}:${page}:${retryVersion}`;
  const isLoading = loadedRequestKey !== requestKey;
  const visibleError = isLoading ? "" : error;

  function load() {
    setError("");
    setRetryVersion((version) => version + 1);
  }

  useEffect(() => {
    let isCurrent = true;
    getHackathons({ ...appliedFilters, page, limit: 24 })
      .then((result) => {
        if (isCurrent) {
          setItems(result.items);
          setPagination(result.pagination);
        }
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message || "Could not load hackathons.");
      })
      .finally(() => {
        if (isCurrent) setLoadedRequestKey(requestKey);
      });
    return () => { isCurrent = false; };
  }, [appliedFilters, page, requestKey]);

  function submitFilters(event) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
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

  return (
    <div className="space-y-7">
      <section>
        <p className="field-label">THE OPEN CALL / 02</p>
        <h1 className="product-heading mt-2">Find your next build.</h1>
        <p className="mt-2 max-w-2xl text-slate-600">A short list beats a missed deadline. Search the open calls by what you want to make.</p>
      </section>

      <form onSubmit={submitFilters} className="discovery-filters grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="discover-q" className="mb-1 block text-xs font-semibold text-slate-600">Event or organizer</label>
          <input id="discover-q" type="search" value={filters.q} onChange={(event) => setFilters((old) => ({ ...old, q: event.target.value }))} placeholder="Name or organizer" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100" />
        </div>
        <div>
          <label htmlFor="discover-domain" className="mb-1 block text-xs font-semibold text-slate-600">What are you into?</label>
          <input id="discover-domain" value={filters.domain} onChange={(event) => setFilters((old) => ({ ...old, domain: event.target.value }))} placeholder="AI, climate, fintech…" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100" />
        </div>
        <div>
          <label htmlFor="discover-mode" className="mb-1 block text-xs font-semibold text-slate-600">Mode</label>
          <select id="discover-mode" value={filters.mode} onChange={(event) => setFilters((old) => ({ ...old, mode: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
            <option value="">Any mode</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <button type="submit" className="field-action self-end rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Find events</button>
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
            {pagination?.total != null && pagination.total > 24 && (
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
                <span className="text-sm text-slate-600">Page {page} of {Math.ceil(pagination.total / 24)}</span>
                <button type="button" disabled={page >= Math.ceil(pagination.total / 24) || isLoading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
              </div>
            )}
          </div>
          <div className="event-board grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((hackathon) => {
              const id = hackathon._id || hackathon.id;
              return <HackathonCard key={id || hackathon.title} hackathon={hackathon} onSave={handleSave} isSaving={busyId === id} isSaved={savedIds.includes(id)} />;
            })}
          </div>
        </>
      )}
      {busyId && <p className="sr-only" role="status">Saving hackathon…</p>}
    </div>
  );
}
