import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDot,
  Compass,
  Fingerprint,
  Handshake,
  Layers,
  MapPin,
  Plus,
  Sparkles,
  Target,
  UserPlus,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";
import Button from "../components/ui/Button";
import Badge, { Chip } from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import MatchRing from "../components/ui/MatchRing";
import Reveal from "../components/ui/Reveal";
import { getPlatformStats } from "../lib/api/platform";
import { queryKeys } from "../lib/queryClient";
import { useAuth } from "../context/auth-context";
import { useDocumentTitle } from "../lib/hooks/useDocumentTitle";

const FEATURES = [
  {
    num: "01 / PROFILE",
    icon: Fingerprint,
    title: "A builder card that says more than a résumé.",
    deck: "Skills with honest proficiency, past builds, links and availability. One page that answers the only question that matters: can I work with this person?",
    className: "feature-card--wide",
    visual: "matches",
  },
  {
    num: "02 / TEAMS",
    icon: UsersRound,
    title: "A crew, not a group chat.",
    deck: "Open seats, roles needed and a leader view that keeps the handshakes moving.",
    className: "feature-card--narrow",
    visual: "inbox",
  },
  {
    num: "03 / FIND",
    icon: Compass,
    title: "Search by what you can build together.",
    deck: "Filter by skills, interests and availability. Match scores are explainable, not magic.",
    className: "feature-card--third",
  },
  {
    num: "04 / SHIP",
    icon: CalendarClock,
    title: "Deadlines in your eyeline.",
    deck: "Registration and submission dates collected in one quiet, ordered place.",
    className: "feature-card--third feature-card--lime",
  },
  {
    num: "05 / TRUST",
    icon: Handshake,
    title: "Consent before contact.",
    deck: "Discovery is opt-in. Your email never appears on a public card. Every invitation is a choice.",
    className: "feature-card--third feature-card--dark",
  },
];

const ROLES = [
  {
    title: "The Interface",
    copy: "Frontend engineers and designers who care about the last ten percent.",
    skills: ["React", "TypeScript", "Figma"],
    missing: "12 teams need this",
    color: "var(--lime)",
  },
  {
    title: "The Engine",
    copy: "Backend builders who make the impossible part look scheduled.",
    skills: ["Node.js", "Python", "Postgres"],
    missing: "9 teams need this",
    color: "var(--signal-soft)",
  },
  {
    title: "The Model",
    copy: "ML engineers turning a clever notebook into something that survives a demo.",
    skills: ["PyTorch", "LLMs", "Data"],
    missing: "7 teams need this",
    color: "var(--moss-soft)",
  },
  {
    title: "The Story",
    copy: "Product thinkers, writers and operators who keep the build honest.",
    skills: ["Strategy", "Copy", "Pitch"],
    missing: "5 teams need this",
    color: "var(--info-soft)",
  },
];

const PLATFORMS = ["Devpost", "MLH", "Unstop", "Devfolio", "HackerEarth"];

const MARQUEE = [
  "Find the team",
  "Ship the thing",
  "Show the work",
  "Meet the builders",
  "Make the first move",
  "Leave a mark",
];

const FAQ_PREVIEW = [
  {
    q: "Is HackHub free for students?",
    a: "Yes. Creating a builder card, finding teammates and joining teams costs nothing. We may add paid team tools later, never a paywall on discovery.",
  },
  {
    q: "Who can see my profile?",
    a: "Only signed-in builders can find you, and only if you turn discovery on. Your email is never shown. You can switch visibility off at any time.",
  },
  {
    q: "How does the match score work?",
    a: "It weighs the skills you filter by at 70% and shared interests at 30%. Every card shows why it matched, so you can judge the number yourself.",
  },
  {
    q: "Can I join more than one team?",
    a: "You can belong to several teams across different hackathons. One team per hackathon keeps the crew focused, but the door is open elsewhere.",
  },
];

const SHOWCASE_ITEMS = [
  {
    icon: Compass,
    title: "Filter like a scout",
    copy: "Skills, interests, availability and a free-text search that understands headlines, not just names.",
  },
  {
    icon: Target,
    title: "See the overlap",
    copy: "Matched skills are highlighted on every card. No black-box ranking.",
  },
  {
    icon: UserPlus,
    title: "Invite with context",
    copy: "Pick the team, name the role, add a note. The invitation lands in their wire with an expiry date.",
  },
];

const SHOWCASE_CANDIDATES = [
  { name: "Meera Nair", meta: "ML engineer · IISc", score: 92, skills: ["PyTorch", "Python"] },
  { name: "Tara Bose", meta: "Product designer · NID", score: 78, skills: ["Figma", "Research"] },
  { name: "Kabir Shah", meta: "Backend · BITS", score: 65, skills: ["Node.js", "Postgres"] },
];

function formatStat(value) {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("en", { notation: value >= 10_000 ? "compact" : "standard" }).format(value);
}

function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="accordion">
      {items.map((item, index) => {
        const open = index === openIndex;
        return (
          <div className="accordion__item" key={item.q}>
            <button
              type="button"
              className="accordion__trigger"
              aria-expanded={open}
              aria-controls={`faq-panel-${index}`}
              id={`faq-trigger-${index}`}
              data-state={open ? "open" : "closed"}
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              {item.q}
              <Plus aria-hidden="true" />
            </button>
            <div
              className="accordion__content"
              id={`faq-panel-${index}`}
              role="region"
              aria-labelledby={`faq-trigger-${index}`}
              hidden={!open}
            >
              <p>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="hero-visual" aria-label="Preview of a builder card and a team card">
      <svg className="hero-visual__canvas" viewBox="0 0 520 620" aria-hidden="true">
        <path d="M60 30 C 200 90, 330 60, 470 180" fill="none" stroke="var(--line-strong)" strokeDasharray="2 6" />
        <path d="M30 420 C 160 500, 320 460, 470 520" fill="none" stroke="var(--line-strong)" strokeDasharray="2 6" />
        <circle cx="60" cy="30" r="3" fill="var(--signal)" />
        <circle cx="470" cy="180" r="3" fill="var(--moss)" />
        <circle cx="30" cy="420" r="3" fill="var(--moss)" />
        <circle cx="470" cy="520" r="3" fill="var(--signal)" />
      </svg>

      <div className="hero-visual__stage">
        <article className="hero-card hero-card--profile">
          <div className="hero-card__head">
            <div className="hero-card__identity">
              <Avatar name="Aarav Mehta" size="lg" />
              <div>
                <h3 className="hero-card__name">Aarav Mehta</h3>
                <p className="hero-card__meta">Frontend · VIT &apos;27</p>
              </div>
            </div>
            <MatchRing value={94} size="sm" />
          </div>
          <div className="hero-card__skills">
            <Chip>React</Chip>
            <Chip>TypeScript</Chip>
            <Chip>Figma</Chip>
          </div>
          <div className="hero-card__foot">
            <span className="hero-card__availability">Open to teams</span>
            <span className="mono" style={{ color: "var(--faint)", fontSize: "0.52rem" }}>
              Chennai, IN
            </span>
          </div>
        </article>

        <article className="hero-card hero-card--team">
          <div className="hero-card__head">
            <div>
              <p className="mono" style={{ color: "var(--faint)", fontSize: "0.5rem" }}>
                Team · 3 / 4 seats
              </p>
              <h3 className="hero-card__name" style={{ marginTop: 6 }}>
                Orbital Drift
              </h3>
            </div>
            <Badge variant="moss" dot>
              open
            </Badge>
          </div>
          <div className="hero-team__members">
            <div className="avatar-stack">
              <Avatar name="Aarav Mehta" size="sm" />
              <Avatar name="Ishaan Rao" size="sm" />
              <Avatar name="Tara Bose" size="sm" />
              <span className="avatar avatar--sm avatar-stack__more">+1</span>
            </div>
            <span className="hero-team__seats">1 seat open</span>
          </div>
          <div className="hero-team__roles">
            <Chip variant="signal">ML engineer</Chip>
            <Chip>Designer</Chip>
          </div>
        </article>

        <aside className="hero-card hero-card--note">
          <p className="mono" style={{ fontSize: "0.5rem" }}>
            Field note 014
          </p>
          <p style={{ marginTop: 8, fontFamily: "var(--serif)", fontSize: "1.12rem", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            &ldquo;The best teams start with a small, specific yes.&rdquo;
          </p>
        </aside>

        <span className="hero-float hero-float--a">
          <Zap aria-hidden="true" /> 128 open seats
        </span>
        <span className="hero-float hero-float--b">
          <Bell aria-hidden="true" /> 3 requests waiting
        </span>
        <span className="hero-float hero-float--c">
          <MapPin aria-hidden="true" /> 42 campuses
        </span>
      </div>
    </div>
  );
}

function FeatureVisual({ type }) {
  if (type === "matches") {
    return (
      <div className="feature-card__visual">
        <div className="mini-match">
          <Avatar name="Meera Nair" size="sm" />
          <div className="mini-match__body">
            <strong>Meera Nair</strong>
            <span>ML · 3 matched skills</span>
          </div>
          <MatchRing value={92} size="sm" />
        </div>
        <div className="mini-match">
          <Avatar name="Kabir Shah" size="sm" />
          <div className="mini-match__body">
            <strong>Kabir Shah</strong>
            <span>Backend · 2 matched skills</span>
          </div>
          <MatchRing value={74} size="sm" />
        </div>
      </div>
    );
  }

  if (type === "inbox") {
    return (
      <div className="feature-card__visual">
        <div className="mini-inbox">
          <div className="mini-inbox__row">
            <Avatar name="Tara Bose" size="xs" />
            <div>
              <strong>Tara wants to join</strong>
              <span>Orbital Drift · Designer</span>
            </div>
            <span className="mini-inbox__action">Review</span>
          </div>
          <div className="mini-inbox__row">
            <Avatar name="Ishaan Rao" size="xs" />
            <div>
              <strong>Ishaan accepted</strong>
              <span>You are now 3 of 4</span>
            </div>
            <span className="mini-inbox__action">Open</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function Landing() {
  useDocumentTitle(
    "Find your people. Build the improbable.",
    "Hackathons, teammates and deadlines in one field guide for student builders. Show up with a crew, not a cold start."
  );
  const { user } = useAuth();
  const stats = useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => getPlatformStats({ signal }),
    staleTime: 5 * 60_000,
  });

  const statValues = useMemo(
    () => [
      { value: stats.data?.hackathons, label: "Hackathons indexed" },
      { value: stats.data?.teams, label: "Teams assembling" },
      { value: stats.data?.builders, label: "Builders on the books" },
      { value: stats.data?.openTeams, label: "Teams with open seats" },
    ],
    [stats.data]
  );

  return (
    <div className="landing page-enter">
      <div className="landing__main">
        <section className="hero">
          <div className="hero__grid-lines" aria-hidden="true" />
          <div className="hero__orb hero__orb--lime" aria-hidden="true" />
          <div className="hero__orb hero__orb--signal" aria-hidden="true" />

          <div className="container hero__inner">
            <div className="hero__copy">
              <p className="eyebrow hero__eyebrow">Season 01 · The builder network</p>
              <h1 className="hero__title">
                <span className="hero__title-line">Find your</span>
                <span className="hero__title-line">people. Build</span>
                <span className="hero__title-line">
                  the <em>improbable.</em>
                </span>
              </h1>
              <p className="hero__deck">
                Hackathons, teammates and deadlines in one field guide for student
                builders. Show up with a crew, not a cold start.
              </p>
              <div className="hero__actions">
                <Button
                  to={user ? "/dashboard" : "/auth?panel=register"}
                  variant="primary"
                  size="lg"
                  iconRight={<ArrowRight aria-hidden="true" />}
                >
                  {user ? "Back to your desk" : "Start building — free"}
                </Button>
                <Button href="#how" variant="secondary" size="lg" icon={<Compass aria-hidden="true" />}>
                  See how it works
                </Button>
              </div>
              <div className="hero__micro">
                <span className="hero__micro-item">
                  <Check aria-hidden="true" /> Free for students
                </span>
                <span className="hero__micro-item">
                  <Check aria-hidden="true" /> Opt-in discovery
                </span>
                <span className="hero__micro-item">
                  <Check aria-hidden="true" /> No recruiter spam
                </span>
              </div>
              <div className="hero__platforms">
                <span className="hero__platforms-label">Built for builders from</span>
                {PLATFORMS.map((platform) => (
                  <span className="hero__platform" key={platform}>
                    {platform}
                  </span>
                ))}
              </div>
            </div>

            <HeroVisual />
          </div>

          <span className="hero-scroll">Scroll to the field notes</span>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {[0, 1].map((group) => (
              <div className="marquee__group" key={group}>
                {MARQUEE.map((item) => (
                  <span className="marquee__item" key={`${group}-${item}`}>
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section className="stats-band" aria-label="Live network numbers">
          <div className="container stats-band__inner">
            <div className="stats-band__intro">
              <span className="stats-band__live">Live network</span>
              <p>Numbers from the field, refreshed as crews form and seats fill.</p>
            </div>
            {statValues.map((stat) => (
              <div className="stats-band__stat" key={stat.label}>
                <span className="stats-band__value">{formatStat(stat.value)}</span>
                <span className="stats-band__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="platform-strip">
          <div className="container platform-strip__inner">
            <span className="platform-strip__label">Field partners &amp; sources</span>
            <div className="platform-strip__list">
              {PLATFORMS.map((platform) => (
                <span className="platform-strip__name" key={platform}>
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </div>

        <section className="section" id="find">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <div className="section-head__copy">
                  <span className="eyebrow">The kit · 01—05</span>
                  <h2 className="section-head__title">
                    Everything between <em>alone</em> and assembled.
                  </h2>
                  <p className="section-head__deck">
                    A small set of sharp tools instead of a feed. Each one exists to
                    move you closer to a team that ships.
                  </p>
                </div>
                <Button to={user ? "/teammates" : "/auth?panel=register"} variant="ghost" iconRight={<ArrowUpRight />}>
                  Open the kit
                </Button>
              </div>
            </Reveal>

            <div className="feature-grid stagger">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article className={`feature-card ${feature.className}`} key={feature.title}>
                    <span className="feature-card__num">{feature.num}</span>
                    <div className="feature-card__icon">
                      <Icon aria-hidden="true" />
                    </div>
                    <h3 className="feature-card__title">{feature.title}</h3>
                    <p className="feature-card__deck">{feature.deck}</p>
                    {feature.visual && <FeatureVisual type={feature.visual} />}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="how" id="how">
          <div className="container how__inner">
            <div className="how__head">
              <div>
                <span className="eyebrow">How it works</span>
                <h2 className="section-title" style={{ marginTop: 14 }}>
                  Three moves. One weekend that counts.
                </h2>
              </div>
              <p className="how__lead">
                No endless feed. No cold DMs. Write down what you can build, find the
                people who complete it, and put the deadline where you can see it.
              </p>
            </div>

            <div className="how__steps">
              <article className="how-step">
                <h3 className="how-step__title">Write your card</h3>
                <p className="how-step__copy">
                  A short, honest profile: skills with proficiency, what you have
                  shipped, and what you want to build next. Ten minutes, once.
                </p>
                <span className="how-step__meta">
                  <Fingerprint aria-hidden="true" /> One profile, every hackathon
                </span>
              </article>
              <article className="how-step">
                <h3 className="how-step__title">Find the overlap</h3>
                <p className="how-step__copy">
                  Filter the finder by the skills your idea is missing. Read the
                  cards, check the availability, send an invitation with context.
                </p>
                <span className="how-step__meta">
                  <Compass aria-hidden="true" /> Discovery is opt-in for everyone
                </span>
              </article>
              <article className="how-step">
                <h3 className="how-step__title">Build in the open</h3>
                <p className="how-step__copy">
                  Keep the crew, the open roles and the request queue in one place.
                  When the team fills, the door closes quietly.
                </p>
                <span className="how-step__meta">
                  <Layers aria-hidden="true" /> Seats, roles and deadlines in sync
                </span>
              </article>
            </div>
          </div>
        </section>

        <section className="section roles" id="builders">
          <div className="container">
            <div className="roles__head">
              <div>
                <span className="eyebrow eyebrow--moss">Who you will meet</span>
                <h2 className="section-title" style={{ marginTop: 14 }}>
                  Every team is missing <em>someone.</em>
                </h2>
              </div>
              <Button to="/teammates" variant="secondary" iconRight={<ArrowRight />}>
                Meet the builders
              </Button>
            </div>

            <div className="roles__grid">
              {ROLES.map((role, index) => (
                <article className="role-card" key={role.title} style={{ "--role-color": role.color }}>
                  <span className="role-card__orb" aria-hidden="true" />
                  <span className="role-card__num">{String(index + 1).padStart(2, "0")} / ROLE</span>
                  <h3 className="role-card__title">{role.title}</h3>
                  <p className="role-card__copy">{role.copy}</p>
                  <div className="role-card__skills">
                    {role.skills.map((skill) => (
                      <Chip key={skill}>{skill}</Chip>
                    ))}
                  </div>
                  <span className="role-card__missing">
                    <CircleDot aria-hidden="true" /> {role.missing}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--tight">
          <div className="container">
            <Reveal direction="left">
              <div className="showcase">
                <div className="showcase__copy">
                  <span className="eyebrow">The finder, up close</span>
                  <h2 className="section-title" style={{ marginTop: 14 }}>
                    Scout for the missing piece.
                  </h2>
                  <div className="showcase__list">
                    {SHOWCASE_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div className="showcase__item" key={item.title}>
                          <span className="showcase__item-icon">
                            <Icon aria-hidden="true" />
                          </span>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.copy}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 26 }}>
                    <Button to="/teammates" variant="primary" iconRight={<ArrowRight />}>
                      Try the finder
                    </Button>
                  </div>
                </div>

                <div className="showcase__visual" aria-hidden="true">
                  <div className="showcase__panel showcase__panel--main">
                    <div className="showcase__panel-head">
                      <span className="showcase__panel-title">
                        <Compass size={13} /> Teammate finder
                      </span>
                      <Badge variant="moss">28 builders</Badge>
                    </div>
                    <div className="showcase__panel-body">
                      <div className="showcase__filter-row">
                        <Chip variant="selected">React</Chip>
                        <Chip>Python</Chip>
                        <Chip>Figma</Chip>
                        <Chip>Available</Chip>
                      </div>
                      {SHOWCASE_CANDIDATES.map((candidate) => (
                        <div className="showcase__candidate" key={candidate.name}>
                          <Avatar name={candidate.name} size="sm" />
                          <div className="showcase__candidate-body">
                            <strong>{candidate.name}</strong>
                            <span>{candidate.meta}</span>
                            <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
                              {candidate.skills.map((skill) => (
                                <Chip key={skill} className="chip--moss">
                                  {skill}
                                </Chip>
                              ))}
                            </div>
                          </div>
                          <MatchRing value={candidate.score} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="showcase__panel showcase__panel--float">
                    <p className="showcase__float-title">Orbital Drift is one seat from whole.</p>
                    <p className="showcase__float-copy">
                      A designer and an ML engineer would close the loop before Friday.
                    </p>
                    <div className="showcase__float-stats">
                      <div className="showcase__float-stat">
                        <strong>3/4</strong>
                        <span>crew</span>
                      </div>
                      <div className="showcase__float-stat">
                        <strong>02</strong>
                        <span>roles open</span>
                      </div>
                      <div className="showcase__float-stat">
                        <strong>11d</strong>
                        <span>to deadline</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="container faq-preview">
            <div className="faq-preview__aside">
              <span className="eyebrow">Questions, answered</span>
              <h2 className="section-title" style={{ marginTop: 14 }}>
                The honest fine print.
              </h2>
              <p className="lede" style={{ marginTop: 14, fontSize: "0.92rem" }}>
                Privacy, match scores and what happens when a team fills. Short
                answers, no asterisks.
              </p>
              <Link className="faq-preview__link" to="/faq">
                Read the full FAQ <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div>
              <Accordion items={FAQ_PREVIEW} />
              <div style={{ marginTop: 24 }}>
                <Button to="/contact" variant="ghost" icon={<Sparkles />}>
                  Something else on your mind?
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="cta-band">
        <div className="container cta-band__inner">
          <div>
            <h2 className="cta-band__title">
              The weekend is coming. <em>Bring a crew.</em>
            </h2>
            <p className="cta-band__deck">
              Write the card, find the overlap, make the first move. The field guide
              is free and the door is open.
            </p>
          </div>
          <div className="cta-band__actions">
            <Button
              to={user ? "/dashboard" : "/auth?panel=register"}
              variant="primary"
              size="lg"
              iconRight={<ArrowRight />}
            >
              {user ? "Open your desk" : "Start building — free"}
            </Button>
            <Button to="/teams" variant="secondary" size="lg" icon={<Users />}>
              Browse teams
            </Button>
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingBlock: 20 }}>
        <div className="cluster" style={{ justifyContent: "space-between" }}>
          <span className="mono" style={{ color: "var(--faint)", fontSize: "0.55rem" }}>
            Field note · The best teams start with a small, specific yes.
          </span>
          <Link to="/legal/terms" className="mono" style={{ color: "var(--muted)", fontSize: "0.55rem" }}>
            Terms of the field guide <ChevronRight size={11} style={{ display: "inline" }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
