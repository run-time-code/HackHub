import { describe, expect, it } from "vitest";
import { generateCalendarIcs } from "./ics";

describe("generateCalendarIcs", () => {
  it("exports valid events with escaped text and CRLF line endings", () => {
    const result = generateCalendarIcs([
      {
        id: "event-1",
        title: "Build, submit; celebrate,",
        description: "Line one\nLine two",
        start: "2030-05-15T12:00:00.000Z",
        end: "2030-05-15T13:00:00.000Z",
        url: "https://example.com/event",
      },
    ], { now: "2030-01-01T00:00:00.000Z" });

    expect(result.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(result.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(result).not.toMatch(/(^|[^\r])\n/);
    expect(result).toContain("SUMMARY:Build\\, submit\\; celebrate\\,");
    expect(result).toContain("DESCRIPTION:Line one\\nLine two");
    expect(result).toContain("DTSTART:20300515T120000Z");
    expect(result).toContain("DTEND:20300515T130000Z");
    expect(result).toContain("URL:https://example.com/event");
  });

  it("uses UTC for offset timestamps and includes the hackathon title", () => {
    const result = generateCalendarIcs([{
      id: "event-2",
      title: "Registration deadline",
      start: "2030-05-15T17:30:00+05:30",
      hackathon: { title: "Calendar Hack" },
    }], { now: "2030-01-01T00:00:00.000Z" });

    expect(result).toContain("DTSTART:20300515T120000Z");
    expect(result).toContain("SUMMARY:Registration deadline — Calendar Hack");
  });

  it("exports multiple valid events as separate calendar entries", () => {
    const result = generateCalendarIcs([
      { id: "first", title: "First event", start: "2030-05-15T12:00:00Z" },
      { id: "second", title: "Second event", start: "2030-05-16T12:00:00Z" },
    ], { now: "2030-01-01T00:00:00.000Z" });

    expect(result.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(result).toContain("SUMMARY:First event");
    expect(result).toContain("SUMMARY:Second event");
  });

  it("folds long lines at the iCalendar octet limit", () => {
    const result = generateCalendarIcs([{
      title: "é".repeat(80),
      start: "2030-05-15T12:00:00Z",
    }]);
    const lines = result.split("\r\n").filter(Boolean);

    expect(lines.some((line) => line.startsWith(" "))).toBe(true);
    expect(Math.max(...lines.map((line) => new TextEncoder().encode(line).length))).toBeLessThanOrEqual(75);
  });

  it("skips invalid dates and exports no event for them", () => {
    const result = generateCalendarIcs([
      null,
      { title: "Bad", start: "not-a-date" },
      { title: "Missing date" },
    ]);
    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("END:VCALENDAR");
    expect(result).not.toContain("BEGIN:VEVENT");
  });

  it("does not export unsafe event URLs", () => {
    const result = generateCalendarIcs([{
      title: "Safe event",
      start: "2030-05-15T12:00:00.000Z",
      url: "https://example.com/event\r\nATTENDEE:malicious@example.com",
    }]);

    expect(result).not.toContain("ATTENDEE");
    expect(result).not.toContain("URL:");
  });
});
