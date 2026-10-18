import { useState, useEffect } from "react";

export function useOnboardingProgress(userKey) {
  const storageKey = `hackhub_onboarding_progress:${encodeURIComponent(userKey)}`;
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return {
        skills: Array.isArray(parsed.skills) ? parsed.skills.filter((item) => typeof item === "string") : [],
        interests: Array.isArray(parsed.interests) ? parsed.interests.filter((item) => typeof item === "string") : [],
        preferredMode: ["online", "offline", "hybrid"].includes(parsed.preferredMode) ? parsed.preferredMode : "",
        location: typeof parsed.location === "string" ? parsed.location : "",
      };
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // Preference drafts are still usable in memory when browser storage is unavailable.
    }
  }, [data, storageKey]);

  function updateField(field, value) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function clearProgress() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // The server save has already succeeded; clearing this optional draft must not undo it.
    }
    setData({});
  }

  return { data, updateField, clearProgress };
}