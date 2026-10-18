export function getHackathon(record) {
  return record?.hackathon || record?.event || record || {};
}

export function getHackathonId(hackathon) {
  return hackathon?._id || hackathon?.id || hackathon?.hackathonId;
}

export function getTrackingId(record) {
  return record?._id || record?.id || record?.savedId;
}

export function getTitle(hackathon) {
  return hackathon?.title || hackathon?.name || "Untitled hackathon";
}

export function getRegistrationDeadline(hackathon) {
  return hackathon?.registrationDeadline || hackathon?.registration_deadline || null;
}

export function getSubmissionDeadline(hackathon) {
  return hackathon?.submissionDeadline || hackathon?.submission_deadline || null;
}

export function formatDate(value, options = { dateStyle: "medium" }) {
  if (!value) return "Not announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function getStatus(record) {
  return record?.status || "saved";
}

export function getEventIdentity(event) {
  return event?._id || event?.id || `${event?.type || "event"}-${event?.date || ""}-${event?.title || ""}`;
}
