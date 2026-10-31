import { useEffect, useState } from "react";
import { getReminderPreferences, saveReminderPreferences } from "../lib/api/calendar";

export default function ReminderPreferencesForm() {
  const [preferences, setPreferences] = useState({
    defaultDaysBefore: "1",
    channels: ["email"],
    quietStart: "22:00",
    quietEnd: "08:00",
  });
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let isCurrent = true;
    async function loadPreferences() {
      try {
        const data = await getReminderPreferences();
        const value = data?.preferences || data;
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error("The reminder preferences API returned an unexpected response.");
        }
        if (isCurrent) {
          setPreferences((current) => ({
            defaultDaysBefore: String(value.defaultDaysBefore ?? current.defaultDaysBefore),
            channels: Array.isArray(value.channels) ? value.channels : current.channels,
            quietStart: value.quietHours?.start || current.quietStart,
            quietEnd: value.quietHours?.end || current.quietEnd,
          }));
        }
      } catch (error) {
        if (isCurrent) setLoadError(error.message || "Saved reminder preferences could not be loaded.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }
    loadPreferences();
    return () => { isCurrent = false; };
  }, []);

  function toggleChannel(channel) {
    setPreferences((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((value) => value !== channel)
        : [...current.channels, channel],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = {};
    const defaultDaysBefore = Number(preferences.defaultDaysBefore);
    if (!Number.isInteger(defaultDaysBefore) || defaultDaysBefore < 0 || defaultDaysBefore > 365) {
      errors.defaultDaysBefore = "Choose a reminder lead time from 0 to 365 days.";
    }
    if (!preferences.channels.length) errors.channels = "Choose at least one notification channel.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(preferences.quietStart)) {
      errors.quietStart = "Enter a valid quiet-hours start time in IST.";
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(preferences.quietEnd)) {
      errors.quietEnd = "Enter a valid quiet-hours end time in IST.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setMessage("Review the reminder settings highlighted below.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      await saveReminderPreferences({
        defaultDaysBefore,
        channels: preferences.channels,
        quietHours: { start: preferences.quietStart, end: preferences.quietEnd },
      });
      setFieldErrors({});
      setLoadError("");
      setMessage("Reminder preferences saved.");
    } catch (error) {
      setMessage(`Could not save reminder preferences: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Default reminder preferences</h2>
      <p className="mt-1 text-sm text-slate-600">Choose defaults for future reminders. Quiet hours use IST.</p>
      {loadError && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Saved settings could not be loaded: {loadError}. The values below are suggestions until successfully saved.</p>}
      {isLoading && <p role="status" className="mt-3 text-sm text-slate-600">Loading saved preferences…</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="default-reminder-days" className="mb-1 block text-sm font-medium text-slate-700">Default lead time</label>
          <select id="default-reminder-days" value={preferences.defaultDaysBefore} disabled={isLoading || isSaving} aria-invalid={Boolean(fieldErrors.defaultDaysBefore)} aria-describedby={fieldErrors.defaultDaysBefore ? "default-reminder-days-error" : undefined} onChange={(event) => setPreferences((state) => ({ ...state, defaultDaysBefore: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="1">1 day</option><option value="3">3 days</option><option value="7">1 week</option>
          </select>
          {fieldErrors.defaultDaysBefore && <p id="default-reminder-days-error" role="alert" className="mt-1 text-sm text-rose-700">{fieldErrors.defaultDaysBefore}</p>}
        </div>
        <fieldset aria-describedby={fieldErrors.channels ? "reminder-channels-error" : undefined}>
          <legend className="mb-1 text-sm font-medium text-slate-700">Channels</legend>
          <div className="flex gap-4 pt-2">
            {["email", "in_app"].map((channel) => <label key={channel} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={preferences.channels.includes(channel)} disabled={isLoading || isSaving} onChange={() => toggleChannel(channel)} className="size-4 accent-emerald-800" />
              {channel === "in_app" ? "In-app" : "Email"}
            </label>)}
          </div>
          {fieldErrors.channels && <p id="reminder-channels-error" role="alert" className="mt-2 text-sm text-rose-700">{fieldErrors.channels}</p>}
        </fieldset>
        <div>
          <label htmlFor="quiet-start" className="mb-1 block text-sm font-medium text-slate-700">Quiet hours start (IST)</label>
          <input id="quiet-start" type="time" value={preferences.quietStart} disabled={isLoading || isSaving} aria-invalid={Boolean(fieldErrors.quietStart)} aria-describedby={fieldErrors.quietStart ? "quiet-start-error" : undefined} onChange={(event) => setPreferences((state) => ({ ...state, quietStart: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          {fieldErrors.quietStart && <p id="quiet-start-error" role="alert" className="mt-1 text-sm text-rose-700">{fieldErrors.quietStart}</p>}
        </div>
        <div>
          <label htmlFor="quiet-end" className="mb-1 block text-sm font-medium text-slate-700">Quiet hours end (IST)</label>
          <input id="quiet-end" type="time" value={preferences.quietEnd} disabled={isLoading || isSaving} aria-invalid={Boolean(fieldErrors.quietEnd)} aria-describedby={fieldErrors.quietEnd ? "quiet-end-error" : undefined} onChange={(event) => setPreferences((state) => ({ ...state, quietEnd: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          {fieldErrors.quietEnd && <p id="quiet-end-error" role="alert" className="mt-1 text-sm text-rose-700">{fieldErrors.quietEnd}</p>}
        </div>
      </div>
      <button type="submit" disabled={isSaving || isLoading} className="mt-4 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{isSaving ? "Saving…" : "Save preferences"}</button>
      {message && <p role={message.startsWith("Could not") ? "alert" : "status"} className="mt-3 text-sm text-slate-700">{message}</p>}
    </form>
  );
}
