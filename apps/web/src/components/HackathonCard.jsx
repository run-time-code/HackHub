import { useState } from "react";
import {
  formatDate,
  getHackathonId,
  getRegistrationDeadline,
  getStatus,
  getSubmissionDeadline,
  getTitle,
} from "../lib/utils/hackathon";

const STATUS_OPTIONS = ["saved", "registered", "ongoing", "completed"];

export default function HackathonCard({
  hackathon,
  trackingRecord,
  onSave,
  onStatusChange,
  onNotesSave,
  onRemove,
  actionBusy = false,
  isSaving = false,
  isSaved = false,
}) {
  const [notes, setNotes] = useState(trackingRecord?.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [localError, setLocalError] = useState("");
  const id = getHackathonId(hackathon);
  const registrationDeadline = getRegistrationDeadline(hackathon);
  const submissionDeadline = getSubmissionDeadline(hackathon);

  async function saveNotes() {
    setIsSavingNotes(true);
    setLocalError("");
    try {
      await onNotesSave(notes);
    } catch (error) {
      setLocalError(error.message || "Could not save notes.");
    } finally {
      setIsSavingNotes(false);
    }
  }

  return (
    <article className={`hackathon-entry flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover-lift tilt-3d ${trackingRecord ? `entry-${getStatus(trackingRecord)}` : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="entry-organizer text-xs font-semibold uppercase tracking-wide text-emerald-800">
            {hackathon.organizer || "HACKHUB LISTING"}
          </p>
          <h3 className="entry-title mt-1 text-lg font-semibold leading-snug text-slate-950">
            {hackathon.url ? (
              <a href={hackathon.url} target="_blank" rel="noreferrer" className="rounded-sm hover:text-emerald-800 focus-visible:outline-amber-700">
                {getTitle(hackathon)}
              </a>
            ) : getTitle(hackathon)}
          </h3>
        </div>
        {Number.isFinite(Number(hackathon.worthScore)) && (
          <span className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800" aria-label={`Worth score ${hackathon.worthScore} out of 100`}>
            {hackathon.worthScore}/100
          </span>
        )}
      </div>

      {hackathon.description && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{hackathon.description}</p>
      )}

      <dl className="entry-facts mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Register by</dt>
          <dd className="mt-1 font-medium text-slate-800">{formatDate(registrationDeadline)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Submit by</dt>
          <dd className="mt-1 font-medium text-slate-800">{formatDate(submissionDeadline)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Mode</dt>
          <dd className="mt-1 font-medium capitalize text-slate-800">{hackathon.mode || "Not specified"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Prize</dt>
          <dd className="mt-1 font-medium text-slate-800">{hackathon.prizePool || "Not specified"}</dd>
        </div>
      </dl>

      {(hackathon.skills?.length > 0 || hackathon.domains?.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[...(hackathon.skills || []), ...(hackathon.domains || [])].slice(0, 6).map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{tag}</span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-5">
        {trackingRecord ? (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <label className="block text-sm font-medium text-slate-700" htmlFor={`status-${id}`}>
              Your status
            </label>
            <select
              id={`status-${id}`}
              value={getStatus(trackingRecord)}
              onChange={(event) => onStatusChange(event.target.value)}
              disabled={actionBusy}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100"
            >
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
            </select>
            <label className="block text-sm font-medium text-slate-700" htmlFor={`notes-${id}`}>Private notes</label>
            <textarea
              id={`notes-${id}`}
              rows="2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
              placeholder="Add a note for yourself"
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={saveNotes} disabled={isSavingNotes || notes === (trackingRecord.notes || "")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                {isSavingNotes ? "Saving…" : "Save notes"}
              </button>
              <button type="button" onClick={onRemove} disabled={actionBusy} className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                Remove
              </button>
            </div>
            {localError && <p role="alert" className="text-sm text-rose-700">{localError}</p>}
          </div>
        ) : (
          <button type="button" onClick={() => onSave(id)} disabled={!id || isSaving || isSaved} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? "Saving…" : isSaved ? "Saved to dashboard" : "Save hackathon"}
          </button>
        )}
      </div>
    </article>
  );
}
