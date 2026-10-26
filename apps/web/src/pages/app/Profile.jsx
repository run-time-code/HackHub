import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ExternalLink,
  Eye,
  Globe,
  Link2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Badge, { Chip } from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import Switch from "../../components/ui/Switch";
import { Field, Input, Textarea } from "../../components/ui/Field";
import AvatarUploader from "../../components/profile/AvatarUploader";
import SkillPicker from "../../components/profile/SkillPicker";
import {
  getMyProfile,
  getSkillTaxonomy,
  updateMyProfile,
  updateMySkills,
} from "../../lib/api/users";
import { queryKeys } from "../../lib/queryClient";
import { errorMessage } from "../../lib/api/http";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../providers/ToastProvider";
import { track } from "../../lib/analytics";
import { useDocumentTitle } from "../../lib/hooks/useDocumentTitle";

const URL_PATTERN = /^https?:\/\/[^\s.]+\.[^\s]+$/i;

const COMPLETION_ITEMS = [
  { key: "identity", label: "Name and headline", weight: 1 },
  { key: "portrait", label: "A portrait", weight: 1 },
  { key: "story", label: "A short bio (40+ chars)", weight: 1 },
  { key: "skills", label: "At least 3 skills", weight: 1 },
  { key: "links", label: "One working link", weight: 1 },
  { key: "history", label: "One past build", weight: 1 },
];

function buildForm(profile) {
  return {
    name: profile.name || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    college: profile.college || "",
    year: profile.year || "",
    location: profile.location || "",
    avatarUrl: profile.avatarUrl || "",
    links: {
      github: profile.links?.github || "",
      linkedin: profile.links?.linkedin || "",
      portfolio: profile.links?.portfolio || "",
    },
    pastHackathons:
      profile.pastHackathons?.length > 0
        ? profile.pastHackathons
        : [{ name: "", year: "", projectUrl: "" }],
    availability: profile.availability || "available",
    lookingForTeam: Boolean(profile.lookingForTeam),
    discoverable: Boolean(profile.discoverable),
    preferences: {
      ...profile.preferences,
      interests: Array.isArray(profile.preferences?.interests)
        ? profile.preferences.interests
        : [],
    },
  };
}

function completenessOf(form, skills) {
  const done = {
    identity: Boolean(form.name.trim() && form.headline.trim()),
    portrait: Boolean(form.avatarUrl),
    story: form.bio.trim().length >= 40,
    skills: skills.length >= 3,
    links: Object.values(form.links).some((value) => URL_PATTERN.test(value || "")),
    history: form.pastHackathons.some((entry) => entry.name?.trim()),
  };
  const total = COMPLETION_ITEMS.reduce((sum, item) => sum + item.weight, 0);
  const score = COMPLETION_ITEMS.reduce(
    (sum, item) => sum + (done[item.key] ? item.weight : 0),
    0
  );
  return { done, percent: Math.round((score / total) * 100) };
}

function validateForm(form, skills) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = "Give us a name of at least 2 characters.";
  if (form.name.trim().length > 80) errors.name = "Keep your name under 80 characters.";
  if (form.headline.length > 120) errors.headline = "Headlines stop at 120 characters.";
  if (form.bio.length > 500) errors.bio = "The bio has a 500 character limit.";
  for (const [key, value] of Object.entries(form.links)) {
    if (value && !URL_PATTERN.test(value)) {
      errors[`link-${key}`] = "Use a full URL starting with https://";
    }
  }
  form.pastHackathons.forEach((entry, index) => {
    if (entry.projectUrl && !URL_PATTERN.test(entry.projectUrl)) {
      errors[`history-${index}`] = "Project links need a full https:// URL.";
    }
    if (entry.year && !/^\d{4}$/.test(String(entry.year))) {
      errors[`history-year-${index}`] = "Use a four-digit year.";
    }
  });
  if (skills.length > 10) errors.skills = "Ten skills is the ceiling.";
  return errors;
}

export default function Profile() {
  useDocumentTitle(
    "Your builder card",
    "Edit the card that introduces you to every future teammate."
  );
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { updateUser } = useAuth();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => getMyProfile(),
  });
  const taxonomyQuery = useQuery({
    queryKey: queryKeys.skills,
    queryFn: () => getSkillTaxonomy(),
    staleTime: 30 * 60_000,
  });

  const [form, setForm] = useState(null);
  const [skills, setSkills] = useState([]);
  const [proficiency, setProficiency] = useState({});
  const [snapshot, setSnapshot] = useState("");
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!profileQuery.data || initialized.current) return;
    const nextForm = buildForm(profileQuery.data);
    const nextSkills = profileQuery.data.skills || [];
    const nextProficiency = profileQuery.data.skillProficiency || {};
    setForm(nextForm);
    setSkills(nextSkills);
    setProficiency(nextProficiency);
    setSnapshot(JSON.stringify({ form: nextForm, skills: nextSkills, proficiency: nextProficiency }));
    initialized.current = true;
  }, [profileQuery.data]);

  useEffect(() => {
    if (!location.hash || !form) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, form]);

  const dirty = useMemo(() => {
    if (!form) return false;
    return JSON.stringify({ form, skills, proficiency }) !== snapshot;
  }, [form, skills, proficiency, snapshot]);

  useEffect(() => {
    if (!dirty) return undefined;
    function beforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const completion = useMemo(
    () => (form ? completenessOf(form, skills) : { done: {}, percent: 0 }),
    [form, skills]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const values = {
        ...form,
        name: form.name.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        college: form.college.trim(),
        year: typeof form.year === "string" ? form.year.trim() : form.year,
        location: form.location.trim(),
        links: {
          github: form.links.github.trim(),
          linkedin: form.links.linkedin.trim(),
          portfolio: form.links.portfolio.trim(),
        },
        pastHackathons: form.pastHackathons
          .filter((entry) => entry.name.trim())
          .map((entry) => ({
            name: entry.name.trim(),
            year: String(entry.year || "").trim(),
            projectUrl: entry.projectUrl.trim(),
          })),
        skillProficiency: proficiency,
        preferences: form.preferences,
        availability: form.availability,
        lookingForTeam: form.lookingForTeam,
        discoverable: form.discoverable,
      };
      const savedProfile = await updateMyProfile(values);
      const savedSkills = await updateMySkills(skills);
      return { profile: savedProfile, skills: savedSkills };
    },
    onSuccess: ({ profile, skills: savedSkills }) => {
      const nextForm = buildForm(profile);
      const nextSkills = Array.isArray(savedSkills) && savedSkills.length ? savedSkills : profile.skills || skills;
      const nextProficiency = profile.skillProficiency || proficiency;
      setForm(nextForm);
      setSkills(nextSkills);
      setProficiency(nextProficiency);
      setSnapshot(
        JSON.stringify({ form: nextForm, skills: nextSkills, proficiency: nextProficiency })
      );
      queryClient.setQueryData(queryKeys.profile, profile);
      updateUser({
        name: nextForm.name,
        avatarUrl: nextForm.avatarUrl,
        headline: nextForm.headline,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
      toast.success("Card saved", "Your public profile is up to date.");
      if (completenessOf(nextForm, nextSkills).percent === 100) {
        track("profile_completed", { percent: 100 });
      }
      track("profile_updated", { skills: nextSkills.length });
    },
    onError: (error) => {
      setErrors({ form: errorMessage(error, "The card did not save. Try again.") });
      toast.error("Could not save your card", errorMessage(error));
    },
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateLink(key, value) {
    setForm((current) => ({ ...current, links: { ...current.links, [key]: value } }));
    setErrors((current) => {
      const next = { ...current };
      delete next[`link-${key}`];
      return next;
    });
  }

  function updateHistory(index, field, value) {
    setForm((current) => {
      const entries = current.pastHackathons.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      );
      return { ...current, pastHackathons: entries };
    });
  }

  function addHistory() {
    setForm((current) => ({
      ...current,
      pastHackathons: [...current.pastHackathons, { name: "", year: "", projectUrl: "" }],
    }));
  }

  function removeHistory(index) {
    setForm((current) => ({
      ...current,
      pastHackathons:
        current.pastHackathons.length === 1
          ? [{ name: "", year: "", projectUrl: "" }]
          : current.pastHackathons.filter((_, entryIndex) => entryIndex !== index),
    }));
  }

  function handleAvatarChange(url) {
    setForm((current) => ({ ...current, avatarUrl: url }));
    setSnapshot((current) => {
      if (!current) return current;
      try {
        const parsed = JSON.parse(current);
        parsed.form.avatarUrl = url;
        return JSON.stringify(parsed);
      } catch {
        return current;
      }
    });
  }

  function handleSubmit(event) {
    event?.preventDefault();
    const nextErrors = validateForm(form, skills);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const first = Object.keys(nextErrors)[0];
      const fieldId = first.startsWith("link-")
        ? `profile-${first.replace("link-", "")}`
        : first.startsWith("history-year-")
          ? `history-year-${first.split("-").pop()}`
          : first.startsWith("history-")
            ? `history-link-${first.split("-").pop()}`
            : first === "form"
              ? "profile-name"
              : `profile-${first}`;
      document.getElementById(fieldId)?.focus();
      return;
    }
    mutation.mutate();
  }

  if (profileQuery.isLoading || !form) {
    return (
      <div className="page-enter" aria-busy="true">
        <div className="page-head">
          <div className="page-head__copy">
            <span className="skeleton skeleton--text" style={{ width: 100 }} />
            <span className="skeleton skeleton--title" style={{ width: 320, height: 54 }} />
          </div>
        </div>
        <div className="profile-layout">
          <div className="stack" style={{ gap: 16 }}>
            {[1, 2, 3].map((item) => (
              <div className="skeleton skeleton--card" key={item} style={{ height: 220 }} />
            ))}
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="skeleton skeleton--card" style={{ height: 330 }} />
            <div className="skeleton skeleton--card" style={{ height: 180 }} />
          </div>
        </div>
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="empty page-enter">
        <span className="empty__art">
          <AlertCircle />
        </span>
        <h2 className="empty__title">Your card did not open.</h2>
        <p className="empty__copy">{errorMessage(profileQuery.error, "Check your connection and try again.")}</p>
        <div className="empty__actions">
          <Button variant="primary" onClick={() => profileQuery.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const profileId = profileQuery.data.id;
  const atLimit = skills.length >= 10;

  return (
    <div className="page-enter">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Your builder card · 05</span>
          <h1 className="page-head__title">
            The card that opens <em>doors.</em>
          </h1>
          <p className="page-head__deck">
            {completion.percent === 100
              ? "Complete. Show it to the next teammate who needs exactly what you bring."
              : "Six small pieces. The better the card, the better the introductions it earns."}
          </p>
        </div>
        <div className="page-head__actions">
          <Button
            to={`/u/${profileId}`}
            variant="secondary"
            icon={<Eye />}
            aria-label="View your public profile"
          >
            View public
          </Button>
          <Button
            variant="primary"
            icon={saved ? <Check /> : <Save />}
            onClick={handleSubmit}
            loading={mutation.isPending}
            disabled={!dirty && !saved}
          >
            {mutation.isPending ? "Saving…" : saved ? "Saved" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="alert alert--warning" role="status" style={{ marginBottom: 20 }}>
          <AlertCircle aria-hidden="true" />
          <div className="alert__body">
            <strong>Unsaved field notes.</strong>
            <p>Your changes are only on this screen until you save the card.</p>
          </div>
          <Button size="sm" variant="primary" className="alert__action" onClick={handleSubmit} loading={mutation.isPending}>
            Save now
          </Button>
        </div>
      )}

      {errors.form && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: 20 }}>
          <AlertCircle aria-hidden="true" />
          <div className="alert__body">
            <strong>Save interrupted.</strong>
            <p>{errors.form}</p>
          </div>
        </div>
      )}

      <div className="profile-layout">
        <form className="profile-form" onSubmit={handleSubmit} noValidate>
          <section className="profile-section">
            <div className="profile-section__head">
              <div>
                <h2 className="profile-section__title">
                  <span>01</span> Identity
                </h2>
                <p className="profile-section__copy">
                  How you introduce yourself in a hallway, condensed into a card.
                </p>
              </div>
              <Badge variant={completion.done.identity ? "moss" : "outline"}>
                {completion.done.identity ? "Started" : "Required"}
              </Badge>
            </div>
            <div className="profile-section__body">
              <AvatarUploader
                name={form.name}
                avatarUrl={form.avatarUrl}
                onUploaded={handleAvatarChange}
                disabled={mutation.isPending}
              />

              <div className="form-grid">
                <Field label="Name" htmlFor="profile-name" error={errors.name}>
                  <Input
                    id="profile-name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Aarav Mehta"
                    autoComplete="name"
                    maxLength={80}
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>
                <Field label="Headline" htmlFor="profile-headline" error={errors.headline} hint="One line. What do you do?">
                  <Input
                    id="profile-headline"
                    value={form.headline}
                    onChange={(event) => update("headline", event.target.value)}
                    placeholder="Frontend engineer · design systems"
                    maxLength={120}
                    aria-invalid={Boolean(errors.headline)}
                  />
                </Field>
                <Field
                  label="Bio"
                  htmlFor="profile-bio"
                  className="form-grid--full"
                  error={errors.bio}
                  hint={`${form.bio.length}/500 characters · what you build and how you work`}
                >
                  <Textarea
                    id="profile-bio"
                    value={form.bio}
                    onChange={(event) => update("bio", event.target.value.slice(0, 500))}
                    placeholder="I build the part people touch. Most recently a mapping tool for campus accessibility. Looking for teams that ship something real in a weekend."
                    maxLength={500}
                  />
                </Field>
                <Field label="College" htmlFor="profile-college" hint="Or where you are learning instead.">
                  <Input
                    id="profile-college"
                    value={form.college}
                    onChange={(event) => update("college", event.target.value)}
                    placeholder="VIT Vellore"
                    maxLength={120}
                  />
                </Field>
                <Field label="Year" htmlFor="profile-year">
                  <Input
                    id="profile-year"
                    value={form.year}
                    onChange={(event) => update("year", event.target.value)}
                    placeholder="Third year"
                    maxLength={40}
                  />
                </Field>
                <Field label="Location" htmlFor="profile-location" className="form-grid--full">
                  <Input
                    id="profile-location"
                    value={form.location}
                    onChange={(event) => update("location", event.target.value)}
                    placeholder="Chennai, India"
                    maxLength={120}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="profile-section" id="skills">
            <div className="profile-section__head">
              <div>
                <h2 className="profile-section__title">
                  <span>02</span> Skills, honestly
                </h2>
                <p className="profile-section__copy">
                  Up to ten. Proficiency is a signal, not a scoreboard — pick the level
                  you would defend in a code review.
                </p>
              </div>
              <Badge variant={skills.length >= 3 ? "moss" : "outline"}>{skills.length}/10</Badge>
            </div>
            <div className="profile-section__body">
              <SkillPicker
                taxonomy={taxonomyQuery.data || {}}
                selected={skills}
                proficiency={proficiency}
                onChange={(nextSkills, nextProficiency) => {
                  setSkills(nextSkills);
                  setProficiency(nextProficiency);
                }}
                disabled={mutation.isPending}
              />
              {atLimit && (
                <p className="field__hint">
                  Ten is the ceiling. Remove one to add another — the finder weighs
                  every skill you list.
                </p>
              )}
              {errors.skills && <p className="field__error">{errors.skills}</p>}
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section__head">
              <div>
                <h2 className="profile-section__title">
                  <span>03</span> Links &amp; proof
                </h2>
                <p className="profile-section__copy">
                  Let people see the work. These open in a new tab from your card.
                </p>
              </div>
              <Badge variant={completion.done.links ? "moss" : "outline"}>
                {Object.values(form.links).filter(Boolean).length} added
              </Badge>
            </div>
            <div className="profile-section__body">
              <div className="form-grid">
                <Field label="GitHub" htmlFor="profile-github" error={errors["link-github"]}>
                  <div className="input-group">
                    <Link2 aria-hidden="true" />
                    <Input
                      id="profile-github"
                      value={form.links.github}
                      onChange={(event) => updateLink("github", event.target.value)}
                      placeholder="https://github.com/aarav"
                      inputMode="url"
                    />
                  </div>
                </Field>
                <Field label="LinkedIn" htmlFor="profile-linkedin" error={errors["link-linkedin"]}>
                  <div className="input-group">
                    <Link2 aria-hidden="true" />
                    <Input
                      id="profile-linkedin"
                      value={form.links.linkedin}
                      onChange={(event) => updateLink("linkedin", event.target.value)}
                      placeholder="https://linkedin.com/in/aarav"
                      inputMode="url"
                    />
                  </div>
                </Field>
                <Field
                  label="Portfolio"
                  htmlFor="profile-portfolio"
                  className="form-grid--full"
                  error={errors["link-portfolio"]}
                >
                  <div className="input-group">
                    <Globe aria-hidden="true" />
                    <Input
                      id="profile-portfolio"
                      value={form.links.portfolio}
                      onChange={(event) => updateLink("portfolio", event.target.value)}
                      placeholder="https://aarav.design"
                      inputMode="url"
                    />
                  </div>
                </Field>
              </div>
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section__head">
              <div>
                <h2 className="profile-section__title">
                  <span>04</span> Past builds
                </h2>
                <p className="profile-section__copy">
                  Hackathons, side projects, the thing you shipped at 4am. Add up to
                  six.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus />}
                onClick={addHistory}
                disabled={form.pastHackathons.length >= 6}
              >
                Add a build
              </Button>
            </div>
            <div className="profile-section__body">
              {form.pastHackathons.map((entry, index) => (
                <div className="repeat-row" key={index}>
                  <Field label="Hackathon or project" htmlFor={`history-name-${index}`}>
                    <Input
                      id={`history-name-${index}`}
                      value={entry.name}
                      onChange={(event) => updateHistory(index, "name", event.target.value)}
                      placeholder="NASA Space Apps"
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Year" htmlFor={`history-year-${index}`} error={errors[`history-year-${index}`]}>
                    <Input
                      id={`history-year-${index}`}
                      value={entry.year}
                      onChange={(event) => updateHistory(index, "year", event.target.value)}
                      placeholder="2025"
                      inputMode="numeric"
                      maxLength={4}
                      aria-invalid={Boolean(errors[`history-year-${index}`])}
                    />
                  </Field>
                  <Field label="Project URL" htmlFor={`history-link-${index}`} error={errors[`history-${index}`]}>
                    <Input
                      id={`history-link-${index}`}
                      value={entry.projectUrl}
                      onChange={(event) => updateHistory(index, "projectUrl", event.target.value)}
                      placeholder="https://devpost.com/…"
                      inputMode="url"
                      aria-invalid={Boolean(errors[`history-${index}`])}
                    />
                  </Field>
                  <button
                    type="button"
                    className="repeat-row__remove"
                    onClick={() => removeHistory(index)}
                    aria-label={`Remove build ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="profile-section" id="availability">
            <div className="profile-section__head">
              <div>
                <h2 className="profile-section__title">
                  <span>05</span> Availability
                </h2>
                <p className="profile-section__copy">
                  The finder filters on this. Honest beats optimistic.
                </p>
              </div>
            </div>
            <div className="profile-section__body">
              <div className="segmented" role="group" aria-label="Availability">
                {[
                  { value: "available", label: "Available" },
                  { value: "limited", label: "Limited" },
                  { value: "unavailable", label: "Not now" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="segmented__item"
                    aria-pressed={form.availability === option.value}
                    onClick={() => update("availability", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="toggle-row">
                <div className="toggle-row__copy">
                  <strong>Looking for a team</strong>
                  <p>Show me in the finder for current and upcoming hackathons.</p>
                </div>
                <Switch
                  checked={form.lookingForTeam}
                  onCheckedChange={(checked) => update("lookingForTeam", checked)}
                  aria-label="Looking for a team"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-row__copy">
                  <strong>Discoverable in the finder</strong>
                  <p>
                    Only signed-in builders can find you. Your email is never shown.
                    Discovery is opt-in and can be switched off here at any time.
                  </p>
                </div>
                <Switch
                  checked={form.discoverable}
                  onCheckedChange={(checked) => update("discoverable", checked)}
                  aria-label="Discoverable in the finder"
                />
              </div>

              {!form.discoverable && (
                <div className="alert alert--info">
                  <Globe aria-hidden="true" />
                  <div className="alert__body">
                    <strong>You are invisible to the finder.</strong>
                    <p>
                      Turn discovery on when you want invitations. Your profile link
                      still works for people you share it with.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="cluster" style={{ justifyContent: "flex-end" }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!profileQuery.data) return;
                const nextForm = buildForm(profileQuery.data);
                const nextSkills = profileQuery.data.skills || [];
                const nextProficiency = profileQuery.data.skillProficiency || {};
                setForm(nextForm);
                setSkills(nextSkills);
                setProficiency(nextProficiency);
                setErrors({});
              }}
              disabled={!dirty}
            >
              Discard changes
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={saved ? <Check /> : <Save />}
              loading={mutation.isPending}
            >
              {saved ? "Saved" : "Save the card"}
            </Button>
          </div>
        </form>

        <aside className="profile-sidebar">
          <div className="completeness-card">
            <div className="completeness-card__head">
              <div className="completeness-card__value">
                {completion.percent}
                <small>%</small>
              </div>
              <div className="stack" style={{ gap: 6, flex: 1 }}>
                <strong style={{ fontSize: "0.82rem" }}>Card completeness</strong>
                <div className="progress">
                  <div
                    className="progress__bar"
                    style={{ width: `${completion.percent}%`, background: completion.percent === 100 ? "var(--moss)" : "var(--signal)" }}
                  />
                </div>
              </div>
            </div>
            <div className="completeness-card__list">
              {COMPLETION_ITEMS.map((item) => {
                const done = completion.done[item.key];
                return (
                  <div
                    className={`completeness-card__item ${done ? "is-done" : ""}`}
                    key={item.key}
                  >
                    <span className="completeness-card__tick">
                      {done && <Check aria-hidden="true" />}
                    </span>
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="profile-preview">
            <div className="profile-preview__cover" aria-hidden="true" />
            <div className="profile-preview__body">
              <div className="profile-preview__avatar">
                <Avatar src={form.avatarUrl} name={form.name} size="lg" ring />
              </div>
              <h2 className="profile-preview__name">{form.name || "Your name"}</h2>
              <p className="profile-preview__headline">
                {form.headline || "Your headline — one line about the work."}
              </p>
              <div className="profile-preview__meta">
                {form.college && <span>{form.college}</span>}
                {form.year && <span>{form.year}</span>}
                {form.location && <span>{form.location}</span>}
              </div>
              <div className="profile-preview__skills">
                {skills.slice(0, 6).map((skill) => (
                  <Chip key={skill} dot={proficiency[skill] || "intermediate"}>
                    {skill}
                  </Chip>
                ))}
                {skills.length > 6 && <Chip>+{skills.length - 6}</Chip>}
                {skills.length === 0 && (
                  <span className="field__hint">Skills appear here as you add them.</span>
                )}
              </div>
              <div className="profile-preview__actions">
                <Button to={`/u/${profileId}`} size="sm" variant="secondary" icon={<ExternalLink />}>
                  Preview
                </Button>
                <Button size="sm" variant="primary" onClick={handleSubmit} loading={mutation.isPending}>
                  Save
                </Button>
              </div>
            </div>
          </div>

          <div className="profile-tip">
            <strong>Field note</strong>
            A specific headline beats a broad one. &ldquo;I build accessible data
            interfaces&rdquo; travels further than &ldquo;full-stack developer&rdquo;.
          </div>

          <div className="card card--flat">
            <div className="card__kicker">
              <Sparkles size={13} /> Privacy, plainly
            </div>
            <p style={{ marginTop: 8, color: "var(--muted)", fontSize: "0.76rem", lineHeight: 1.6 }}>
              Your email and account details never appear on a public card. Discovery
              is opt-in, and turning it off removes you from the finder immediately.
            </p>
            <Link className="inline-link" to="/legal/privacy" style={{ display: "inline-block", marginTop: 10, fontSize: "0.74rem" }}>
              Read the privacy note <ArrowUpRight size={12} style={{ display: "inline" }} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
