import { Link } from "react-router-dom";
import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import Avatar from "../ui/Avatar";
import Badge, { Chip } from "../ui/Badge";

export default function TeamCard({ team, profiles = {}, currentUserId, className = "" }) {
  const open = team.status === "open" && team.openSlots > 0;
  const crewIds = [team.leader, ...(team.members || []).map((member) => member.user)].filter(
    Boolean
  );
  const visibleCrew = crewIds.slice(0, 4);
  const isLeader = team.leader === currentUserId;
  const isMember = crewIds.includes(currentUserId);

  return (
    <article className={`team-card ${open ? "team-card--open" : "team-card--closed"} ${className}`}>
      <span className="team-card__stripe" aria-hidden="true" />
      <div className="team-card__top">
        <span className="team-card__hackathon">
          <CalendarDays aria-hidden="true" />
          {team.hackathonTitle || "Hackathon team"}
        </span>
        <Badge variant={open ? "moss" : "outline"} dot>
          {open
            ? `${team.openSlots} ${team.openSlots === 1 ? "seat" : "seats"} open`
            : "Closed"}
        </Badge>
      </div>

      <h3 className="team-card__name">
        <Link to={`/teams/${team.id}`}>{team.name}</Link>
      </h3>
      <p className="team-card__description">
        {team.description || "A crew forming around a build. Open the card for the full brief."}
      </p>

      {team.rolesNeeded?.length > 0 && (
        <div className="team-card__roles">
          {team.rolesNeeded.slice(0, 4).map((role) => (
            <Chip key={role}>{role}</Chip>
          ))}
        </div>
      )}

      <div className="team-card__foot">
        <div className="team-card__crew">
          <div className="avatar-stack">
            {visibleCrew.map((id) => (
              <Avatar
                key={id}
                name={profiles[id]?.name || "Builder"}
                src={profiles[id]?.avatarUrl}
                size="xs"
              />
            ))}
            {crewIds.length > visibleCrew.length && (
              <span className="avatar-stack__more">+{crewIds.length - visibleCrew.length}</span>
            )}
          </div>
          <span className="team-card__size">
            {team.size}/{team.maxTeamSize} builders
          </span>
        </div>
        {isLeader ? (
          <span className="team-card__leader-flag">You lead</span>
        ) : isMember ? (
          <span className="team-card__leader-flag">You&apos;re in</span>
        ) : (
          <span className="team-card__leader-flag" aria-hidden="true">
            <UsersRound size={12} />
          </span>
        )}
      </div>
    </article>
  );
}

export function TeamCardSkeleton() {
  return (
    <div className="team-card" aria-hidden="true">
      <div className="skeleton skeleton--text" style={{ width: "35%" }} />
      <div className="skeleton skeleton--title" style={{ width: "65%", marginTop: 22 }} />
      <div className="skeleton skeleton--text" style={{ width: "90%", marginTop: 12 }} />
      <div className="skeleton skeleton--text" style={{ width: "70%" }} />
    </div>
  );
}

export function TeamMeta({ team }) {
  return (
    <div className="team-hero__meta">
      <span>
        <MapPin aria-hidden="true" />
        {team.hackathonTitle || "Hackathon team"}
      </span>
      <span>
        <UsersRound aria-hidden="true" />
        {team.size}/{team.maxTeamSize} builders
      </span>
    </div>
  );
}
