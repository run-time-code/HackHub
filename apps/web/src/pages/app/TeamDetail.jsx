import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronRight,
  Crown,
  DoorOpen,
  Inbox,
  LogOut,
  Mail,
  Send,
  Settings2,
  ShieldAlert,
  Sparkles,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import Badge, { Chip } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Dialog from "../../components/ui/Dialog";
import EmptyState from "../../components/ui/EmptyState";
import { Field, Input, Textarea } from "../../components/ui/Field";
import PageLoading from "../../components/ui/PageLoading";
import InviteDialog from "../../components/teams/InviteDialog";
import TeamDialog from "../../components/teams/TeamDialog";
import {
  disbandTeam,
  getHackathon,
  getTeam,
  listHackathons,
  listTeamInvitations,
  listTeamRequests,
  removeTeamMember,
  requestToJoin,
  transferLeadership,
} from "../../lib/api/teams";
import { listMyRequests, respondToRequest, cancelRequest } from "../../lib/api/requests";
import { getMyProfile } from "../../lib/api/users";
import { queryKeys } from "../../lib/queryClient";
import { errorMessage } from "../../lib/api/http";
import { useAuth } from "../../context/auth-context";
import { useDocumentTitle } from "../../lib/hooks/useDocumentTitle";
import { useUserProfiles } from "../../lib/hooks/useUserProfiles";
import { useToast } from "../../providers/ToastProvider";
import { celebrate } from "../../lib/celebrate";
import {
  daysUntil,
  formatDeadline,
  pluralize,
  titleCase,
} from "../../lib/format";
import { availabilityLabel } from "../../lib/format";
import { track } from "../../lib/analytics";

function invalidateTeam(queryClient, teamId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.team(teamId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.myTeams });
  queryClient.invalidateQueries({ queryKey: ["teams"] });
  queryClient.invalidateQueries({ queryKey: ["team-requests", "mine"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.teamRequests(teamId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.teamInvitations(teamId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
}

function MemberRow({
  user,
  role,
  isLeader,
  canManage,
  onMakeLeader,
  onRemove,
}) {
  return (
    <div className="member-row">
      <Avatar name={user?.name || "Builder"} src={user?.avatarUrl} size="md" />
      <div className="member-row__identity">
        <span className="member-row__name">
          {user?.name || "A builder"}
          {isLeader && <Crown aria-label="Team leader" />}
        </span>
        <span className="member-row__meta">
          {isLeader ? "Leader" : titleCase(role || "member")}
          {user?.availability ? ` · ${availabilityLabel(user.availability)}` : ""}
        </span>
      </div>
      <div className="member-row__skills">
        {(user?.skills || []).slice(0, 3).map((skill) => (
          <Chip key={skill}>{skill}</Chip>
        ))}
      </div>
      <div className="member-row__actions">
        {!isLeader && user?.id && (
          <Link to={`/u/${user.id}`} className="icon-btn" aria-label={`Open ${user.name}'s card`}>
            <ArrowUpRight />
          </Link>
        )}
        {canManage && !isLeader && (
          <>
            <button
              type="button"
              className="icon-btn"
              onClick={onMakeLeader}
              aria-label={`Make ${user?.name || "this member"} leader`}
              title="Make leader"
            >
              <Crown />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onRemove}
              aria-label={`Remove ${user?.name || "this member"}`}
              title="Remove member"
            >
              <UserMinus />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeamDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteTeammate, setInviteTeammate] = useState(
    () => location.state?.inviteTeammate || null
  );
  const [confirmState, setConfirmState] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [joinRole, setJoinRole] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinError, setJoinError] = useState("");

  const teamQuery = useQuery({
    queryKey: queryKeys.team(id),
    queryFn: ({ signal }) => getTeam(id, { signal }),
    enabled: Boolean(id),
  });
  const team = teamQuery.data;
  useDocumentTitle(team?.name || "Team");

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => getMyProfile(),
  });
  const profile = profileQuery.data;
  const meId = profile?.id || user?.id || user?._id || "";

  const myRequestsQuery = useQuery({
    queryKey: queryKeys.myRequests({ surface: "team-detail" }),
    queryFn: ({ signal }) => listMyRequests({ limit: 50 }, { signal }),
  });

  const isLeader = Boolean(team && team.leader === meId);
  const isMember = Boolean(
    team && (team.leader === meId || team.members?.some((member) => member.user === meId))
  );

  const leaderRequestsQuery = useQuery({
    queryKey: queryKeys.teamRequests(id),
    queryFn: ({ signal }) => listTeamRequests(id, "request", { signal }),
    enabled: Boolean(id) && isLeader,
  });
  const invitationsQuery = useQuery({
    queryKey: queryKeys.teamInvitations(id),
    queryFn: () => listTeamInvitations(id),
    enabled: Boolean(id) && isLeader,
  });
  const pendingRequests = leaderRequestsQuery.data || [];
  const sentInvitations = invitationsQuery.data || [];

  const hackathonQuery = useQuery({
    queryKey: queryKeys.hackathons({ id: team?.hackathon, surface: "team-detail" }),
    queryFn: ({ signal }) => getHackathon(team.hackathon, { signal }),
    enabled: Boolean(team?.hackathon),
  });
  const hackathonsQuery = useQuery({
    queryKey: queryKeys.hackathons({ surface: "team-edit" }),
    queryFn: ({ signal }) => listHackathons({ limit: 50 }, { signal }),
    enabled: editOpen,
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (!location.state?.inviteTeammate) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  function openJoin() {
    setJoinRole(team?.rolesNeeded?.[0] || "");
    setJoinError("");
    setJoinOpen(true);
  }

  const crewIds = useMemo(
    () => [team?.leader, ...(team?.members || []).map((member) => member.user)].filter(Boolean),
    [team]
  );
  const { profiles: memberProfiles } = useUserProfiles(crewIds);
  const leaderProfile = team ? memberProfiles[team.leader] : null;
  const leaderName = leaderProfile?.name || (team?.leader === meId ? profile?.name : "") || "the leader";

  const myPending = useMemo(() => {
    const all = myRequestsQuery.data?.items || [];
    return all.find(
      (request) =>
        request.team?.id === id &&
        request.status === "pending" &&
        ((request.type === "invite" && request.user?.id === meId) ||
          (request.type === "request" && request.initiatedBy === meId))
    );
  }, [myRequestsQuery.data, id, meId]);

  const deadlineDays = daysUntil(hackathonQuery.data?.registrationDeadline);
  const deadlineLabel = hackathonQuery.data?.registrationDeadline
    ? formatDeadline(hackathonQuery.data.registrationDeadline)
    : "";

  const respondMutation = useMutation({
    mutationFn: ({ requestId, action }) => respondToRequest(requestId, action),
    onSuccess: (request, variables) => {
      invalidateTeam(queryClient, id);
      if (variables.action === "accept") {
        celebrate();
        toast.success("You are in", "The crew just grew by one. Say hello in the wire.");
        track("team_request_accepted", { teamId: id, requestId: variables.requestId });
      } else {
        toast.success("Request declined", "The other builder has been told.");
      }
    },
    onError: (error) => {
      toast.error("That request could not be answered", errorMessage(error));
      invalidateTeam(queryClient, id);
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (requestId) => cancelRequest(requestId),
    onSuccess: () => {
      invalidateTeam(queryClient, id);
      toast.success("Invitation withdrawn", "That seat is free again.");
    },
    onError: (error) => toast.error("Could not withdraw the invitation", errorMessage(error)),
  });

  const cancelOwnRequestMutation = useMutation({
    mutationFn: (requestId) => cancelRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-requests", "mine"] });
      toast.success("Request cancelled", "No hard feelings. The door stays open.");
    },
    onError: (error) => toast.error("Could not cancel the request", errorMessage(error)),
  });

  const joinMutation = useMutation({
    mutationFn: () =>
      requestToJoin(id, {
        role: (joinRole || team?.rolesNeeded?.[0] || "member").trim(),
        message: joinMessage.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-requests", "mine"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.team(id) });
      track("team_request_sent", { teamId: id, kind: "join" });
      toast.success("Request sent", "The leader will see it on their wire.");
      setJoinOpen(false);
      setJoinMessage("");
      setJoinError("");
    },
    onError: (error) => setJoinError(errorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => removeTeamMember(id, userId),
    onSuccess: (savedTeam) => {
      queryClient.setQueryData(queryKeys.team(id), savedTeam);
      invalidateTeam(queryClient, id);
      toast.success("Member removed", "The seat is open again.");
    },
    onError: (error) => toast.error("Could not remove that member", errorMessage(error)),
  });

  const leaveMutation = useMutation({
    mutationFn: () => removeTeamMember(id, meId),
    onSuccess: () => {
      invalidateTeam(queryClient, id);
      toast.success("You left the crew", "The door is still there if you change your mind.");
      navigate("/teams");
    },
    onError: (error) => toast.error("Could not leave the team", errorMessage(error)),
  });

  const transferMutation = useMutation({
    mutationFn: (userId) => transferLeadership(id, userId),
    onSuccess: () => {
      invalidateTeam(queryClient, id);
      setTransferOpen(false);
      setTransferTo("");
      toast.success("Leadership transferred", "You are still in the crew as a member.");
      track("team_leader_transferred", { teamId: id });
    },
    onError: (error) => toast.error("Could not transfer leadership", errorMessage(error)),
  });

  const disbandMutation = useMutation({
    mutationFn: () => disbandTeam(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.team(id) });
      invalidateTeam(queryClient, id);
      toast.success("Team disbanded", "Everyone waiting has been released.");
      navigate("/teams");
    },
    onError: (error) => toast.error("Could not disband the team", errorMessage(error)),
  });

  function askRemove(member) {
    setConfirmState({
      title: `Remove ${member.name}?`,
      description: "They will leave the crew immediately. A freed seat reopens the team.",
      confirmLabel: "Remove member",
      action: () => removeMutation.mutate(member.id),
    });
  }

  function askLeave() {
    setConfirmState({
      title: `Leave ${team.name}?`,
      description: "You can ask to join again later if a seat is still open.",
      confirmLabel: "Leave team",
      action: () => leaveMutation.mutate(),
    });
  }

  function askDecline(request) {
    setConfirmState({
      title: "Decline this request?",
      description: `${request.user?.name || "This builder"} will be told that the seat is not theirs this time.`,
      confirmLabel: "Decline request",
      action: () =>
        respondMutation.mutate({ requestId: request.id, action: "decline" }),
    });
  }

  function askCancelInvite(invitation) {
    setConfirmState({
      title: "Withdraw this invitation?",
      description: `${invitation.user?.name || "This builder"} will no longer be able to accept it.`,
      confirmLabel: "Withdraw invite",
      action: () => cancelInviteMutation.mutate(invitation.id),
    });
  }

  function askCancelOwnRequest() {
    setConfirmState({
      title: "Cancel your request?",
      description: "The leader will no longer see it on their wire. You can ask again later.",
      confirmLabel: "Cancel request",
      action: () => cancelOwnRequestMutation.mutate(myPending.id),
    });
  }

  function askDisband() {
    setConfirmState({
      title: `Disband ${team.name}?`,
      description:
        "Every seat closes and every pending request is withdrawn. This cannot be undone.",
      confirmLabel: "Disband team",
      confirmPhrase: team.name,
      action: () => disbandMutation.mutate(),
    });
  }

  function handleConfirm() {
    confirmState?.action?.();
    setConfirmState(null);
  }

  if (teamQuery.isLoading) return <PageLoading label="Opening the crew" rows={2} />;

  if (teamQuery.isError || !team) {
    return (
      <div className="content-body" style={{ paddingTop: 0 }}>
        <EmptyState
          icon={<UsersRound />}
          title="This crew is not on the board"
          copy={errorMessage(
            teamQuery.error,
            "The team may have disbanded, or the link may be old."
          )}
          actions={
            <>
              <Button to="/teams" variant="primary">
                Back to teams
              </Button>
              <Button to="/teammates" variant="ghost">
                Find teammates
              </Button>
            </>
          }
        />
      </div>
    );
  }

  const open = team.status === "open" && team.openSlots > 0;
  const canInvite = isLeader && open;
  const members = team.members || [];

  return (
    <div>
      <Link to="/teams" className="team-detail__back">
        <ArrowLeft aria-hidden="true" /> Back to teams
      </Link>

      <section className="team-hero">
        <span className="team-hero__grid" aria-hidden="true" />
        <div className="team-hero__content">
          <div className="team-hero__copy">
            <div className="team-hero__eyebrow">
              <Badge variant={open ? "moss" : "outline"} dot pulse={open}>
                {open ? "Open · recruiting" : "Closed"}
              </Badge>
              <span className="eyebrow eyebrow--plain">
                {team.hackathonTitle || hackathonQuery.data?.title || "Hackathon team"}
              </span>
              {isLeader && <Badge variant="signal">You lead</Badge>}
              {isMember && !isLeader && <Badge variant="outline">You&apos;re in</Badge>}
            </div>
            <h1 className="team-hero__title">{team.name}</h1>
            <p className="team-hero__mission">
              {team.description || "No brief written yet. The crew will fill it in together."}
            </p>
            <div className="team-hero__meta">
              <span>
                <Crown aria-hidden="true" /> Led by {leaderName}
              </span>
              <span>
                <UsersRound aria-hidden="true" /> {team.size}/{team.maxTeamSize} builders
              </span>
              {deadlineLabel && (
                <span>
                  <CalendarClock aria-hidden="true" /> Registration {deadlineLabel}
                  {deadlineDays !== null && deadlineDays >= 0
                    ? ` · ${deadlineDays} ${pluralize(deadlineDays, "day", "days")}`
                    : ""}
                </span>
              )}
            </div>
          </div>

          <div className="team-hero__side">
            <div className="team-hero__seats">
              <span className="team-hero__seats-value">{team.openSlots}</span>
              <span className="team-hero__seats-label">
                {open ? `seat${team.openSlots === 1 ? "" : "s"} open` : "crew closed"}
              </span>
            </div>
            <div className="team-hero__actions">
              {isLeader ? (
                <>
                  <Button
                    variant="primary"
                    icon={<UserPlus />}
                    onClick={() => navigate(`/teammates?team=${team.id}`)}
                    disabled={!canInvite}
                    title={!canInvite ? "Close a seat or reopen the team first" : undefined}
                  >
                    Invite member
                  </Button>
                  <Button variant="secondary" icon={<Settings2 />} onClick={() => setEditOpen(true)}>
                    Edit crew
                  </Button>
                </>
              ) : isMember ? (
                <Button variant="ghost" icon={<LogOut />} onClick={askLeave}>
                  Leave team
                </Button>
              ) : myPending?.type === "invite" ? (
                <Button to="/requests" variant="primary" icon={<Inbox />}>
                  Review invitation
                </Button>
              ) : myPending ? (
                <Button variant="secondary" icon={<X />} onClick={askCancelOwnRequest}>
                  Request pending
                </Button>
              ) : (
                <Button
                  variant="primary"
                  icon={<DoorOpen />}
                  disabled={!open}
                  onClick={openJoin}
                >
                  {open ? "Request to join" : "Crew is closed"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="team-detail__layout">
        <main className="team-detail__main">
          <section className="team-panel" aria-labelledby="crew-title">
            <div className="team-panel__head">
              <h2 className="team-panel__title" id="crew-title">
                The crew <span>{team.size} builders</span>
              </h2>
              <span className="team-panel__count">{team.size}</span>
            </div>

            <div className="member-list">
              <MemberRow
                user={{ ...leaderProfile, id: team.leader, name: leaderName }}
                role="leader"
                isLeader
                canManage={false}
              />
              {members.map((member) => {
                const memberProfile = memberProfiles[member.user] || {
                  id: member.user,
                  name: "A builder",
                };
                return (
                  <MemberRow
                    key={member.user}
                    user={memberProfile}
                    role={member.role}
                    isLeader={false}
                    canManage={isLeader}
                    onMakeLeader={() => {
                      setTransferTo(member.user);
                      setTransferOpen(true);
                    }}
                    onRemove={() => askRemove({ id: member.user, name: memberProfile.name })}
                  />
                );
              })}
            </div>

            {isLeader && (
              <div
                className="cluster"
                style={{ justifyContent: "space-between", marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)" }}
              >
                <span className="team-card__size">
                  Invite by profile or hand the crew to someone you trust.
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Send />}
                  onClick={() => navigate(`/teammates?team=${team.id}`)}
                  disabled={!canInvite}
                >
                  Invite a builder
                </Button>
              </div>
            )}
          </section>

          <section className="team-panel" aria-labelledby="brief-title">
            <div className="team-panel__head">
              <h2 className="team-panel__title" id="brief-title">
                The brief <span>02</span>
              </h2>
              {team.hackathonTitle && (
                <span className="eyebrow eyebrow--plain">{team.hackathonTitle}</span>
              )}
            </div>
            <p className="profile-bio">
              {team.description ||
                "This crew is still forming the sentence. Ask the leader what the build is, and help make it specific."}
            </p>

            <div className="team-metrics" style={{ marginTop: 20 }}>
              <div className="team-metric">
                <strong>{team.size}</strong>
                <span>builders in</span>
              </div>
              <div className="team-metric">
                <strong>{team.openSlots}</strong>
                <span>seats open</span>
              </div>
              <div className="team-metric">
                <strong>{deadlineDays !== null && deadlineDays >= 0 ? deadlineDays : "—"}</strong>
                <span>days to close</span>
              </div>
            </div>

            <h3 className="dash-stat__label" style={{ marginTop: 22, marginBottom: 8 }}>
              Roles needed
            </h3>
            {team.rolesNeeded.length ? (
              <div className="team-role-list">
                {team.rolesNeeded.map((role) => (
                  <Chip key={role}>{role}</Chip>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                No named roles. Whoever arrives can help decide the shape.
              </p>
            )}
          </section>

          <div className="dash-quote">
            <p>“Show up with a question, not a title. The crew figures out the rest.”</p>
            <span>Field note · 02</span>
          </div>
        </main>

        <aside className="team-detail__aside">
          {isLeader ? (
            <>
              <section className="team-panel" aria-labelledby="requests-title">
                <div className="team-panel__head">
                  <h2 className="team-panel__title" id="requests-title">
                    Waiting at the door <span>{pendingRequests.length}</span>
                  </h2>
                  <Inbox size={15} aria-hidden="true" style={{ color: "var(--faint)" }} />
                </div>

                {leaderRequestsQuery.isLoading ? (
                  <div className="loading-block">
                    <span className="spinner" aria-hidden="true" /> Reading the wire…
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="alert alert--info">
                    <Sparkles aria-hidden="true" />
                    <div className="alert__body">
                      <strong>No one waiting yet.</strong>
                      <p>Invite someone directly, or leave the seat open on the finder.</p>
                    </div>
                  </div>
                ) : (
                  <div className="member-list">
                    {pendingRequests.map((request) => (
                      <div className="member-row" key={request.id}>
                        <Avatar name={request.user?.name} size="md" />
                        <div className="member-row__identity">
                          <span className="member-row__name">
                            {request.user?.name || "A builder"}
                          </span>
                          <span className="member-row__meta">
                            Wants {request.role || "member"} ·{" "}
                            {request.user?.skills?.slice(0, 2).join(", ") || "no skills listed"}
                          </span>
                        </div>
                        <div className="member-row__actions">
                          <Button
                            size="sm"
                            variant="primary"
                            loading={respondMutation.isPending}
                            onClick={() =>
                              respondMutation.mutate({ requestId: request.id, action: "accept" })
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={respondMutation.isPending}
                            onClick={() => askDecline(request)}
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {sentInvitations.length > 0 && (
                <section className="team-panel" aria-labelledby="invites-title">
                  <div className="team-panel__head">
                    <h2 className="team-panel__title" id="invites-title">
                      Invitations out <span>{sentInvitations.length}</span>
                    </h2>
                    <Mail size={15} aria-hidden="true" style={{ color: "var(--faint)" }} />
                  </div>
                  <div className="member-list">
                    {sentInvitations.map((invitation) => (
                      <div className="member-row" key={invitation.id}>
                        <Avatar name={invitation.user?.name} size="md" />
                        <div className="member-row__identity">
                          <span className="member-row__name">
                            {invitation.user?.name || "A builder"}
                          </span>
                          <span className="member-row__meta">
                            Invited as {invitation.role || "member"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => askCancelInvite(invitation)}
                          aria-label={`Withdraw invitation to ${invitation.user?.name}`}
                          title="Withdraw invitation"
                        >
                          <X />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="team-panel" aria-labelledby="controls-title">
                <div className="team-panel__head">
                  <h2 className="team-panel__title" id="controls-title">
                    Leader controls
                  </h2>
                  <ShieldAlert size={15} aria-hidden="true" style={{ color: "var(--signal)" }} />
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  <Button variant="ghost" block icon={<Settings2 />} onClick={() => setEditOpen(true)}>
                    Edit name, brief and seats
                  </Button>
                  <Button
                    variant="ghost"
                    block
                    icon={<Crown />}
                    disabled={members.length === 0}
                    onClick={() => {
                      setTransferTo(members[0]?.user || "");
                      setTransferOpen(true);
                    }}
                  >
                    Transfer leadership
                  </Button>
                  <Button variant="danger" block icon={<UserMinus />} onClick={askDisband}>
                    Disband the crew
                  </Button>
                </div>
                <p className="field__hint" style={{ marginTop: 10 }}>
                  You must hand leadership to a member before you can leave.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="team-panel" aria-labelledby="move-title">
                <div className="team-panel__head">
                  <h2 className="team-panel__title" id="move-title">
                    Your move
                  </h2>
                  <ChevronRight size={15} aria-hidden="true" style={{ color: "var(--faint)" }} />
                </div>

                {isMember ? (
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="availability-card">
                      <span className="availability-card__icon" aria-hidden="true">
                        <Check />
                      </span>
                      <div>
                        <strong>You are in this crew.</strong>
                        <span>Open the group and make the first useful move.</span>
                      </div>
                    </div>
                    <Button variant="ghost" block icon={<LogOut />} onClick={askLeave}>
                      Leave team
                    </Button>
                  </div>
                ) : myPending?.type === "invite" ? (
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="alert alert--info">
                      <Mail aria-hidden="true" />
                      <div className="alert__body">
                        <strong>There is an invitation waiting.</strong>
                        <p>You can accept or decline it from the wire.</p>
                      </div>
                    </div>
                    <Button to="/requests" block variant="primary" icon={<Inbox />}>
                      Open the wire
                    </Button>
                  </div>
                ) : myPending ? (
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="alert alert--warning">
                      <CalendarClock aria-hidden="true" />
                      <div className="alert__body">
                        <strong>Your request is pending.</strong>
                        <p>
                          The leader has seen it. Requests expire after seven days — you can
                          withdraw sooner.
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" block icon={<X />} onClick={askCancelOwnRequest}>
                      Cancel request
                    </Button>
                  </div>
                ) : !open ? (
                  <div className="alert alert--warning">
                    <UsersRound aria-hidden="true" />
                    <div className="alert__body">
                      <strong>This crew is closed.</strong>
                      <p>
                        {team.openSlots === 0
                          ? "Every seat is full. A seat may reopen if someone leaves."
                          : "The leader is not taking new requests right now."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="availability-card">
                      <span className="availability-card__icon" aria-hidden="true">
                        <Sparkles />
                      </span>
                      <div>
                        <strong>
                          {team.openSlots} {team.openSlots === 1 ? "seat is" : "seats are"} open.
                        </strong>
                        <span>Read the brief, then ask for the role you want.</span>
                      </div>
                    </div>
                    <Button variant="primary" block icon={<UserPlus />} onClick={openJoin}>
                      Request to join
                    </Button>
                  </div>
                )}
              </section>

              <section className="team-panel" aria-labelledby="leader-title">
                <div className="team-panel__head">
                  <h2 className="team-panel__title" id="leader-title">
                    The leader
                  </h2>
                </div>
                <div className="member-row" style={{ borderBottom: 0, paddingBottom: 0 }}>
                  <Avatar name={leaderName} src={leaderProfile?.avatarUrl} size="lg" ring />
                  <div className="member-row__identity">
                    <span className="member-row__name">
                      {leaderName} <Crown aria-hidden="true" />
                    </span>
                    <span className="member-row__meta">
                      {leaderProfile?.headline || "Leading this crew"}
                    </span>
                  </div>
                  {team.leader !== meId && (
                    <Link to={`/u/${team.leader}`} className="icon-btn" aria-label="Open leader profile">
                      <ArrowUpRight />
                    </Link>
                  )}
                </div>
                <Button to="/teammates" block variant="ghost" iconRight={<ArrowUpRight />} style={{ marginTop: 14 }}>
                  Meet more builders
                </Button>
              </section>
            </>
          )}
        </aside>
      </div>

      <TeamDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        team={team}
        hackathons={hackathonsQuery.data?.items || (hackathonQuery.data ? [hackathonQuery.data] : [])}
        onCreated={(savedTeam) => {
          queryClient.setQueryData(queryKeys.team(id), savedTeam);
          invalidateTeam(queryClient, id);
        }}
      />

      <Dialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        title={`Ask to join ${team.name}`}
        description="The leader sees your role and note on their wire. Requests expire in seven days."
        size="md"
      >
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            setJoinError("");
            joinMutation.mutate();
          }}
          style={{ gap: 20 }}
        >
          <div className="cluster">
            <Avatar name={profile?.name || user?.name} src={profile?.avatarUrl} size="md" />
            <div>
              <strong style={{ fontSize: "0.85rem" }}>{profile?.name || user?.name || "You"}</strong>
              <div className="team-card__size">
                {(profile?.skills || []).slice(0, 4).join(" · ") || "Your card is still growing"}
              </div>
            </div>
          </div>

          <Field label="Role you want" htmlFor="join-role" hint="Name the thing you want to own.">
            <Input
              id="join-role"
              value={joinRole}
              onChange={(event) => setJoinRole(event.target.value)}
              placeholder="Frontend engineer"
              maxLength={60}
            />
          </Field>

          <Field
            label="Note to the leader"
            htmlFor="join-message"
            optional
            hint={`${joinMessage.length}/500 characters`}
          >
            <Textarea
              id="join-message"
              value={joinMessage}
              onChange={(event) => setJoinMessage(event.target.value.slice(0, 500))}
              placeholder="I have been building map interfaces for two years. Happy to show the last one."
              maxLength={500}
            />
          </Field>

          {joinError && (
            <div className="alert alert--danger" role="alert">
              <span className="alert__body">
                <strong>Request did not send.</strong>
                <p>{joinError}</p>
              </span>
            </div>
          )}

          <div className="dialog__footer" style={{ marginTop: 0 }}>
            <Button variant="ghost" onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" icon={<Send />} loading={joinMutation.isPending}>
              Send request
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title="Hand over leadership"
        description="The new leader takes control of the brief. You stay in the crew as a member."
        size="sm"
      >
        <div className="stack" style={{ gap: 18 }}>
          <Field label="New leader" htmlFor="transfer-to">
            <select
              id="transfer-to"
              className="select"
              value={transferTo}
              onChange={(event) => setTransferTo(event.target.value)}
            >
              <option value="">Choose a member</option>
              {members.map((member) => (
                <option key={member.user} value={member.user}>
                  {memberProfiles[member.user]?.name || "A builder"} · {member.role}
                </option>
              ))}
            </select>
          </Field>
          <div className="dialog__footer" style={{ marginTop: 0 }}>
            <Button variant="ghost" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!transferTo}
              loading={transferMutation.isPending}
              onClick={() => transferMutation.mutate(transferTo)}
            >
              Transfer
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        confirmPhrase={confirmState?.confirmPhrase}
        loading={
          leaveMutation.isPending ||
          removeMutation.isPending ||
          disbandMutation.isPending ||
          respondMutation.isPending ||
          cancelInviteMutation.isPending ||
          cancelOwnRequestMutation.isPending
        }
        onConfirm={handleConfirm}
      />

      <InviteDialog
        open={Boolean(inviteTeammate)}
        onOpenChange={(open) => {
          if (!open) setInviteTeammate(null);
        }}
        teammate={inviteTeammate}
        teamId={team.id}
      />
    </div>
  );
}
