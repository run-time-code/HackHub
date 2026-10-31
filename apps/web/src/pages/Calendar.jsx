import { useEffect, useMemo, useState } from "react";
import {
  createReminder,
  getCalendarEvents,
  getReminders,
  getReminderPreferences,
} from "../lib/api/calendar";
import { getEventIdentity, getHackathonId, getHackathon, getTitle } from "../lib/utils/hackathon";
import ReminderPreferencesForm from "../components/ReminderPreferencesForm";
import { downloadCalendarIcs } from "../lib/ics";

const TIME_ZONE = "Asia/Kolkata";
const VIEWS = ["month", "week", "agenda"];

function dateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getIstDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
}

function makeIstCalendarDate(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day, 6));
}

function todayIst() {
  const { year, month, day } = getIstDateParts(new Date());
  return makeIstCalendarDate(year, month - 1, day);
}

function eventDate(event) {
  return event.date || event.start || event.startsAt || event.startDate ||
    event.registrationDeadline || event.submissionDeadline || null;
}

function getEventType(event) {
  const type = String(event.type || event.eventType || "").toLowerCase();
  if (type.includes("registration")) return "registration";
  if (type.includes("submission")) return "submission";
  if (type.includes("event") || type.includes("start")) return "event";
  return "event";
}

function eventLabel(event) {
  return event.title || event.name || event.label ||
    (getEventType(event) === "registration" ? "Registration deadline" :
      getEventType(event) === "submission" ? "Submission deadline" : "Hackathon event");
}

function formatIst(value, options = { dateStyle: "medium", timeStyle: "short" }) {
  if (!value) return "Date not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const formatOptions = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? { dateStyle: "medium" }
    : options;
  return new Intl.DateTimeFormat(undefined, { ...formatOptions, timeZone: TIME_ZONE }).format(date);
}

function monthKey(date) {
  const { year, month } = getIstDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addMonths(date, amount) {
  const { year, month } = getIstDateParts(date);
  return makeIstCalendarDate(year, month - 1 + amount, 1);
}

function getWeekDates(date) {
  const { year, month, day } = getIstDateParts(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return Array.from({ length: 7 }, (_, index) => {
    return makeIstCalendarDate(year, month - 1, day - weekday + index);
  });
}

function getMonthCells(date) {
  const { year, month } = getIstDateParts(date);
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const length = Math.ceil((weekday + daysInMonth) / 7) * 7;
  return Array.from({ length }, (_, index) => {
    return makeIstCalendarDate(year, month - 1, 1 - weekday + index);
  });
}

function getEventHackathon(event) {
  return getHackathon(event.hackathon || event);
}

function eventDateValue(event) {
  const value = eventDate(event);
  if (!value || Number.isNaN(new Date(value).getTime())) return null;
  return value;
}

function CalendarEventButton({ event, selected, onClick }) {
  const type = getEventType(event);
  const color = type === "registration" ? "bg-amber-100 text-amber-900" :
    type === "submission" ? "bg-rose-100 text-rose-900" : "bg-emerald-100 text-emerald-900";
  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      aria-pressed={selected}
      className={`block w-full truncate rounded px-1.5 py-1 text-left text-xs font-medium focus-visible:outline-amber-700 ${color}`}
      title={`${eventLabel(event)} — ${getTitle(getEventHackathon(event))}`}
    >
      {eventLabel(event)}
    </button>
  );
}

export default function Calendar() {
  const [view, setView] = useState("month");
  const [focusDate, setFocusDate] = useState(todayIst);
  const [events, setEvents] = useState([]);
  const [eventLoadVersion, setEventLoadVersion] = useState(0);
  const [eventsLoadedKey, setEventsLoadedKey] = useState("");
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [reminderLoadVersion, setReminderLoadVersion] = useState(0);
  const [remindersLoadedVersion, setRemindersLoadedVersion] = useState(-1);
  const [remindersError, setRemindersError] = useState("");
  const [reminderState, setReminderState] = useState({ leadTime: "1", customDays: "", channel: "email" });
  const [reminderMessage, setReminderMessage] = useState("");
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    async function loadDefaults() {
      try {
        const data = await getReminderPreferences();
        const preferences = data?.preferences || data;
        const daysBefore = Number(preferences?.defaultDaysBefore);
        const preferredChannel = preferences?.channels?.[0];
        if (isCurrent && Number.isInteger(daysBefore)) {
          setReminderState((current) => ({
            ...current,
            leadTime: [1, 3, 7].includes(daysBefore) ? String(daysBefore) : "custom",
            customDays: [1, 3, 7].includes(daysBefore) ? "" : String(daysBefore),
            channel: ["email", "in_app"].includes(preferredChannel) ? preferredChannel : current.channel,
          }));
        }
      } catch (requestError) {
        if (isCurrent) {
          setReminderMessage(`Saved reminder defaults could not be loaded: ${requestError.message}`);
        }
      }
    }
    loadDefaults();
    return () => { isCurrent = false; };
  }, []);

  const rangeDates = useMemo(() => {
    if (view === "week") return getWeekDates(focusDate);
    if (view === "agenda") {
      const { year, month } = getIstDateParts(focusDate);
      const lastDay = new Date(Date.UTC(year, month, 0, 6));
      return [makeIstCalendarDate(year, month - 1, 1), lastDay];
    }
    return getMonthCells(focusDate);
  }, [focusDate, view]);
  const monthsToLoad = useMemo(() => [...new Set(rangeDates.map(monthKey))], [rangeDates]);
  const eventRequestKey = `${monthsToLoad.join(",")}:${eventLoadVersion}`;
  const isLoading = eventsLoadedKey !== eventRequestKey;
  const visibleError = isLoading ? "" : error;
  const remindersLoading = remindersLoadedVersion !== reminderLoadVersion;
  const visibleRemindersError = remindersLoading ? "" : remindersError;

  function loadEvents() {
    setError("");
    setEventLoadVersion((version) => version + 1);
  }

  function loadReminders() {
    setRemindersError("");
    setReminderLoadVersion((version) => version + 1);
  }

  useEffect(() => {
    let isCurrent = true;
    async function fetchEvents() {
      try {
        const groups = await Promise.all(monthsToLoad.map((month) => getCalendarEvents(month)));
        const allEvents = groups.flat();
        const malformedEvent = allEvents.find((event) => !eventDateValue(event));
        if (malformedEvent) throw new Error("The calendar API returned an event without a valid date.");
        const unique = new Map(allEvents.map((event) => [getEventIdentity(event), event]));
        if (isCurrent) {
          setEvents([...unique.values()]);
          setError("");
        }
      } catch (requestError) {
        if (isCurrent) setError(requestError.message || "Could not load calendar events.");
      } finally {
        if (isCurrent) setEventsLoadedKey(eventRequestKey);
      }
    }
    fetchEvents();
    return () => { isCurrent = false; };
  }, [eventRequestKey, monthsToLoad]);

  useEffect(() => {
    let isCurrent = true;
    async function fetchReminders() {
      try {
        const items = await getReminders();
        if (isCurrent) {
          setReminders(items);
          setRemindersError("");
        }
      } catch (requestError) {
        if (isCurrent) setRemindersError(requestError.message || "Could not load reminders.");
      } finally {
        if (isCurrent) setRemindersLoadedVersion(reminderLoadVersion);
      }
    }
    fetchReminders();
    return () => { isCurrent = false; };
  }, [reminderLoadVersion]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const event of events) {
      const key = dateKey(new Date(eventDateValue(event)));
      map.set(key, [...(map.get(key) || []), event]);
    }
    return map;
  }, [events]);

  const agendaEvents = useMemo(() => events.filter((event) => {
    const key = dateKey(new Date(eventDateValue(event)));
    return key >= dateKey(rangeDates[0]) && key <= dateKey(rangeDates[rangeDates.length - 1]);
  }).sort((a, b) => new Date(eventDateValue(a)) - new Date(eventDateValue(b))), [events, rangeDates]);

  async function handleCreateReminder(event) {
    event.preventDefault();
    if (!selectedEvent) return;
    const daysBefore = reminderState.leadTime === "custom"
      ? Number(reminderState.customDays)
      : Number(reminderState.leadTime);
    if (!Number.isInteger(daysBefore) || daysBefore < 0 || daysBefore > 365) {
      setReminderMessage("Enter a reminder lead time from 0 to 365 days.");
      return;
    }
    const hackathonId = selectedEvent.hackathonId || getHackathonId(getEventHackathon(selectedEvent));
    if (!hackathonId) {
      setReminderMessage("This event does not include a hackathon identifier, so a reminder cannot be created.");
      return;
    }
    setIsCreatingReminder(true);
    setReminderMessage("");
    try {
      await createReminder({
        hackathonId,
        eventType: getEventType(selectedEvent),
        eventDate: eventDateValue(selectedEvent),
        daysBefore,
        channel: reminderState.channel,
      });
      setReminderMessage("Reminder created.");
      await loadReminders();
    } catch (requestError) {
      setReminderMessage(`Could not create reminder: ${requestError.message}`);
    } finally {
      setIsCreatingReminder(false);
    }
  }

  function moveRange(amount) {
    if (view === "week") {
      setFocusDate((date) => {
        const { year, month, day } = getIstDateParts(date);
        return makeIstCalendarDate(year, month - 1, day + amount * 7);
      });
    } else {
      setFocusDate((date) => addMonths(date, amount));
    }
    setSelectedEvent(null);
  }

  const rangeTitle = view === "week"
    ? `${formatIst(rangeDates[0], { month: "short", day: "numeric", timeZone: TIME_ZONE })} – ${formatIst(rangeDates[6], { month: "short", day: "numeric", year: "numeric", timeZone: TIME_ZONE })}`
    : new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: TIME_ZONE }).format(focusDate);

  return (
    <div className="calendar-page space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="field-label">THE DEADLINE MAP / 03</p>
          <h1 className="product-heading mt-2">Keep your place.</h1>
          <p className="mt-2 text-sm text-slate-600">Dates and times are displayed in India Standard Time (IST, Asia/Kolkata).</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveRange(-1)} aria-label="Previous period" className="grid size-10 place-items-center rounded-lg border border-slate-300 bg-white text-lg hover:bg-slate-50">‹</button>
          <button type="button" onClick={() => { setFocusDate(todayIst()); setSelectedEvent(null); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Today</button>
          <button type="button" onClick={() => moveRange(1)} aria-label="Next period" className="grid size-10 place-items-center rounded-lg border border-slate-300 bg-white text-lg hover:bg-slate-50">›</button>
          <button type="button" onClick={() => downloadCalendarIcs(events)} disabled={!events.length} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Export .ics</button>
        </div>
      </section>

      <section className="calendar-sheet rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">{rangeTitle}</h2>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1" aria-label="Calendar view">
            {VIEWS.map((item) => (
              <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)} className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize ${view === item ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600" aria-label="Event types">
            <span><i className="mr-1.5 inline-block size-2.5 rounded-full bg-amber-400" />Registration deadline</span>
            <span><i className="mr-1.5 inline-block size-2.5 rounded-full bg-rose-500" />Submission deadline</span>
            <span><i className="mr-1.5 inline-block size-2.5 rounded-full bg-emerald-700" />Event date</span>
          </div>
          {visibleError ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5">
              <p className="font-semibold text-rose-900">Calendar events could not be loaded</p>
              <p className="mt-1 text-sm text-rose-800">{visibleError}</p>
              <button type="button" onClick={loadEvents} className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-white">Try again</button>
            </div>
          ) : isLoading ? (
            <p role="status" className="py-12 text-center text-sm text-slate-600">Loading calendar…</p>
          ) : view === "agenda" ? (
            agendaEvents.length ? (
              <div className="divide-y divide-slate-100">
                {agendaEvents.map((event) => (
                  <button key={getEventIdentity(event)} type="button" onClick={() => setSelectedEvent(event)} className="flex w-full flex-col gap-1 py-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-5">
                    <span className="w-44 shrink-0 text-sm font-semibold text-slate-800">{formatIst(eventDateValue(event))}</span>
                    <span className="text-sm font-semibold text-slate-950">{eventLabel(event)}</span>
                    <span className="text-sm text-slate-600">{getTitle(getEventHackathon(event))}</span>
                  </button>
                ))}
              </div>
            ) : <p className="py-12 text-center text-sm text-slate-600">No events in this period.</p>
          ) : (
            <div
              className="grid grid-cols-7 overflow-x-auto rounded-lg border border-slate-200"
              role="region"
              aria-label={`Calendar ${view} view`}
              tabIndex={0}
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="border-b border-r border-slate-200 bg-slate-50 p-2 text-center text-xs font-semibold text-slate-600">{day}</div>
              ))}
              {rangeDates.map((date) => {
                const key = dateKey(date);
                const dayEvents = eventsByDay.get(key) || [];
                const inMonth = monthKey(date) === monthKey(focusDate);
                return (
                  <div key={key} className={`min-h-24 min-w-24 border-b border-r border-slate-200 p-1.5 sm:min-h-32 sm:p-2 ${view === "month" && !inMonth ? "bg-slate-50 text-slate-400" : "bg-white"}`}>
                    <span className={`mb-1 grid size-7 place-items-center text-xs ${key === dateKey(new Date()) ? "rounded-full bg-emerald-800 font-bold text-white" : "text-slate-700"}`}>
                      {new Intl.DateTimeFormat(undefined, { day: "numeric", timeZone: TIME_ZONE }).format(date)}
                    </span>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <CalendarEventButton key={getEventIdentity(event)} event={event} selected={selectedEvent && getEventIdentity(selectedEvent) === getEventIdentity(event)} onClick={setSelectedEvent} />
                      ))}
                      {dayEvents.length > 3 && <p className="px-1 text-xs text-slate-500">+{dayEvents.length - 3} more</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selectedEvent && (
        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]" aria-label="Selected event details">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{getEventType(selectedEvent)} date</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{eventLabel(selectedEvent)}</h2>
            <p className="mt-1 font-medium text-slate-700">{getTitle(getEventHackathon(selectedEvent))}</p>
            <p className="mt-3 text-sm text-slate-600">{formatIst(eventDateValue(selectedEvent))} · IST</p>
            {selectedEvent.description && <p className="mt-3 text-sm leading-6 text-slate-600">{selectedEvent.description}</p>}
            {getEventHackathon(selectedEvent).url && <a href={getEventHackathon(selectedEvent).url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open event page</a>}
          </div>
          <form onSubmit={handleCreateReminder} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Create a reminder</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="reminder-lead" className="mb-1 block text-sm font-medium text-slate-700">Notify me</label>
                <select id="reminder-lead" value={reminderState.leadTime} onChange={(event) => setReminderState((state) => ({ ...state, leadTime: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="1">1 day before</option>
                  <option value="3">3 days before</option>
                  <option value="7">1 week before</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {reminderState.leadTime === "custom" && <div>
                <label htmlFor="reminder-custom-days" className="mb-1 block text-sm font-medium text-slate-700">Days before (0–365)</label>
                <input id="reminder-custom-days" type="number" min="0" max="365" value={reminderState.customDays} onChange={(event) => setReminderState((state) => ({ ...state, customDays: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              </div>}
              <div>
                <label htmlFor="reminder-channel" className="mb-1 block text-sm font-medium text-slate-700">Notification channel</label>
                <select id="reminder-channel" value={reminderState.channel} onChange={(event) => setReminderState((state) => ({ ...state, channel: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="email">Email</option>
                  <option value="in_app">In-app</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={isCreatingReminder} className="mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{isCreatingReminder ? "Creating…" : "Create reminder"}</button>
            {reminderMessage && <p role="status" className="mt-3 text-sm text-slate-700">{reminderMessage}</p>}
          </form>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <ReminderPreferencesForm />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Your reminders</h2>
          {visibleRemindersError ? (
            <div role="alert" className="mt-3 text-sm text-rose-800">{visibleRemindersError} <button type="button" onClick={loadReminders} className="font-semibold underline">Retry</button></div>
          ) : remindersLoading ? (
            <p role="status" className="mt-3 text-sm text-slate-600">Loading reminders…</p>
          ) : reminders.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {reminders.map((reminder, index) => <li key={reminder._id || reminder.id || `${reminder.eventType}-${index}`} className="py-3 text-sm">
                <p className="font-semibold text-slate-800">{reminder.title || reminder.eventType || "Hackathon reminder"}</p>
                <p className="mt-1 text-slate-600">{reminder.daysBefore ?? reminder.days_before} day(s) before · {reminder.channel || "Channel not specified"}</p>
              </li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-slate-600">No reminders are set up yet.</p>}
        </section>
      </section>
    </div>
  );
}
