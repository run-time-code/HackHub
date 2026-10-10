import { useState, useEffect } from "react";

const STORAGE_KEY = "hackhub_onboarding_progress";

// Persists partial onboarding answers to localStorage so a user who
// closes the tab mid-wizard picks up right where they left off.
export function useOnboardingProgress() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full or unavailable — non-critical, just skip persisting
    }
  }, [data]);

  function updateField(field, value) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function clearProgress() {
    localStorage.removeItem(STORAGE_KEY);
    setData({});
  }

  return { data, updateField, clearProgress };
}