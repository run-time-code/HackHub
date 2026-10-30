import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  Compass,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import EmptyState from "../../components/ui/EmptyState";
import TeamCard, { TeamCardSkeleton } from "../../components/teams/TeamCard";
import TeamDialog from "../../components/teams/TeamDialog";
import { listHackathons, listMyTeams, listTeams } from "../../lib/api/teams";
import { queryKeys } from "../../lib/queryClient";
import { errorMessage } from "../../lib/api/http";
import { useAuth } from "../../context/auth-context";
import { useDocumentTitle } from "../../lib/hooks/useDocumentTitle";
import { useUserProfiles } from "../../lib/hooks/useUserProfiles";
import { formatDeadline, pluralize } from "../../lib/format";

const TAB_COPY = {
  mine: {
    title: "Your crews",
    deck: "The teams you lead and the ones that already count you in.",
  },
  discover: {
    title: "Open seats",
    deck: "Pick a hackathon, read the brief and ask for the role you want.",
  },
};

export default function Teams() {
  useDocumentTitle("Team hub");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "discover" ? "discover" : "mine";
  const createRequested = searchParams.get("create") === "1";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [hackathonId, setHackathonId] = useState("");
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");

  const hackathonsQuery = useQuery({
    queryKey: queryKeys.hackathons({ surface: "teams" }),
    queryFn: ({ signal }) => listHackathons({ limit: 50 }, { signal }),
    staleTime: 10 * 60_000,
  });
  const hackathons = useMemo(
    () => hackathonsQuery.data?.items || [],
    [hackathonsQuery.data]
  );
  const preferredHackathonId = useMemo(
    () => hackathons.find((hackathon) => hackathon.isActive)?.id || hackathons[0]?.id || "",
    [hackathons]
  );
  const activeHackathonId = hackathonId || preferredHackathonId;
  const dialogVisible = dialogOpen || createRequested;

  const myTeamsQuery = useQuery({
    queryKey: queryKeys.myTeams,
    queryFn: ({ signal }) => listMyTeams({ signal }),
  });
  const discoverQuery = useQuery({
    queryKey: queryKeys.teams({ hackathonId: activeHackathonId, status, surface: "discover" }),
    queryFn: ({ signal }) =>
      listTeams({ hackathonId: activeHackathonId, status, limit: 50 }, { signal }),
    enabled: tab === "discover" && Boolean(activeHackathonId),
  });

  const myTeams = useMemo(() => myTeamsQuery.data || [], [myTeamsQuery.data]);
  const discoverTeams = useMemo(() => discoverQuery.data?.items || [], [discoverQuery.data]);
  const visibleDiscoverTeams = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return discoverTeams;
    return discoverTeams.filter((team) =>
      `${team.name} ${team.description} ${team.rolesNeeded.join(" ")}`
        .toLowerCase()
        .includes(term)
    );
  }, [discoverTeams, search]);

  const profileIds = useMemo(() => {
    const teams = tab === "mine" ? myTeams : discoverTeams;
    return teams.flatMap((team) => [
      team.leader,
      ...(team.members || []).map((member) => member.user),
    ]);
  }, [tab, myTeams, discoverTeams]);
  const { profiles } = useUserProfiles(profileIds);
  const meId = user?.id || "";

  function setTab(nextTab) {
    const next = new URLSearchParams(searchParams);
    if (nextTab === "mine") next.delete("tab");
    else next.set("tab", nextTab);
    setSearchParams(next, { replace: true });
  }

  function closeDialog(open) {
    setDialogOpen(open);
    if (!open && createRequested) {
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      next.delete("invite");
      setSearchParams(next, { replace: true });
    }
  }

  function handleCreated(team) {
    let pending = null;
    try {
      const raw = sessionStorage.getItem("hackhub:pendingInvite");
      if (raw) {
        pending = JSON.parse(raw);
        sessionStorage.removeItem("hackhub:pendingInvite");
      }
    } catch {
      pending = null;
    }
    navigate(`/teams/${team.id}`, {
      state: pending?.id ? { inviteTeammate: pending } : undefined,
    });
  }

  const activeHackathon = hackathons.find((hackathon) => hackathon.id === activeHackathonId);
  const copy = TAB_COPY[tab];

  return (
    <div>
      <header className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">The team hub · Season 01</span>
          <h1 className="page-head__title">A crew is a promise you make together.</h1>
          <p className="page-head__deck">
            Start a team, find the seats still open, or walk into a brief that already has
            momentum. Every crew names the hackathon it is building for.
          </p>
        </div>
        <div className="page-head__actions">
          <Button
            variant="primary"
            icon={<Plus />}
            onClick={() => setDialogOpen(true)}
            disabled={!hackathons.length}
          >
            Start a crew
          </Button>
        </div>
      </header>

      {hackathonsQuery.isError && (
        <div className="alert alert--warning" role="alert" style={{ marginBottom: 20 }}>
          <CalendarDays aria-hidden="true" />
          <div className="alert__body">
            <strong>The hackathon board did not load.</strong>
            <p>
              {errorMessage(
                hackathonsQuery.error,
                "You can still open your crews, but new teams need a hackathon."
              )}
            </p>
          </div>
        </div>
      )}

      {!hackathonsQuery.isLoading && hackathons.length === 0 && (
        <div className="alert alert--info" role="note" style={{ marginBottom: 20 }}>
          <Compass aria-hidden="true" />
          <div className="alert__body">
            <strong>No hackathons on the board yet.</strong>
            <p>
              Teams are attached to a hackathon. Once one is published, the crew builder will
              open here.
            </p>
            <Button to="/calendar" variant="ghost" size="sm">
              Open the calendar
            </Button>
          </div>
        </div>
      )}

      <div className="tabs team-hub__tabs" role="tablist" aria-label="Team hub views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mine"}
          className="tab"
          onClick={() => setTab("mine")}
        >
          My teams <span className="tab__count">{myTeams.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "discover"}
          className="tab"
          onClick={() => setTab("discover")}
        >
          Discover teams{" "}
          <span className="tab__count">
            {discoverQuery.data?.total ?? (tab === "discover" ? "—" : "")}
          </span>
        </button>
      </div>

      {tab === "mine" ? (
        <>
          <div className="team-hub__toolbar">
            <div>
              <h2 className="section-head__title" style={{ fontSize: "1.8rem" }}>
                {copy.title}
              </h2>
              <p className="section-head__deck">{copy.deck}</p>
            </div>
            <Button to="/teammates" variant="ghost" iconRight={<ArrowUpRight />}>
              Find builders
            </Button>
          </div>

          {myTeamsQuery.isLoading ? (
            <div className="team-grid" aria-busy="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <TeamCardSkeleton key={index} />
              ))}
            </div>
          ) : myTeamsQuery.isError ? (
            <div className="alert alert--danger" role="alert">
              <UsersRound aria-hidden="true" />
              <div className="alert__body">
                <strong>Your crews did not load.</strong>
                <p>{errorMessage(myTeamsQuery.error)}</p>
                <Button size="sm" variant="ghost" onClick={() => myTeamsQuery.refetch()}>
                  Try again
                </Button>
              </div>
            </div>
          ) : myTeams.length === 0 ? (
            <EmptyState
              icon={<UsersRound />}
              title="You have not started a crew yet"
              copy="Pick a hackathon, name the idea and leave the door open for the first two people who get it."
              actions={
                <>
                  <Button
                    variant="primary"
                    icon={<Plus />}
                    onClick={() => setDialogOpen(true)}
                    disabled={!hackathons.length}
                  >
                    Start a crew
                  </Button>
                  <Button variant="ghost" onClick={() => setTab("discover")}>
                    Browse open seats
                  </Button>
                </>
              }
            />
          ) : (
            <div className="team-grid mount-stagger">
              {myTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  profiles={profiles}
                  currentUserId={meId}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="team-hub__toolbar">
            <div className="team-hub__filters">
              <select
                className="select"
                value={activeHackathonId}
                onChange={(event) => setHackathonId(event.target.value)}
                aria-label="Choose a hackathon"
              >
                {hackathons.map((hackathon) => (
                  <option key={hackathon.id} value={hackathon.id}>
                    {hackathon.title}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by team status"
                style={{ minWidth: 150 }}
              >
                <option value="open">Open seats</option>
                <option value="closed">Closed teams</option>
              </select>
              <div className="input-group" style={{ width: 240 }}>
                <Search aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or role"
                  aria-label="Search teams"
                />
              </div>
            </div>
            <span className="finder-toolbar__count">
              <strong>{discoverQuery.data?.total ?? 0}</strong>{" "}
              {pluralize(discoverQuery.data?.total ?? 0, "crew", "crews")}
              {activeHackathon?.registrationDeadline
                ? ` · closes ${formatDeadline(activeHackathon.registrationDeadline)}`
                : ""}
            </span>
          </div>

          {!activeHackathonId ? (
            <div className="loading-block">Choose a hackathon to see its teams.</div>
          ) : discoverQuery.isLoading ? (
            <div className="team-grid" aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <TeamCardSkeleton key={index} />
              ))}
            </div>
          ) : discoverQuery.isError ? (
            <div className="alert alert--danger" role="alert">
              <CalendarDays aria-hidden="true" />
              <div className="alert__body">
                <strong>The team board did not load.</strong>
                <p>{errorMessage(discoverQuery.error)}</p>
                <Button size="sm" variant="ghost" onClick={() => discoverQuery.refetch()}>
                  Try again
                </Button>
              </div>
            </div>
          ) : visibleDiscoverTeams.length === 0 ? (
            <EmptyState
              icon={<Compass />}
              title={search ? "No crew matches that search" : "No open crews in this hackathon"}
              copy={
                search
                  ? "Try a shorter phrase, or clear the search to see every team on the board."
                  : "Start one. The first person to ask a good question is usually the second member."
              }
              actions={
                <>
                  {search && (
                    <Button variant="ghost" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    icon={<Plus />}
                    onClick={() => setDialogOpen(true)}
                    disabled={!hackathons.length}
                  >
                    Start a crew
                  </Button>
                </>
              }
            />
          ) : (
            <>
              <div className="team-grid mount-stagger">
                {visibleDiscoverTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    profiles={profiles}
                    currentUserId={meId}
                  />
                ))}
              </div>
              {discoverQuery.data?.total > visibleDiscoverTeams.length &&
                !search && (
                  <p
                    className="finder-toolbar__count"
                    style={{ marginTop: 16, textAlign: "center" }}
                  >
                    Showing the newest {visibleDiscoverTeams.length} of {discoverQuery.data.total}.
                    Narrow by hackathon to see a tighter board.
                  </p>
                )}
            </>
          )}
        </>
      )}

      <TeamDialog
        open={dialogVisible}
        onOpenChange={closeDialog}
        mode="create"
        hackathons={hackathons}
        defaultHackathonId={activeHackathonId}
        onCreated={handleCreated}
      />
    </div>
  );
}
