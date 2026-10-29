export const REQUEST_TABS = [
  { value: "incoming", label: "Incoming" },
  { value: "outgoing", label: "Outgoing" },
  { value: "history", label: "History" },
];

export function isPending(request) {
  return request?.status === "pending";
}

export function isRequestForMyTeam(request, currentUserId, ledTeamIds = []) {
  if (!request) return false;
  return (
    request.type === "request" &&
    (request.team?.leader === currentUserId || ledTeamIds.includes(request.team?.id))
  );
}

export function isIncomingRequest(request, currentUserId, ledTeamIds = []) {
  if (!request) return false;
  if (request.type === "invite") return request.user?.id === currentUserId;
  return isRequestForMyTeam(request, currentUserId, ledTeamIds);
}

export function isOutgoingRequest(request, currentUserId, ledTeamIds = []) {
  if (!request) return false;
  if (request.initiatedBy !== currentUserId) return false;
  return !isIncomingRequest(request, currentUserId, ledTeamIds);
}

export function requestDirection(request, currentUserId, ledTeamIds = []) {
  if (isIncomingRequest(request, currentUserId, ledTeamIds)) return "incoming";
  if (isOutgoingRequest(request, currentUserId, ledTeamIds)) return "outgoing";
  return "other";
}

export function requestCounts(requests = [], currentUserId, ledTeamIds = []) {
  const counts = {
    incoming: 0,
    outgoing: 0,
    history: 0,
    pendingIncoming: 0,
    pendingOutgoing: 0,
    requests: 0,
    invites: 0,
  };
  for (const request of requests) {
    if (!request) continue;
    if (request.type === "request") counts.requests += 1;
    else counts.invites += 1;
    if (isPending(request)) {
      const direction = requestDirection(request, currentUserId, ledTeamIds);
      if (direction === "incoming") {
        counts.incoming += 1;
        counts.pendingIncoming += 1;
      } else if (direction === "outgoing") {
        counts.outgoing += 1;
        counts.pendingOutgoing += 1;
      }
    } else {
      counts.history += 1;
    }
  }
  return counts;
}

export function filterRequests(
  requests = [],
  { tab = "incoming", type = "all", currentUserId, ledTeamIds = [] } = {}
) {
  return requests.filter((request) => {
    if (!request) return false;
    if (type !== "all" && request.type !== type) return false;
    if (tab === "history") return !isPending(request);
    if (!isPending(request)) return false;
    return requestDirection(request, currentUserId, ledTeamIds) === tab;
  });
}

export function requestCopy(request, currentUserId, ledTeamIds = []) {
  if (!request) {
    return {
      direction: "other",
      title: "Request",
      eyebrow: "The wire",
      person: "",
      team: "",
    };
  }
  const direction = requestDirection(request, currentUserId, ledTeamIds);
  const teamName = request.team?.name || "a team";
  const userName = request.user?.name || "A builder";
  const isInvite = request.type === "invite";

  if (direction === "incoming") {
    return {
      direction,
      title: isInvite ? `${teamName} invited you` : `${userName} wants to join ${teamName}`,
      eyebrow: isInvite ? "Invitation received" : "Join request received",
      person: isInvite ? teamName : userName,
      team: teamName,
    };
  }
  if (direction === "outgoing") {
    return {
      direction,
      title: isInvite ? `Invitation to ${userName}` : `Request to join ${teamName}`,
      eyebrow: isInvite ? "Invitation sent" : "Request sent",
      person: isInvite ? userName : teamName,
      team: teamName,
    };
  }
  return {
    direction,
    title: isInvite ? `Invitation · ${teamName}` : `Request · ${teamName}`,
    eyebrow: isInvite ? "Invitation" : "Join request",
    person: userName,
    team: teamName,
  };
}
