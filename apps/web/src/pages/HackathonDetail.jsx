import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getHackathon, saveHackathon } from "../lib/api/hackathons";
import { formatDate } from "../lib/utils/hackathon";
import { useDocumentTitle } from "../lib/hooks/useDocumentTitle";

function displayedDate(value) {
  if (!value) return "Not announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default function HackathonDetail() {
  const { id } = useParams();
  return <HackathonDetailContent key={id} id={id} />;
}

function HackathonDetailContent({ id }) {
  const [hackathon, setHackathon] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  useDocumentTitle(hackathon?.title || "Hackathon details", hackathon?.description || "Event details, dates, and organizer information.");

  useEffect(() => {
    let active = true;
    getHackathon(id)
      .then((result) => {
        if (active) setHackathon(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load this hackathon.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  async function handleSave() {
    if (!hackathon) return;
    setIsSaving(true);
    setMessage("");
    try {
      await saveHackathon(hackathon.id || hackathon._id);
      setSaved(true);
      setMessage("Hackathon saved to your dashboard.");
    } catch (requestError) {
      setMessage(requestError.message || "Could not save this hackathon.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p role="status" className="py-16 text-center text-sm text-slate-600">Loading hackathon details…</p>;
  }

  if (error || !hackathon) {
    return (
      <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-semibold text-rose-900">Hackathon not available</h1>
        <p className="mt-2 text-sm text-rose-800">{error || "This hackathon could not be found."}</p>
        <Link to="/discover" className="mt-4 inline-block font-semibold text-rose-900 underline">Back to discover</Link>
      </section>
    );
  }

  const tags = [...new Set([...(hackathon.skills || []), ...(hackathon.domains || [])])];
  return (
    <article className="mx-auto max-w-4xl space-y-7">
      <Link to="/discover" className="inline-flex rounded-sm text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline focus-visible:outline-amber-700">
        ← Back to discover
      </Link>
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="field-label">{hackathon.organizer || hackathon.source || "HACKHUB LISTING"}</p>
        <h1 className="product-heading mt-2">{hackathon.title || "Hackathon"}</h1>
        {hackathon.description && <p className="mt-4 whitespace-pre-line text-base leading-7 text-slate-600">{hackathon.description}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={handleSave} disabled={isSaving || saved} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? "Saving…" : saved ? "Saved to dashboard" : "Save to dashboard"}
          </button>
          {hackathon.url && (
            <a href={hackathon.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Visit official event page
            </a>
          )}
        </div>
        {message && <p role={saved ? "status" : "alert"} className="mt-3 text-sm text-slate-700">{message}</p>}
      </header>

      <section aria-labelledby="event-details-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 id="event-details-heading" className="text-lg font-semibold text-slate-950">Event details</h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Format</dt><dd className="mt-1 capitalize text-slate-900">{hackathon.mode || "Not specified"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt><dd className="mt-1 text-slate-900">{hackathon.location || "Not specified"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prize</dt><dd className="mt-1 text-slate-900">{hackathon.prizePool || hackathon.prize || "Not announced"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</dt><dd className="mt-1 capitalize text-slate-900">{hackathon.source || "Not specified"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registration deadline</dt><dd className="mt-1 text-slate-900">{displayedDate(hackathon.registrationDeadline)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submission deadline</dt><dd className="mt-1 text-slate-900">{displayedDate(hackathon.submissionDeadline)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event dates</dt><dd className="mt-1 text-slate-900">{formatDate(hackathon.eventStartDate)}{hackathon.eventEndDate ? ` – ${formatDate(hackathon.eventEndDate)}` : ""}</dd></div>
        </dl>
        {tags.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-800">Skills and domains</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => <li key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{tag}</li>)}
            </ul>
          </div>
        )}
      </section>
    </article>
  );
}
