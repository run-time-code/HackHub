import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Globe2,
  MapPin,
  Shuffle,
  Sparkles,
} from "lucide-react";
import Brand from "../layout/Brand";
import ThemeToggle from "../layout/ThemeToggle";
import Button from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { onboardingSchema } from "../../lib/validation/onboardingSchema";
import { saveOnboarding } from "../../lib/api/profile";
import { useOnboardingProgress } from "../../lib/hooks/useOnboardingProgress";
import SelectableChips from "./SelectableChips";

const SKILL_OPTIONS = [
  "JavaScript",
  "Python",
  "React",
  "Node.js",
  "UI/UX Design",
  "Machine Learning",
  "Data Science",
  "Java",
  "C++",
  "Mobile Dev",
];
const INTEREST_OPTIONS = [
  "Web Dev",
  "AI/ML",
  "Blockchain",
  "Cybersecurity",
  "IoT",
  "Fintech",
  "Healthtech",
  "Gaming",
  "Sustainability",
  "EdTech",
];
const STEPS = ["Skills", "Interests", "Mode", "Location"];
const STEP_CONTENT = [
  {
    chapter: "01 / Skills",
    title: "What do you bring to the table?",
    deck: "Choose the skills you want a team to know about. Honest, useful, and changeable later.",
  },
  {
    chapter: "02 / Interests",
    title: "What pulls you in?",
    deck: "Pick the problems and domains you would happily lose a weekend inside.",
  },
  {
    chapter: "03 / Mode",
    title: "Where do you do your best work?",
    deck: "We use this to surface rooms that fit the way you like to build.",
  },
  {
    chapter: "04 / Location",
    title: "Where are you building from?",
    deck: "A city or region is enough. It helps us show nearby rooms without pinning you to a map.",
  },
];
const MODES = [
  {
    value: "online",
    label: "Online",
    copy: "A room made of tabs, calls and time zones.",
    icon: Globe2,
  },
  {
    value: "offline",
    label: "In person",
    copy: "Same table, shared snacks, stronger momentum.",
    icon: MapPin,
  },
  {
    value: "hybrid",
    label: "Hybrid",
    copy: "A little of both, wherever the weekend lands.",
    icon: Shuffle,
  },
];

export default function OnboardingWizard({ userKey }) {
  const navigate = useNavigate();
  const { data, updateField, clearProgress } = useOnboardingProgress(userKey);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const skills = data.skills || [];
  const interests = data.interests || [];
  const preferredMode = data.preferredMode || "";
  const location = data.location || "";
  const content = STEP_CONTENT[step];

  function toggleSkill(skill) {
    updateField("skills", skills.includes(skill) ? skills.filter((s) => s !== skill) : [...skills, skill]);
  }

  function toggleInterest(interest) {
    updateField(
      "interests",
      interests.includes(interest) ? interests.filter((i) => i !== interest) : [...interests, interest]
    );
  }

  function validateCurrentStep() {
    setError(null);
    if (step === 0 && skills.length === 0) {
      setError("Pick at least one skill");
      return false;
    }
    if (step === 1 && interests.length === 0) {
      setError("Pick at least one interest");
      return false;
    }
    if (step === 2 && !preferredMode) {
      setError("Choose a preferred mode");
      return false;
    }
    if (step === 3 && location.trim().length < 2) {
      setError("Enter your location");
      return false;
    }
    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  }

  function handleBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function handleSkip() {
    // Skip entirely — no validation, just leave the wizard.
    // Progress already saved in localStorage in case they come back.
    navigate("/dashboard");
  }

  async function handleFinish() {
    const payload = { skills, interests, preferredMode, location };
    const parsed = onboardingSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please complete all fields");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveOnboarding(parsed.data);
      clearProgress();
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to save your preferences");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="onboarding page-enter">
      <header className="onboarding__top">
        <div className="container onboarding__top-inner">
          <Brand to="/dashboard" className="onboarding__brand" />
          <div className="onboarding__top-actions">
            <span className="onboarding__counter">
              {String(step + 1).padStart(2, "0")} / 04
            </span>
            <ThemeToggle compact />
            <button type="button" onClick={handleSkip} className="onboarding__skip">
              Skip for now <ArrowUpRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="onboarding__main container">
        <aside className="onboarding__rail">
          <span className="eyebrow eyebrow--plain">First entry / The field notes</span>
          <h2 className="onboarding__rail-title">
            A few notes before the room fills up.
          </h2>
          <p className="onboarding__rail-copy">
            Your card is not a résumé. It is a small, living record of what you
            want to make and who you want to make it with.
          </p>

          <div
            className="onboarding__steps"
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuetext={STEPS[step]}
            aria-valuemin="1"
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
          >
            {STEPS.map((label, index) => {
              const state = index < step ? "done" : index === step ? "active" : "next";
              return (
                <div
                  className={`onboarding__step is-${state}`}
                  key={label}
                  aria-current={index === step ? "step" : undefined}
                >
                  <span className="onboarding__step-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="onboarding__step-name">{label}</span>
                  <span className="onboarding__step-mark" aria-hidden="true">
                    {state === "done" ? <Check /> : <span />}
                  </span>
                </div>
              );
            })}
          </div>

          <blockquote className="onboarding__quote">
            <p>“Nobody arrives assembled. That is the point.”</p>
            <span>Field note · 00</span>
          </blockquote>
        </aside>

        <section className="onboarding__sheet" aria-labelledby="onboarding-title">
          <div className="onboarding__mobile-progress" aria-hidden="true">
            {STEPS.map((label, index) => (
              <span
                className={index <= step ? "is-filled" : ""}
                key={label}
              />
            ))}
          </div>

          <div className="onboarding__sheet-head">
            <div>
              <span className="eyebrow eyebrow--plain">
                <Sparkles aria-hidden="true" /> Field note {String(step + 1).padStart(2, "0")}
              </span>
              <h1 className="onboarding__sheet-title" id="onboarding-title">
                {content.title}
              </h1>
            </div>
            <span className="onboarding__chapter">{content.chapter}</span>
          </div>

          <p className="onboarding__deck">{content.deck}</p>

          {error && (
            <div className="alert alert--danger onboarding__alert" role="alert">
              <AlertCircle aria-hidden="true" />
              <div className="alert__body">
                <strong>One small thing.</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="onboarding__body" key={step}>
            {step === 0 && (
              <SelectableChips
                options={SKILL_OPTIONS}
                selected={skills}
                onToggle={toggleSkill}
                label="Select your skills"
              />
            )}

            {step === 1 && (
              <SelectableChips
                options={INTEREST_OPTIONS}
                selected={interests}
                onToggle={toggleInterest}
                label="Select your interests and domains"
              />
            )}

            {step === 2 && (
              <fieldset className="onboarding__modes">
                <legend className="sr-only">Preferred hackathon format</legend>
                {MODES.map((mode) => {
                  const Icon = mode.icon;
                  const selected = preferredMode === mode.value;
                  return (
                    <label
                      className={`onboarding-mode ${selected ? "is-selected" : ""}`}
                      key={mode.value}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value={mode.value}
                        checked={selected}
                        onChange={() => updateField("preferredMode", mode.value)}
                      />
                      <span className="onboarding-mode__top">
                        <span className="onboarding-mode__icon" aria-hidden="true">
                          <Icon />
                        </span>
                        <span className="onboarding-mode__radio" aria-hidden="true" />
                      </span>
                      <strong>{mode.label}</strong>
                      <span className="onboarding-mode__copy">{mode.copy}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            {step === 3 && (
              <Field
                label="Preferred city or region"
                htmlFor="onboarding-location"
                hint="Nearby only. You can change this from your card at any time."
                className="onboarding__location"
              >
                <Input
                  id="onboarding-location"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="City, Country"
                  value={location}
                  onChange={(event) => updateField("location", event.target.value)}
                />
              </Field>
            )}
          </div>

          <div className="onboarding__actions">
            {step > 0 ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                icon={<ArrowLeft aria-hidden="true" />}
              >
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button
              variant="primary"
              onClick={handleNext}
              loading={isSaving}
              disabled={isSaving}
              iconRight={<ArrowRight aria-hidden="true" />}
            >
              {step === STEPS.length - 1 ? "Finish and enter" : "Continue"}
            </Button>
          </div>
        </section>
      </main>

      <footer className="onboarding__foot">
        <div className="container onboarding__foot-inner">
          <span>HackHub · The builder&apos;s field guide</span>
          <span>Progress saved on this browser</span>
        </div>
      </footer>
    </div>
  );
}
