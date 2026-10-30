import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Inbox, Mail, Sparkles, UserPlus, UsersRound } from "lucide-react";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import PageLoading from "../../components/ui/PageLoading";
import RequestCard from "../../components/requests/RequestCard";
import { listMyRequests, respondToRequest, cancelRequest } from "../../lib/api/requests";
import { listMyTeams } from "../../lib/api/teams";
import { queryKeys } from "../../lib/queryClient";
import { errorMessage } from "../../lib/api/http";
import { useAuth } from "../../context/auth-context";
import { useDocumentTitle } from "../../lib/hooks/useDocumentTitle";
import { useToast } from "../../providers/ToastProvider";
import { celebrate } from "../../lib/celebrate";
import { pluralize } from "../../lib/format";
import {
  filterRequests,
  requestCounts,
  isOutgoingRequest,
  isIncomingRequest,
} from "../../lib/requests";
import { track } from "../../lib/analytics";

const TABS = [
  { value: "incoming", label: "Incoming" },
  { value: "outgoing", label: "Outgoing" },
  { value: "history", label: "History" },
];

const TYPE_FILTERS = [
  { value: "all", label: "Everything" },
  { value: "request", label: "Join requests" },
  { value: "invite", label: "Invitations" },
];

const HISTORY_STATUSES = [
  { value: "all", label: "All outcomes" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

export default function Requests() {
  useDocumentTitle("The wire");
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("incoming");
  const [type, setType] = useState("all");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [confirmState, setConfirmState] = useState(null);

  const requestsQuery = useQuery({
    queryKey: queryKeys.myRequests({ surface: "requests" }),
    queryFn: ({ signal }) => listMyRequests({ limit: 50 }, { signal }),
  });
  const teamsQuery = useQuery({
    queryKey: queryKeys.myTeams,
    queryFn: ({ signal }) => listMyTeams({ signal }),
  });

  const meId = user?.id || user?._id || "";
  const requests = useMemo(() => requestsQuery.data?.items || [], [requestsQuery.data]);
  const ledTeamIds = useMemo(
    () =>
      (teamsQuery.data || [])
        .filter((team) => team.leader === meId)
        .map((team) => team.id),
    [teamsQuery.data, meId]
  );
  const counts = useMemo(
    () => requestCounts(requests, meId, ledTeamIds),
    [requests, meId, ledTeamIds]
  );

  const visibleRequests = useMemo(() => {
    const filtered = filterRequests(requests, {
      tab,
      type,
      currentUserId: meId,
      ledTeamIds,
    });
    if (tab !== "history" || historyStatus === "all") return filtered;
    return filtered.filter((request) => request.status === historyStatus);
  }, [requests, tab, type, historyStatus, meId, ledTeamIds]);

  function invalidateAll(teamIds = []) {
    queryClient.invalidateQueries({ queryKey: ["team-requests", "mine"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.myTeams });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    for (const teamId of teamIds) {
      queryClient.invalidateQueries({ queryKey: queryKeys.team(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamRequests(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamInvitations(teamId) });
    }
  }

  const respondMutation = useMutation({
    mutationFn: ({ requestId, action }) => respondToRequest(requestId, action),
    onSuccess: (request, variables) => {
      invalidateAll([request?.team?.id]);
      if (variables.action === "accept") {
        celebrate();
        toast.success("Accepted", "The crew has a new member. Go make something.");
        track("team_request_accepted", {
          teamId: request?.team?.id,
          requestId: variables.requestId,
        });
      } else {
        toast.success("Declined", "The other builder has been told.");
      }
    },
    onError: (error) => {
      toast.error("That request could not be answered", errorMessage(error));
      invalidateAll();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId) => cancelRequest(requestId),
    onSuccess: (request) => {
      invalidateAll([request?.team?.id]);
      toast.success("Withdrawn", "The wire is clear.");
    },
    onError: (error) => {
      toast.error("Could not withdraw that request", errorMessage(error));
      invalidateAll();
    },
  });

  function askDecline(request) {
    const incoming = isIncomingRequest(request, meId, ledTeamIds);
    setConfirmState({
      title: incoming ? "Decline this request?" : "Withdraw this request?",
      description: incoming
        ? `${request.user?.name || "This builder"} will be told that the seat is not theirs this time.`
        : `The other side will no longer see this ${request.type === "invite" ? "invitation" : "request"}.`,
      confirmLabel: incoming ? "Decline request" : "Withdraw request",
      action: () =>
        respondMutation.mutate({ requestId: request.id, action: "decline" }),
    });
  }

  function askCancel(request) {
    const outgoing = isOutgoingRequest(request, meId, ledTeamIds);
    setConfirmState({
      title: outgoing ? "Withdraw this request?" : "Cancel this invitation?",
      description: outgoing
        ? "The leader will no longer see it on their wire. You can ask again later."
        : `${request.user?.name || "This builder"} will no longer be able to accept the seat.`,
      confirmLabel: "Withdraw",
      action: () => cancelMutation.mutate(request.id),
    });
  }

  function emptyCopy() {
    if (tab === "incoming") {
      return {
        title: "Nothing needs an answer",
        copy: "Invitations and join requests land here. When someone makes a move, the bell will tell you.",
        action: <Button to="/teammates" variant="primary">Meet builders</Button>,
      };
    }
    if (tab === "outgoing") {
      return {
        title: "Nothing out in the world",
        copy: "Ask to join a crew or invite someone to yours. Both will sit here until they answer.",
        action: <Button to="/teams" variant="primary">Find a crew</Button>,
      };
    }
    return {
      title: "No history yet",
      copy: "Accepted, declined and expired requests settle here. The record starts with one brave ask.",
      action: <Button to="/teammates" variant="ghost">Meet builders</Button>,
    };
  }

  if (requestsQuery.isLoading) return <PageLoading label="Opening the wire" rows={3} />;

  if (requestsQuery.isError) {
    return (
      <div className="alert alert--danger" role="alert">
        <Inbox aria-hidden="true" />
        <div className="alert__body">
          <strong>The wire is not reachable.</strong>
          <p>{errorMessage(requestsQuery.error)}</p>
          <Button size="sm" variant="ghost" onClick={() => requestsQuery.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const empty = emptyCopy();

  return (
    <div>
      <header className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">The wire · Inbox</span>
          <h1 className="page-head__title">Every good crew begins with a brave ask.</h1>
          <p className="page-head__deck">
            Invitations, join requests and the record of every answer. Accept what fits, close
            what does not, keep the seats moving.
          </p>
        </div>
        <div className="page-head__actions">
          <Button to="/teammates" variant="primary" icon={<UserPlus />}>
            Find a builder
          </Button>
        </div>
      </header>

      <div className="requests-page__summary" aria-label="Request summary">
        <span className="chip chip--signal">
          {counts.pendingIncoming} waiting on you
        </span>
        <span className="chip chip--moss">{counts.pendingOutgoing} out in the world</span>
        <span className="chip">{counts.history} resolved</span>
        {counts.invites > 0 && (
          <span className="chip">
            <Mail size={11} aria-hidden="true" /> {counts.invites}{" "}
            {pluralize(counts.invites, "invitation", "invitations")}
          </span>
        )}
      </div>

      <div className="tabs" role="tablist" aria-label="Request views">
        {TABS.map((entry) => (
          <button
            type="button"
            role="tab"
            key={entry.value}
            className="tab"
            aria-selected={tab === entry.value}
            onClick={() => setTab(entry.value)}
          >
            {entry.label}
            <span className="tab__count">
              {entry.value === "history" ? counts.history : counts[entry.value]}
            </span>
          </button>
        ))}
      </div>

      <div className="team-hub__toolbar" style={{ marginTop: 18 }}>
        <div className="segmented" role="group" aria-label="Filter by request type">
          {TYPE_FILTERS.map((entry) => (
            <button
              type="button"
              key={entry.value}
              className="segmented__item"
              aria-pressed={type === entry.value}
              onClick={() => setType(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        {tab === "history" ? (
          <select
            className="select"
            value={historyStatus}
            onChange={(event) => setHistoryStatus(event.target.value)}
            aria-label="Filter history by outcome"
            style={{ width: "auto", minWidth: 170 }}
          >
            {HISTORY_STATUSES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="finder-toolbar__count">
            {visibleRequests.length}{" "}
            {pluralize(visibleRequests.length, "request", "requests")} · newest first
          </span>
        )}
      </div>

      {visibleRequests.length === 0 ? (
        <EmptyState
          icon={tab === "incoming" ? <Inbox /> : tab === "outgoing" ? <UsersRound /> : <Sparkles />}
          title={empty.title}
          copy={empty.copy}
          actions={empty.action}
        />
      ) : (
        <div className="request-list mount-stagger">
          {visibleRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              currentUserId={meId}
              ledTeamIds={ledTeamIds}
              busy={respondMutation.isPending || cancelMutation.isPending}
              onAccept={(entry) =>
                respondMutation.mutate({ requestId: entry.id, action: "accept" })
              }
              onDecline={askDecline}
              onCancel={askCancel}
            />
          ))}
        </div>
      )}

      {tab === "history" && visibleRequests.length > 0 && (
        <p className="finder-toolbar__count" style={{ marginTop: 16, textAlign: "center" }}>
          The record goes back seven days for pending rows. Resolved rows stay as long as the
          team does.
        </p>
      )}

      <section className="dash-quote requests-page__quote">
        <div>
          <p>“Say what you want to build. The right person is looking for a sentence to join.”</p>
          <span>Field note · 04</span>
        </div>
        <Button to="/teams" variant="ghost" iconRight={<ArrowUpRight />}>
          Browse teams
        </Button>
      </section>

      <div className="cluster" style={{ marginTop: 18, justifyContent: "center" }}>
        <Link to="/faq" className="eyebrow eyebrow--plain">
          How requests and invitations work
        </Link>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        loading={respondMutation.isPending || cancelMutation.isPending}
        onConfirm={() => {
          confirmState?.action?.();
          setConfirmState(null);
          if (tab !== "history") {
            queryClient.invalidateQueries({ queryKey: ["team-requests", "mine"] });
          }
        }}
      />
    </div>
  );
}
