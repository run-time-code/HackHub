import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Briefcase,
  Check,
  Clock3,
  Code2,
  Globe,
  GraduationCap,
  MapPin,
  PenLine,
  Send,
  Share2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import Badge, { Chip } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import PageLoading from "../../components/ui/PageLoading";
import InviteDialog from "../../components/teams/InviteDialog";
import { getPublicProfile } from "../../lib/api/users";
import { queryKeys } from "../../lib/queryClient";
import { errorMessage } from "../../lib/api/http";
import { useAuth } from "../../context/auth-context";
import { useDocumentTitle } from "../../lib/hooks/useDocumentTitle";
import { useToast } from "../../providers/ToastProvider";
import {
  availabilityLabel,
  availabilityTone,
  copyText,
  formatDate,
  titleCase,
} from "../../lib/format";
import {
  profileLinkEntries,
  profileMeta,
  publicProfileBadges,
} from "../../lib/profile";
import { track } from "../../lib/analytics";

const LINK_ICONS = {
  github: Code2,
  linkedin: Briefcase,
  globe: Globe,
};

const LEVEL_FILL = {
  beginner: 1,
  intermediate: 3,
  advanced: 4,
  expert: 5,
};

export default function PublicProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: queryKeys.publicProfile(id),
    queryFn: ({ signal }) => getPublicProfile(id, { signal }),
    enabled: Boolean(id),
  });
  const profile = profileQuery.data;
  const isOwner = Boolean(profile && (profile.id === user?.id || profile.id === user?._id));
  useDocumentTitle(profile?.name ? `${profile.name} · Builder card` : "Builder card");

  async function share() {
    const url = `${window.location.origin}/u/${id}`;
    try {
      await copyText(url);
      track("profile_shared", { profileId: id });
      toast.success("Link copied", "Send it to someone who should know this builder.");
    } catch (error) {
      toast.error("Could not copy the link", error.message);
    }
  }

  function invite() {
    if (!user) {
      navigate("/auth?panel=login", {
        state: { from: { pathname: `/u/${id}` } },
      });
      return;
    }
    setInviteOpen(true);
  }

  if (profileQuery.isLoading) return <PageLoading label="Opening the builder card" />;

  if (profileQuery.isError || !profile) {
    return (
      <div className="content-body">
        <EmptyState
          icon={<UserPlus />}
          title="This card is not on the shelf"
          copy={errorMessage(
            profileQuery.error,
            "The builder may have changed their privacy settings, or the link may be old."
          )}
          actions={
            <>
              <Button to="/teammates" variant="primary">
                Back to the finder
              </Button>
              <Button to="/" variant="ghost">
                Go home
              </Button>
            </>
          }
        />
      </div>
    );
  }

  const badges = publicProfileBadges(profile);
  const links = profileLinkEntries(profile);
  const meta = profileMeta(profile);
  const availability = availabilityTone(profile.availability);
  const sortedSkills = [...(profile.skills || [])].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );

  return (
    <div className="container public-profile">
      <button type="button" className="team-detail__back" onClick={() => navigate(-1)}>
        <ArrowLeft aria-hidden="true" /> Back
      </button>

      <section className="public-profile__cover" aria-label="Builder card cover">
        <span className="public-profile__cover-mark">HackHub · Field guide / 05</span>
        <p className="public-profile__cover-quote">
          Every builder is a small archive of unfinished things.
        </p>
      </section>

      <header className="public-profile__head">
        <div className="public-profile__identity">
          <span className="public-profile__avatar">
            <Avatar name={profile.name} src={profile.avatarUrl} size="2xl" ring />
          </span>
          <div>
            <h1 className="public-profile__name">{profile.name || "A builder"}</h1>
            <p className="public-profile__headline">
              {profile.headline || "Still writing the headline. The work comes first."}
            </p>
            <div className="public-profile__meta">
              {profile.college && (
                <span>
                  <GraduationCap aria-hidden="true" /> {profile.college}
                </span>
              )}
              {profile.year && (
                <span>
                  <BriefcaseBusiness aria-hidden="true" /> Class of {profile.year}
                </span>
              )}
              {profile.location && (
                <span>
                  <MapPin aria-hidden="true" /> {profile.location}
                </span>
              )}
              <span>
                <Clock3 aria-hidden="true" /> Joined {formatDate(profile.createdAt, "MMM yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="public-profile__actions">
          {isOwner ? (
            <>
              <Button to="/profile" variant="primary" icon={<PenLine />}>
                Edit profile
              </Button>
              <Button variant="ghost" icon={<Share2 />} onClick={share}>
                Share
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" icon={<Send />} onClick={invite}>
                {user ? "Invite to my team" : "Sign in to invite"}
              </Button>
              <Button variant="ghost" icon={<Share2 />} onClick={share}>
                Share
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="public-profile__body">
        <main className="public-profile__main">
          <section className="profile-panel" aria-labelledby="about-title">
            <h2 className="profile-panel__title" id="about-title">
              About <span>01</span>
            </h2>
            {profile.bio ? (
              <p className="profile-bio">{profile.bio}</p>
            ) : (
              <p className="profile-bio profile-bio--empty">
                No story here yet. A blank page is still a beginning.
              </p>
            )}

            {links.length > 0 && (
              <div className="profile-links" style={{ marginTop: 22 }}>
                {links.map((link) => {
                  const Icon = LINK_ICONS[link.icon] || Globe;
                  return (
                    <a
                      className="profile-link"
                      href={link.value}
                      key={link.key}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon aria-hidden="true" /> {link.label}
                      <ArrowUpRight width={11} height={11} aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            )}
          </section>

          <section className="profile-panel" aria-labelledby="history-title">
            <h2 className="profile-panel__title" id="history-title">
              Past builds <span>02</span>
            </h2>
            {profile.pastHackathons?.length ? (
              <div>
                {profile.pastHackathons.map((entry, index) => (
                  <div className="history-item" key={`${entry.name}-${index}`}>
                    <span className="history-item__year">{entry.year || "Some year"}</span>
                    <h3 className="history-item__title">{entry.name || "An unnamed build"}</h3>
                    {entry.projectUrl && (
                      <a
                        className="history-item__link"
                        href={entry.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        See the work <ArrowUpRight aria-hidden="true" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-bio profile-bio--empty">
                No builds on the record yet. The next one can be the first line.
              </p>
            )}
          </section>

          {badges.length > 0 && (
            <section className="profile-panel" aria-labelledby="badges-title">
              <h2 className="profile-panel__title" id="badges-title">
                Marks earned <span>Derived</span>
              </h2>
              <div className="badge-grid">
                {badges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div className="badge-card" key={badge.key}>
                      <span className="badge-card__icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="badge-card__copy">
                        <strong>{badge.title}</strong>
                        <span>{badge.copy}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </main>

        <aside className="public-profile__aside">
          <section className="profile-panel" aria-labelledby="skills-title">
            <h2 className="profile-panel__title" id="skills-title">
              Toolkit <span>{sortedSkills.length}</span>
            </h2>
            {sortedSkills.length ? (
              sortedSkills.map((skill) => {
                const level = String(profile.skillProficiency?.[skill] || "intermediate").toLowerCase();
                const filled = LEVEL_FILL[level] || 3;
                return (
                  <div className="skill-meter" key={skill}>
                    <div className="skill-meter__head">
                      <span className="skill-meter__name">{skill}</span>
                      <span className="skill-meter__level">{titleCase(level)}</span>
                    </div>
                    <div className="skill-meter__track" aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span
                          className={`skill-meter__seg ${index < filled ? "is-filled" : ""} ${
                            level === "expert" ? "skill-meter__seg--expert" : ""
                          }`}
                          key={index}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="profile-bio profile-bio--empty">No tools listed yet.</p>
            )}
          </section>

          <section className="profile-panel" aria-labelledby="availability-title">
            <h2 className="profile-panel__title" id="availability-title">
              Status <span>Live</span>
            </h2>
            <div className={`availability-card availability-card--${availability}`}>
              <span className="availability-card__icon" aria-hidden="true">
                <Sparkles />
              </span>
              <div>
                <strong>{availabilityLabel(profile.availability)}</strong>
                <span>
                  {profile.lookingForTeam
                    ? "Open to a crew and the right problem."
                    : "Not looking for a team right now."}
                </span>
              </div>
            </div>
            {meta.length > 0 && (
              <div className="cluster" style={{ marginTop: 14, gap: 6 }}>
                {meta.map((entry) => (
                  <Chip key={entry}>{entry}</Chip>
                ))}
              </div>
            )}
          </section>

          <section className="profile-panel" aria-labelledby="record-title">
            <h2 className="profile-panel__title" id="record-title">
              The record <span>Profile</span>
            </h2>
            <div className="stack" style={{ gap: 12 }}>
              <div className="cluster" style={{ justifyContent: "space-between" }}>
                <span className="dash-stat__label">Open to teams</span>
                <span className="team-card__size">
                  {profile.lookingForTeam ? "Yes" : "Not right now"}
                </span>
              </div>
              <div className="cluster" style={{ justifyContent: "space-between" }}>
                <span className="dash-stat__label">Skills on file</span>
                <span className="team-card__size">{sortedSkills.length}</span>
              </div>
              <div className="cluster" style={{ justifyContent: "space-between" }}>
                <span className="dash-stat__label">Past builds</span>
                <span className="team-card__size">{profile.pastHackathons?.length || 0}</span>
              </div>
            </div>
            <div
              className="alert alert--success"
              style={{ marginTop: 16 }}
              role="note"
            >
              <Check aria-hidden="true" />
              <div className="alert__body">
                <strong>Private by default.</strong>
                <p>Email addresses and contact details never appear on a public card.</p>
              </div>
            </div>
          </section>

          {!isOwner && (
            <div className="dash-quote">
              <p>“A good teammate is a multiplier, not a mirror.”</p>
              <span>Field note · 03</span>
            </div>
          )}

          <Button to="/teammates" variant="ghost" block icon={<ArrowLeft />}>
            Back to the finder
          </Button>
        </aside>
      </div>

      {!isOwner && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          teammate={profile}
        />
      )}

      <div className="cluster" style={{ marginTop: 24, justifyContent: "center" }}>
        <Badge variant="outline">Builder card #{profile.id?.slice(-4) || "0000"}</Badge>
        <Link to="/faq" className="eyebrow eyebrow--plain">
          How cards work
        </Link>
      </div>
    </div>
  );
}
