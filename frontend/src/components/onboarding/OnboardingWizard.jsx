import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { onboardingSchema } from "../../lib/validation/onboardingSchema";
import { saveOnboarding } from "../../lib/api/profile";
import { useOnboardingProgress } from "../../lib/hooks/useOnboardingProgress";
import SelectableChips from "./SelectableChips";

const SKILL_OPTIONS = [
  "JavaScript", "Python", "React", "Node.js", "UI/UX Design",
  "Machine Learning", "Data Science", "Java", "C++", "Mobile Dev",
];
const INTEREST_OPTIONS = [
  "Web Dev", "AI/ML", "Blockchain", "Cybersecurity", "IoT",
  "Fintech", "Healthtech", "Gaming", "Sustainability", "EdTech",
];
const STEPS = ["Skills", "Interests", "Mode", "Location"];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { data, updateField, clearProgress } = useOnboardingProgress();
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const skills = data.skills || [];
  const interests = data.interests || [];
  const preferredMode = data.preferredMode || "";
  const location = data.location || "";

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
    if (step === 0 && skills.length === 0) return setError("Pick at least one skill"), false;
    if (step === 1 && interests.length === 0) return setError("Pick at least one interest"), false;
    if (step === 2 && !preferredMode) return setError("Choose a preferred mode"), false;
    if (step === 3 && location.trim().length < 2) return setError("Enter your location"), false;
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
      await saveOnboarding(payload);
      clearProgress();
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to save your preferences");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-6 flex gap-2">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-blue-600" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              {STEPS[step]} <span className="text-sm font-normal text-gray-400">({step + 1}/{STEPS.length})</span>
            </h1>
            <button type="button" onClick={handleSkip} className="text-sm text-gray-500 hover:text-gray-700">
              Skip for now
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 0 && (
            <SelectableChips options={SKILL_OPTIONS} selected={skills} onToggle={toggleSkill} />
          )}

          {step === 1 && (
            <SelectableChips options={INTEREST_OPTIONS} selected={interests} onToggle={toggleInterest} />
          )}

          {step === 2 && (
            <div className="flex flex-col gap-2">
              {["online", "offline", "hybrid"].map((mode) => (
                <label
                  key={mode}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm capitalize ${
                    preferredMode === mode ? "border-blue-600 bg-blue-50" : "border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={mode}
                    checked={preferredMode === mode}
                    onChange={() => updateField("preferredMode", mode)}
                    className="accent-blue-600"
                  />
                  {mode}
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <input
              type="text"
              placeholder="City, Country"
              value={location}
              onChange={(e) => updateField("location", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 disabled:opacity-0"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : step === STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 