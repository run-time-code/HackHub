let confettiPromise = null;

function loadConfetti() {
  if (!confettiPromise) {
    confettiPromise = import("canvas-confetti").then((module) => module.default);
  }
  return confettiPromise;
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
}

/**
 * A small, deliberate burst — paper confetti, not a casino. Skipped entirely
 * when the visitor asks for reduced motion.
 */
export async function celebrate() {
  if (prefersReducedMotion()) return;
  try {
    const confetti = await loadConfetti();
    confetti({
      particleCount: 54,
      spread: 64,
      startVelocity: 34,
      gravity: 0.9,
      scalar: 0.8,
      ticks: 160,
      origin: { x: 0.5, y: 0.62 },
      colors: ["#e8592e", "#d9f27a", "#2e5b44", "#fbfaf5"],
      disableForReducedMotion: true,
    });
  } catch {
    // Celebration is optional; never block the action that earned it.
  }
}
