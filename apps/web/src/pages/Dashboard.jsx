import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HackathonCard from "../components/HackathonCard";
import { getSavedHackathons, removeSavedHackathon, updateSavedHackathon } from "../lib/api/hackathons";
import {
  formatDate,
  getHackathon,
  getRegistrationDeadline,
  getStatus,
  getSubmissionDeadline,
  getTitle,
  getTrackingId,
} from "../lib/utils/hackathon";

const TABS = [
  { id: "all", label: "All" },
  { id: "saved", label: "Saved" },
  { id: "registered", label: "Registered" },
  { id: "ongoing", label: "Ongoing" },
  { id: "completed", label: "Completed" },
];

function getUpcomingDeadline(records) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlines = records.flatMap((record) => {
    const hackathon = getHackathon(record);
    return [
      getRegistrationDeadline(hackathon),
      getSubmissionDeadline(hackathon),
    ].filter((value) => value && !Number.isNaN(new Date(value).getTime()));
  }).map((value) => new Date(value)).filter((date) => date >= today).sort((a, b) => a - b);
  return deadlines[0];
}

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [requestVersion, setRequestVersion] = useState(0);
  const [loadedVersion, setLoadedVersion] = useState(-1);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [pendingIds, setPendingIds] = useState([]);

  const isLoading = loadedVersion !== requestVersion;
  const visibleError = isLoading ? "" : error;

  function refresh() {
    setError("");
    setRequestVersion((version) => version + 1);
  }

  useEffect(() => {
    let isCurrent = true;
    getSavedHackathons()
      .then((items) => {
        if (isCurrent) setRecords(items);
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message || "Could not load your hackathons.");
      })
      .finally(() => {
        if (isCurrent) setLoadedVersion(requestVersion);
      });
    return () => { isCurrent = false; };
  }, [requestVersion]);

  const counts = useMemo(() => Object.fromEntries(
    TABS.map(({ id }) => [id, id === "all" ? records.length : records.filter((item) => getStatus(item) === id).length])
  ), [records]);

  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      if (activeTab !== "all" && getStatus(record) !== activeTab) return false;
      const hackathon = getHackathon(record);
      return !normalizedQuery || `${getTitle(hackathon)} ${hackathon.organizer || ""}`.toLowerCase().includes(normalizedQuery);
    });
  }, [activeTab, query, records]);

  const upcomingDeadline = getUpcomingDeadline(records);

  async function handleStatusChange(record, nextStatus) {
    const id = getTrackingId(record);
    if (!id || pendingIds.includes(id) || nextStatus === getStatus(record)) return;
    setActionError("");
    setPendingIds((current) => [...current, id]);
    setRecords((current) => current.map((item) => getTrackingId(item) === id ? { ...item, status: nextStatus } : item));
    try {
      await updateSavedHackathon(id, { status: nextStatus });
    } catch (requestError) {
      setRecords((current) => current.map((item) => getTrackingId(item) === id ? { ...item, status: getStatus(record) } : item));
      setActionError(`Could not update ${getTitle(getHackathon(record))}: ${requestError.message}`);
    } finally {
      setPendingIds((current) => current.filter((pendingId) => pendingId !== id));
    }
  }

  async function handleNotesSave(record, notes) {
    const id = getTrackingId(record);
    if (!id) throw new Error("This saved hackathon is missing its tracking identifier.");
    await updateSavedHackathon(id, { notes });
    setRecords((current) => current.map((item) => getTrackingId(item) === id ? { ...item, notes } : item));
  }

  async function handleRemove(record) {
    const id = getTrackingId(record);
    if (!id) {
      setActionError("This saved hackathon is missing its tracking identifier.");
      return;
    }
    if (pendingIds.includes(id)) return;
    if (!window.confirm(`Remove "${getTitle(getHackathon(record))}" from your dashboard?`)) return;
    const previousIndex = records.findIndex((item) => getTrackingId(item) === id);
    setActionError("");
    setPendingIds((current) => [...current, id]);
    setRecords((current) => current.filter((item) => getTrackingId(item) !== id));
    try {
      await removeSavedHackathon(id);
    } catch (requestError) {
      setRecords((current) => {
        if (current.some((item) => getTrackingId(item) === id)) return current;
        const restored = [...current];
        restored.splice(Math.min(previousIndex, restored.length), 0, record);
        return restored;
      });
      setActionError(`Could not remove ${getTitle(getHackathon(record))}: ${requestError.message}`);
    } finally {
      setPendingIds((current) => current.filter((pendingId) => pendingId !== id));
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="field-label">YOUR BUILD LOG</p>
          <h1 className="product-heading mt-2">My desk.</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Keep track of the hackathons you have saved, joined, and finished.</p>
        </div>
        <Link to="/discover" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
          Find hackathons
        </Link>
      </section>

      {visibleError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
          <h2 className="font-semibold text-rose-900">Your dashboard could not be loaded</h2>
          <p className="mt-1 text-sm text-rose-800">{visibleError}</p>
          <button type="button" onClick={refresh} className="mt-4 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-white">Try again</button>
        </section>
      ) : (
        <>
          <section aria-label="Hackathon summary" className="progress-ledger grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {TABS.filter(({ id }) => id !== "all").map(({ id, label }) => (
              <div key={id} className={`ledger-cell ledger-${id}`}>
                <p>{label}</p>
                <p aria-live="polite">{isLoading ? "—" : counts[id]}</p>
              </div>
            ))}
            <div className="ledger-cell ledger-deadline">
              <p>Next deadline</p>
              <p>{isLoading ? "Loading…" : upcomingDeadline ? formatDate(upcomingDeadline) : "None ahead"}</p>
            </div>
          </section>

          <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Filter hackathons by status">
                {TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={activeTab === id}
                    onClick={() => setActiveTab(id)}
                    className={`status-filter whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${
                      activeTab === id ? "is-active" : ""
                    }`}
                  >
                    {label} <span className={activeTab === id ? "text-emerald-800" : "text-slate-400"}>{counts[id]}</span>
                  </button>
                ))}
              </div>
              <label className="sr-only" htmlFor="dashboard-search">Search your hackathons</label>
              <input id="dashboard-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your hackathons" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm sm:max-w-xs focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100" />
            </div>
            {actionError && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{actionError}</p>}
            {isLoading ? (
              <p className="py-14 text-center text-sm text-slate-600" role="status">Loading your hackathons…</p>
            ) : visibleRecords.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <h2 className="text-lg font-semibold text-slate-900">{records.length ? "No matches in this view" : "Your dashboard is ready when you are"}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {records.length ? "Try another status tab or search term." : "Save an event you are interested in, then track your progress and deadlines here."}
                </p>
                {!records.length && <Link to="/discover" className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Browse the open calls</Link>}
                {!records.length && <Link to="/onboarding" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Finish your field notes</Link>}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleRecords.map((record) => {
                  const hackathon = getHackathon(record);
                  const id = getTrackingId(record);
                  return (
                    <HackathonCard
                      key={id || getTitle(hackathon)}
                      hackathon={hackathon}
                      trackingRecord={record}
                      onStatusChange={(status) => handleStatusChange(record, status)}
                      onNotesSave={(notes) => handleNotesSave(record, notes)}
                      onRemove={() => handleRemove(record)}
                      actionBusy={pendingIds.includes(id)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
