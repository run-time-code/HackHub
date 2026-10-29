import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Compass,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import { Chip } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import EmptyState from "../../components/ui/EmptyState";
import MatchRing from "../../components/ui/MatchRing";
import Switch from "../../components/ui/Switch";
import { Input } from "../../components/ui/Field";
import InviteDialog from "../../components/teams/InviteDialog";
import { discoverUsers } from "../../lib/api/teams";
import { getMyProfile, getSkillTaxonomy } from "../../lib/api/users";
import { queryKeys } from "../../lib/queryClient";
import { errorMessage } from "../../lib/api/http";
import { useAuth } from "../../context/auth-context";
import { useDocumentTitle } from "../../lib/hooks/useDocumentTitle";
import { useDebouncedValue } from "../../lib/hooks/useDebouncedValue";
import {
  MAX_FINDER_SKILLS,
  initialFinderSkills,
  prepareTeammates,
  toggleFinderSkill,
} from "../../lib/discovery";
import {
  availabilityLabel,
  availabilityTone,
  formatRelative,
  pluralize,
} from "../../lib/format";

const AVAILABILITY = [
  { value: "", label: "Anyone" },
  { value: "available", label: "Available" },
  { value: "limited", label: "Limited" },
];

function Filters({
  idPrefix,
  taxonomy,
  selectedSkills,
  onToggleSkill,
  availability,
  onAvailability,
  lookingForTeam,
  onLookingForTeam,
  skillQuery,
  onSkillQuery,
  onClear,
  compact = false,
}) {
  const skillOptions = useMemo(() => {
    const term = skillQuery.trim().toLowerCase();
    return Object.values(taxonomy || {})
      .flat()
      .filter((skill) => !term || skill.toLowerCase().includes(term))
      .sort((a, b) => a.localeCompare(b));
  }, [taxonomy, skillQuery]);

  return (
    <>
      <div className="finder-rail__head">
        <span>Filter the room</span>
        <button type="button" className="cookie-banner__settings" onClick={onClear}>
          Reset
        </button>
      </div>

      <div className="finder-rail__group">
        <div className="finder-rail__label">
          Skills <span>{selectedSkills.length}/{MAX_FINDER_SKILLS}</span>
        </div>
        <Input
          id={`${idPrefix}-skill-search`}
          value={skillQuery}
          onChange={(event) => onSkillQuery(event.target.value)}
          placeholder="Filter skills"
          aria-label="Filter skill options"
        />
        <div className="finder-rail__skills" role="group" aria-label="Filter by skills">
          {skillOptions.map((skill) => (
            <Chip
              key={skill}
              selected={selectedSkills.includes(skill)}
              onClick={() => onToggleSkill(skill)}
              disabled={
                !selectedSkills.includes(skill) &&
                selectedSkills.length >= MAX_FINDER_SKILLS
              }
            >
              {skill}
            </Chip>
          ))}
          {skillOptions.length === 0 && (
            <span className="field__hint">No skill matches that search.</span>
          )}
        </div>
      </div>

      <div className="finder-rail__group">
        <div className="finder-rail__label">
          Availability <span>Now</span>
        </div>
        <div className="segmented" role="group" aria-label="Filter by availability">
          {AVAILABILITY.map((entry) => (
            <button
              type="button"
              key={entry.value || "any"}
              className="segmented__item"
              aria-pressed={availability === entry.value}
              onClick={() => onAvailability(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="finder-rail__group">
        <label className="toggle-row" htmlFor={`${idPrefix}-looking`}>
          <span className="toggle-row__copy">
            <strong>Open to teams</strong>
            <p>
              {lookingForTeam
                ? "Only builders who want a crew right now."
                : "Builders who are discoverable but not looking."}
            </p>
          </span>
          <Switch
            id={`${idPrefix}-looking`}
            checked={lookingForTeam}
            onCheckedChange={onLookingForTeam}
          />
        </label>
      </div>

      {!compact && (
        <div className="finder-rail__foot">
          <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={onClear}>
            Clear all
          </Button>
          <Button variant="primary" size="sm" icon={<Compass />} onClick={onClear}>
            Widen
          </Button>
        </div>
      )}
    </>
  );
}

export default function Teammates() {
  useDocumentTitle("Teammate finder");
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedTeam = searchParams.get("team") || "";

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [skills, setSkills] = useState(() => initialFinderSkills(user));
  const [availability, setAvailability] = useState("");
  const [lookingForTeam, setLookingForTeam] = useState(true);
  const [sort, setSort] = useState("match");
  const [skillQuery, setSkillQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTeammate, setSelectedTeammate] = useState(null);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => getMyProfile(),
  });
  const taxonomyQuery = useQuery({
    queryKey: queryKeys.skills,
    queryFn: getSkillTaxonomy,
    staleTime: 30 * 60_000,
  });
  const profile = profileQuery.data;
  const meId = profile?.id || user?.id || "";

  const discoveryQuery = useQuery({
    queryKey: queryKeys.teammates({
      surface: "finder",
      q: debouncedQuery,
      skills: [...skills].sort(),
      availability,
      lookingForTeam,
    }),
    queryFn: ({ signal }) =>
      discoverUsers(
        {
          q: debouncedQuery,
          skills,
          availability,
          lookingForTeam,
          page: 1,
          limit: 48,
        },
        { signal }
      ),
    placeholderData: (previous) => previous,
  });

  const people = useMemo(
    () =>
      prepareTeammates(discoveryQuery.data?.items || [], {
        currentUserId: meId,
        sort,
      }),
    [discoveryQuery.data, sort, meId]
  );

  const activeFilterCount =
    (skills.length ? 1 : 0) +
    (availability ? 1 : 0) +
    (query ? 1 : 0) +
    (!lookingForTeam ? 1 : 0);

  function toggleSkill(skill) {
    setSkills((current) => toggleFinderSkill(current, skill));
  }

  function clearFilters() {
    setQuery("");
    setSkills([]);
    setAvailability("");
    setLookingForTeam(true);
    setSkillQuery("");
    setSort("match");
    setFiltersOpen(false);
  }

  const filterProps = {
    taxonomy: taxonomyQuery.data || {},
    selectedSkills: skills,
    onToggleSkill: toggleSkill,
    availability,
    onAvailability: setAvailability,
    lookingForTeam,
    onLookingForTeam: setLookingForTeam,
    skillQuery,
    onSkillQuery: setSkillQuery,
    onClear: clearFilters,
  };

  return (
    <div>
      <header className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">The room · Opt-in only</span>
          <h1 className="page-head__title">Find someone who makes the idea bigger.</h1>
          <p className="page-head__deck">
            Search builders by the tools they bring and the teams they want. Every card here
            belongs to someone who chose to be found.
          </p>
        </div>
        <div className="page-head__actions">
          <Button to="/teams" variant="ghost" iconRight={<ArrowUpRight />}>
            Browse teams
          </Button>
        </div>
      </header>

      {profile && !profile.discoverable && (
        <div className="alert alert--info" role="note" style={{ marginBottom: 20 }}>
          <Sparkles aria-hidden="true" />
          <div className="alert__body">
            <strong>Your own card is still private.</strong>
            <p>
              You can search the room, but nobody can find you back. Turn on discovery when
              you are ready to be invited.
            </p>
            <Link to="/profile#visibility" className="btn btn--primary btn--sm" style={{ width: "fit-content" }}>
              Open visibility settings
            </Link>
          </div>
        </div>
      )}

      <div className="finder-layout">
        <aside className="finder-rail" aria-label="Teammate filters">
          <Filters idPrefix="desktop" {...filterProps} />
        </aside>

        <div className="finder-results">
          <div className="finder-mobile-bar">
            <Button
              variant="secondary"
              icon={<SlidersHorizontal />}
              onClick={() => setFiltersOpen(true)}
            >
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </Button>
            <Button
              variant="ghost"
              icon={<RotateCcw />}
              onClick={clearFilters}
              disabled={!activeFilterCount}
            >
              Reset
            </Button>
          </div>

          <div className="finder-toolbar">
            <div className="finder-toolbar__count" role="status" aria-live="polite">
              <strong>{discoveryQuery.data?.total ?? people.length}</strong>{" "}
              {pluralize(discoveryQuery.data?.total ?? people.length, "builder", "builders")} ·{" "}
              {sort === "match" ? "sorted by match" : sort === "recent" ? "recently active" : "A–Z"}
            </div>
            <div className="finder-toolbar__controls">
              <div className="input-group finder-toolbar__search">
                <Search aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, headline or skill"
                  aria-label="Search teammates"
                />
              </div>
              <select
                className="select"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort teammates"
                style={{ width: "auto", minWidth: 150 }}
              >
                <option value="match">Best match</option>
                <option value="recent">Recently active</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="requests-page__summary" style={{ marginBottom: 18 }}>
              {query && <Chip onClick={() => setQuery("")}>Search: {query}</Chip>}
              {skills.map((skill) => (
                <Chip key={skill} selected variant="moss" onClick={() => toggleSkill(skill)}>
                  {skill}
                </Chip>
              ))}
              {availability && (
                <Chip onClick={() => setAvailability("")}>
                  {availabilityLabel(availability)}
                </Chip>
              )}
              {!lookingForTeam && (
                <Chip onClick={() => setLookingForTeam(true)}>Not looking</Chip>
              )}
              <button type="button" className="cookie-banner__settings" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          )}

          {discoveryQuery.isError ? (
            <div className="alert alert--danger" role="alert">
              <Filter aria-hidden="true" />
              <div className="alert__body">
                <strong>The finder could not load.</strong>
                <p>{errorMessage(discoveryQuery.error, "Try again in a moment.")}</p>
                <Button size="sm" variant="ghost" onClick={() => discoveryQuery.refetch()}>
                  Try again
                </Button>
              </div>
            </div>
          ) : discoveryQuery.isLoading ? (
            <div className="finder-grid" aria-busy="true" aria-label="Loading teammates">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="teammate-card" key={index}>
                  <div className="skeleton skeleton--text" style={{ width: "40%" }} />
                  <div className="skeleton skeleton--title" style={{ width: "70%", marginTop: 16 }} />
                  <div className="skeleton skeleton--text" style={{ width: "90%", marginTop: 18 }} />
                  <div className="skeleton skeleton--text" style={{ width: "80%", marginTop: 8 }} />
                </div>
              ))}
            </div>
          ) : people.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No one matches all of that"
              copy={
                activeFilterCount
                  ? "Try fewer skills or a wider availability. Great collaborators rarely match every box."
                  : "The room is quiet right now. Invite someone you already know, or finish your own card so others can find you."
              }
              actions={
                activeFilterCount ? (
                  <Button variant="primary" onClick={clearFilters}>
                    Widen the search
                  </Button>
                ) : (
                  <Button to="/profile" variant="primary">
                    Finish your card
                  </Button>
                )
              }
            />
          ) : (
            <div className="finder-grid">
              {people.map((person) => {
                const muted = availabilityTone(person.availability);
                return (
                  <article className="teammate-card" key={person.id}>
                    <div className="teammate-card__top">
                      <div className="teammate-card__identity">
                        <Avatar name={person.name} src={person.avatarUrl} size="lg" ring />
                        <div style={{ minWidth: 0 }}>
                          <h2 className="teammate-card__name">{person.name || "A builder"}</h2>
                          <p className="teammate-card__headline">
                            {person.headline || "Builder, still writing the headline."}
                          </p>
                          <div className="teammate-card__meta">
                            {person.college && <span>{person.college}</span>}
                            {person.year && <span>Class of {person.year}</span>}
                            {person.location && (
                              <span>
                                <MapPin size={9} aria-hidden="true" /> {person.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {person.matchScore > 0 && (
                        <MatchRing
                          value={person.matchScore}
                          size="sm"
                          label={`${person.matchScore} percent match based on your selected skills`}
                        />
                      )}
                    </div>

                    <p className="teammate-card__bio">
                      {person.bio || "No note yet. Open the card and ask what they are building."}
                    </p>

                    <div className="teammate-card__skills">
                      {person.matchedSkills?.slice(0, 3).map((skill) => (
                        <Chip key={skill} variant="moss" title="Matches your filter">
                          {skill}
                        </Chip>
                      ))}
                      {(person.skills || [])
                        .filter((skill) => !person.matchedSkills?.includes(skill))
                        .slice(0, Math.max(4 - (person.matchedSkills?.length || 0), 1))
                        .map((skill) => (
                          <Chip key={skill}>{skill}</Chip>
                        ))}
                      {person.skills?.length > 6 && (
                        <Chip>+{person.skills.length - 6}</Chip>
                      )}
                    </div>

                    <div className="teammate-card__foot">
                      <div className="stack" style={{ gap: 3 }}>
                        <span
                          className={`teammate-card__availability teammate-card__availability--${muted}`}
                        >
                          {availabilityLabel(person.availability)}
                        </span>
                        <span className="match-note">
                          <Sparkles aria-hidden="true" />
                          {person.updatedAt ? `Active ${formatRelative(person.updatedAt)}` : "Open to teams"}
                        </span>
                      </div>
                      <div className="teammate-card__actions">
                        <Button to={`/u/${person.id}`} variant="ghost" size="sm">
                          View
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedTeammate(person)}
                        >
                          Invite
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter the room"
        description="The finder only shows builders who opted into discovery."
        size="md"
      >
        <div className="finder-rail" style={{ position: "static", border: 0 }}>
          <Filters idPrefix="mobile" compact {...filterProps} />
        </div>
        <div className="dialog__footer">
          <Button variant="ghost" onClick={() => setFiltersOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setFiltersOpen(false)}>
            Show {people.length} {pluralize(people.length, "builder", "builders")}
          </Button>
        </div>
      </Dialog>

      <InviteDialog
        open={Boolean(selectedTeammate)}
        onOpenChange={(open) => {
          if (!open) setSelectedTeammate(null);
        }}
        teammate={selectedTeammate}
        teamId={preselectedTeam || undefined}
      />
    </div>
  );
}
