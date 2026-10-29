import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  Check,
  Circle,
  Compass,
  Inbox,
  LayoutDashboard,
  Sparkles,
  Target,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import Badge, { Chip } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import MatchRing from "../../components/ui/MatchRing";
import EmptyState from "../../components/ui/EmptyState";
import PageLoading from "../../components/ui/PageLoading";
import { useAuth } from "../../context/auth-context";
import { useDocumentTitle } from "../../lib/hooks/useDocumentTitle";
import { getMyProfile } from "../../lib/api/users";
import { listMyTeams, listHackathons, discoverUsers } from "../../lib/api/teams";
import { listMyRequests } from "../../lib/api/requests";
import { listNotifications } from "../../lib/api/notifications";
import { getPlatformStats } from "../../lib/api/platform";
import { queryKeys } from "../../lib/queryClient";
import {
  daysUntil,
  firstName,
  formatDate,
  formatDay,
  formatDeadline,
  formatMonth,
  formatRelative,
  pluralize,
  seasonLabel,
} from "../../lib/format";
import { profileChecklist } from "../../lib/profile";
import { isPending, requestCounts, requestDirection } from "../../lib/requests";
import { errorMessage } from "../../lib/api/http";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function DashStat({ to, icon: Icon, label, value, note }) {
  const content = (
    <>
      <div className="dash-stat__body">
        <span className="dash-stat__label">{label}</span>
        <span className="dash-stat__value">{value}</span>
        <span className="dash-stat__note">{note}</span>
      </div>
      <span className="dash-stat__icon" aria-hidden="true">
        <Icon />
      </span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="dash-stat">
        {content}
      </Link>
    );
  }
  return <div className="dash-stat">{content}</div>;
}

export default function Dashboard() {
  useDocumentTitle("The desk");
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => getMyProfile(),
  });
  const profile = profileQuery.data;
  const meId = profile?.id || user?.id || "";

  const teamsQuery = useQuery({
    queryKey: queryKeys.myTeams,
    queryFn: ({ signal }) => listMyTeams({ signal }),
  });
  const requestsQuery = useQuery({
    queryKey: queryKeys.myRequests({ surface: "dashboard" }),
    queryFn: ({ signal }) => listMyRequests({ limit: 50 }, { signal }),
  });
  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ signal }) => listNotifications({ limit: 6 }, { signal }),
  });
  const hackathonsQuery = useQuery({
    queryKey: queryKeys.hackathons({ surface: "dashboard" }),
    queryFn: ({ signal }) => listHackathons({ limit: 50 }, { signal }),
  });
  const statsQuery = useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => getPlatformStats({ signal }),
  });

  const teams = useMemo(() => teamsQuery.data || [], [teamsQuery.data]);
  const requests = useMemo(() => requestsQuery.data?.items || [], [requestsQuery.data]);
  const notifications = useMemo(
    () => notificationsQuery.data?.items || [],
    [notificationsQuery.data]
  );
  const hackathons = useMemo(
    () => hackathonsQuery.data?.items || [],
    [hackathonsQuery.data]
  );
  const stats = statsQuery.data || {};
  const ledTeamIds = useMemo(
    () => teams.filter((team) => team.leader === meId).map((team) => team.id),
    [teams, meId]
  );
  const counts = useMemo(
    () => requestCounts(requests, meId, ledTeamIds),
    [requests, meId, ledTeamIds]
  );

  const pendingIncoming = useMemo(
    () =>
      requests.filter(
        (request) =>
          isPending(request) &&
          requestDirection(request, meId, ledTeamIds) === "incoming"
      ),
    [requests, meId, ledTeamIds]
  );
  const checklist = useMemo(() => profileChecklist(profile), [profile]);
  const openSeats = teams.reduce((total, team) => total + (team.openSlots || 0), 0);

  const deadlines = useMemo(() => {
    return hackathons
      .filter((hackathon) => hackathon.registrationDeadline)
      .map((hackathon) => ({
        ...hackathon,
        days: daysUntil(hackathon.registrationDeadline),
      }))
      .filter((hackathon) => hackathon.days !== null && hackathon.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 4);
  }, [hackathons]);

  const nextDeadline = deadlines.find((entry) => entry.days >= 0);
  const skillPrefill = (profile?.skills || []).slice(0, 3);
  const suggestionsQuery = useQuery({
    queryKey: queryKeys.teammates({
      surface: "dashboard",
      skills: skillPrefill,
      limit: 6,
    }),
    queryFn: ({ signal }) =>
      discoverUsers({ skills: skillPrefill, limit: 6 }, { signal }),
    enabled: Boolean(profile),
    staleTime: 2 * 60_000,
  });
  const suggestions = (suggestionsQuery.data?.items || [])
    .filter((person) => person.id !== meId)
    .slice(0, 4);

  const recentActivity = notifications.slice(0, 4);

  if (profileQuery.isLoading) {
    return <PageLoading label="Opening your desk" rows={2} />;
  }

  if (profileQuery.isError) {
    return (
      <div className="alert alert--danger" role="alert">
        <Inbox aria-hidden="true" />
        <div className="alert__body">
          <strong>We could not open your desk.</strong>
          <p>{errorMessage(profileQuery.error, "Try refreshing the page.")}</p>
          <Button size="sm" variant="ghost" onClick={() => profileQuery.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const deck = pendingIncoming.length
    ? `${pendingIncoming.length} ${pluralize(pendingIncoming.length, "person is", "people are")} waiting on the wire. A quick reply keeps the whole room moving.`
    : !profile?.discoverable
      ? "Your builder card is private. Turn on discovery when you want the right people to find you, or invite someone directly."
      : teams.length === 0
        ? "The field guide is open. Start a crew for the next hackathon, or walk the finder and meet someone who builds like you."
        : "The desk is clear. Use the quiet to sharpen your card, meet someone new, or put your next build on the record.";

  return (
    <div className="dashboard">
      <section className="dash-hero" aria-labelledby="dash-title">
        <span className="dash-hero__grid" aria-hidden="true" />
        <div className="dash-hero__copy">
          <div className="cluster">
            <Badge variant="outline" dot pulse>
              Live desk
            </Badge>
            <span className="eyebrow eyebrow--plain">{seasonLabel()}</span>
          </div>
          <h1 className="dash-hero__title" id="dash-title">
            {greeting()}, <em>{firstName(profile?.name)}.</em>
          </h1>
          <p className="dash-hero__deck">{deck}</p>
          <div className="dash-hero__actions">
            <Button to="/teammates" variant="primary" icon={<Users />}>
              Find teammates
            </Button>
            <Button
              to={pendingIncoming.length ? "/requests" : "/teams"}
              variant="secondary"
              iconRight={<ArrowRight />}
            >
              {pendingIncoming.length ? "Open the wire" : "Visit the team hub"}
            </Button>
          </div>
        </div>

        <div className="dash-hero__aside">
          <div className="dash-signal">
            <div className="dash-signal__label">
              <Sparkles aria-hidden="true" /> Builder card
            </div>
            <div className="dash-signal__value">{checklist.percent}% complete</div>
            <p className="dash-signal__copy">
              {checklist.done} of {checklist.total} marks made.{" "}
              {checklist.percent === 100 ? "The card is doing its job." : "Finish the rest in an easy sitting."}
            </p>
            <div className="dash-signal__meter" aria-hidden="true">
              <span style={{ width: `${checklist.percent}%` }} />
            </div>
          </div>

          <div className="dash-signal dash-signal--ink">
            <div className="dash-signal__label">
              <CalendarClock aria-hidden="true" /> Next deadline
            </div>
            <div className="dash-signal__value">
              {nextDeadline
                ? nextDeadline.days === 0
                  ? "Today"
                  : `${nextDeadline.days} ${pluralize(nextDeadline.days, "day", "days")}`
                : "Clear"}
            </div>
            <p className="dash-signal__copy">
              {nextDeadline
                ? `${nextDeadline.title} · closes ${formatDate(nextDeadline.registrationDeadline)}`
                : "No registration deadline on the board. A rare and beautiful thing."}
            </p>
          </div>
        </div>
      </section>

      <section className="dash-stat-grid" aria-label="Your snapshot">
        <DashStat
          to="/teams"
          icon={UsersRound}
          label="Your crews"
          value={teams.length}
          note={
            teams.length
              ? `${openSeats} open ${pluralize(openSeats, "seat", "seats")} across them`
              : "No crew yet — start the first"
          }
        />
        <DashStat
          to="/requests"
          icon={Inbox}
          label="The wire"
          value={counts.pendingIncoming}
          note={
            counts.pendingIncoming
              ? "waiting on your reply"
              : "nothing needs an answer"
          }
        />
        <DashStat
          to="/requests"
          icon={BellRing}
          label="In motion"
          value={counts.pendingOutgoing}
          note="requests and invites out in the world"
        />
        <DashStat
          icon={Zap}
          label="The network"
          value={stats.builders || "—"}
          note={`${stats.openTeams || 0} open teams · ${stats.matches || 0} matches made`}
        />
      </section>

      <div className="dash-columns">
        <div className="dash-column">
          <section className="dash-panel" aria-labelledby="crews-title">
            <div className="dash-panel__head">
              <h2 className="dash-panel__title" id="crews-title">
                Your crews <span>{String(teams.length).padStart(2, "0")}</span>
              </h2>
              <Link to="/teams" className="eyebrow eyebrow--plain">
                All teams <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>

            {teamsQuery.isLoading ? (
              <div className="loading-block">
                <span className="spinner" aria-hidden="true" /> Reading the crew board…
              </div>
            ) : teams.length ? (
              <div className="dash-crew">
                {teams.slice(0, 4).map((team) => (
                  <div className="dash-crew__row" key={team.id}>
                    <Avatar name={team.name} size="md" />
                    <div className="dash-crew__body">
                      <Link className="dash-crew__name" to={`/teams/${team.id}`}>
                        {team.name}
                      </Link>
                      <span className="dash-crew__meta">
                        {team.hackathonTitle || "Hackathon team"} ·{" "}
                        {team.leader === meId ? "You lead" : "Member"}
                      </span>
                    </div>
                    <div className="dash-crew__side">
                      <Badge variant={team.openSlots > 0 ? "moss" : "outline"}>
                        {team.openSlots > 0 ? `${team.openSlots} open` : "Full"}
                      </Badge>
                      <Link
                        to={`/teams/${team.id}`}
                        className="icon-btn"
                        aria-label={`Open ${team.name}`}
                      >
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<UsersRound />}
                title="You have not started a crew yet"
                copy="A crew can be two people and a stubborn idea. The team hub helps you shape it."
                actions={
                  <Button to="/teams?create=1" variant="primary" size="sm">
                    Start a crew
                  </Button>
                }
              />
            )}
          </section>

          <section className="dash-panel" aria-labelledby="suggestions-title">
            <div className="dash-panel__head">
              <h2 className="dash-panel__title" id="suggestions-title">
                People you should meet <span>Match</span>
              </h2>
              <Link to="/teammates" className="eyebrow eyebrow--plain">
                Find more <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>

            {suggestionsQuery.isLoading ? (
              <div className="loading-block">
                <span className="spinner" aria-hidden="true" /> Checking the room…
              </div>
            ) : suggestions.length ? (
              <div className="dash-suggestions">
                {suggestions.map((person) => (
                  <Link className="dash-suggestion" to={`/u/${person.id}`} key={person.id}>
                    <Avatar name={person.name} src={person.avatarUrl} size="sm" />
                    <span className="dash-suggestion__body">
                      <strong>{person.name}</strong>
                      <span>{person.headline || person.college || "Builder"}</span>
                    </span>
                    {person.matchScore > 0 && <MatchRing value={person.matchScore} size="sm" />}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="alert alert--info">
                <Compass aria-hidden="true" />
                <div className="alert__body">
                  <strong>The finder is quiet.</strong>
                  <p>
                    Add a few skills to your card so we can score the room, or open the finder
                    and browse everyone who opted in.
                  </p>
                  <Link to="/teammates" className="btn btn--ghost btn--sm" style={{ width: "fit-content" }}>
                    Browse builders
                  </Link>
                </div>
              </div>
            )}
          </section>

          {pendingIncoming.length > 0 && (
            <section className="dash-panel" aria-labelledby="waiting-title">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title" id="waiting-title">
                  Waiting on you
                </h2>
                <Chip variant="signal">{pendingIncoming.length}</Chip>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {pendingIncoming.slice(0, 2).map((request) => (
                  <div className="cluster" key={request.id}>
                    <Avatar name={request.user?.name || request.team?.name} size="sm" />
                    <div className="dash-crew__body">
                      <strong style={{ fontSize: "0.78rem" }}>
                        {request.type === "invite"
                          ? request.team?.name
                          : request.user?.name || "A builder"}
                      </strong>
                      <span className="dash-crew__meta">
                        {request.type === "invite" ? "Invited you" : "Asked to join"} ·{" "}
                        {request.role || "member"}
                      </span>
                    </div>
                    <Button to="/requests" size="sm" variant="ghost" iconRight={<Target />}>
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <aside className="dash-quote">
            <p>“The best crews are built before anyone feels ready.”</p>
            <span>Field note · 01</span>
          </aside>
        </div>

        <div className="dash-column dash-column--side">
          <section className="dash-panel" aria-labelledby="horizon-title">
            <div className="dash-panel__head">
              <h2 className="dash-panel__title" id="horizon-title">
                On the horizon
              </h2>
              <CalendarClock size={16} aria-hidden="true" style={{ color: "var(--faint)" }} />
            </div>
            {deadlines.length ? (
              <div className="dash-deadlines">
                {deadlines.map((hackathon) => (
                  <div className="dash-deadline" key={hackathon.id}>
                    <div className="dash-deadline__date" aria-hidden="true">
                      <span className="dash-deadline__day">
                        {formatDay(hackathon.registrationDeadline)}
                      </span>
                      <span className="dash-deadline__month">
                        {formatMonth(hackathon.registrationDeadline)}
                      </span>
                    </div>
                    <div className="dash-deadline__body">
                      <span className="dash-deadline__title">{hackathon.title}</span>
                      <span className="dash-deadline__meta">
                        {formatDeadline(hackathon.registrationDeadline)} ·{" "}
                        {hackathon.days < 0 ? "closed" : `${hackathon.days} days`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                No dates on the board yet. The next season is still being written.
              </p>
            )}
          </section>

          <section className="dash-panel" aria-labelledby="checklist-title">
            <div className="dash-panel__head">
              <h2 className="dash-panel__title" id="checklist-title">
                Finish the card
              </h2>
              <Link to="/profile" className="eyebrow eyebrow--plain">
                Edit <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>
            <div className="dash-checklist">
              {checklist.items.map((item) => (
                <Link
                  className={`dash-checklist__item ${item.done ? "is-done" : ""}`}
                  to={item.to}
                  key={item.key}
                >
                  <span className="dash-checklist__tick" aria-hidden="true">
                    {item.done ? <Check /> : <Circle />}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="dash-panel" aria-labelledby="activity-title">
            <div className="dash-panel__head">
              <h2 className="dash-panel__title" id="activity-title">
                At the desk
              </h2>
              <Link to="/requests" className="eyebrow eyebrow--plain">
                The wire <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>
            {recentActivity.length ? (
              <div className="dash-activity">
                {recentActivity.map((item) => (
                  <div className="dash-activity__item" key={item.id || item._id}>
                    <span className="dash-activity__dot" aria-hidden="true" />
                    <div className="dash-activity__body">
                      <strong>{item.title || item.message || "A notification"}</strong>
                      <span>{formatRelative(item.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                All quiet. A good time to send the first message.
              </p>
            )}
          </section>

          <div className="cluster" style={{ justifyContent: "space-between" }}>
            <Link to="/teams?create=1" className="eyebrow eyebrow--plain">
              <LayoutDashboard size={12} aria-hidden="true" /> Start a crew
            </Link>
            <span className="team-card__size">
              <Target size={12} aria-hidden="true" /> Built for the ones who start
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
