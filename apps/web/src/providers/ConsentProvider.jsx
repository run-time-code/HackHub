import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Cookie, LockKeyhole } from "lucide-react";
import Dialog from "../components/ui/Dialog";
import Switch from "../components/ui/Switch";
import Button from "../components/ui/Button";
import {
  readConsent,
  setAnalyticsConsent,
  writeConsent,
} from "../lib/analytics";

const ConsentContext = createContext(null);

export function ConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => readConsent());
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draftAnalytics, setDraftAnalytics] = useState(consent.analytics);

  useEffect(() => {
    setAnalyticsConsent(consent.analytics);
  }, [consent.analytics]);

  function save(nextAnalytics) {
    const saved = writeConsent({ analytics: nextAnalytics });
    setConsent(saved);
    setAnalyticsConsent(saved.analytics);
    setPreferencesOpen(false);
  }

  const value = useMemo(
    () => ({
      decided: consent.decided,
      analytics: consent.analytics,
      openPreferences() {
        setDraftAnalytics(consent.analytics);
        setPreferencesOpen(true);
      },
      closePreferences() {
        setPreferencesOpen(false);
      },
      acceptAll() {
        save(true);
      },
      essentialOnly() {
        save(false);
      },
      savePreferences() {
        save(draftAnalytics);
      },
      preferencesOpen,
      draftAnalytics,
      setDraftAnalytics,
      showBanner: !consent.decided && !preferencesOpen,
    }),
    [consent, preferencesOpen, draftAnalytics]
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}

      {value.showBanner && (
        <div
          className="cookie-banner"
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-banner-title"
        >
          <div className="cookie-banner__head">
            <div>
              <div className="cookie-banner__title" id="cookie-banner-title">
                <Cookie aria-hidden="true" />
                A short note on cookies
              </div>
              <p className="cookie-banner__copy">
                Essential cookies keep you signed in. With your permission we also
                measure which parts of the field guide are useful.{" "}
                <a href="/legal/privacy">Privacy</a>
              </p>
            </div>
          </div>
          <div className="cookie-banner__actions">
            <Button size="sm" variant="primary" onClick={value.acceptAll}>
              Accept all
            </Button>
            <Button size="sm" variant="secondary" onClick={value.essentialOnly}>
              Essential only
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraftAnalytics(consent.analytics);
                setPreferencesOpen(true);
              }}
            >
              Preferences
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        title="Cookie preferences"
        description="Choose what HackHub may measure. You can change this at any time from the footer."
        footer={
          <>
            <Button variant="ghost" onClick={value.essentialOnly}>
              Essential only
            </Button>
            <Button variant="primary" onClick={value.savePreferences}>
              Save preferences
            </Button>
          </>
        }
      >
        <div>
          <div className="consent-purpose">
            <div className="consent-purpose__copy">
              <strong>Essential</strong>
              <p>Session, security and CSRF cookies. The product cannot work without them.</p>
            </div>
            <span className="consent-purpose__locked">
              <LockKeyhole aria-hidden="true" /> Always on
            </span>
          </div>
          <div className="consent-purpose">
            <div className="consent-purpose__copy">
              <strong>Analytics</strong>
              <p>
                Anonymous product events — pages visited, teams created, requests
                accepted. No advertising profiles, ever.
              </p>
            </div>
            <Switch
              checked={draftAnalytics}
              onCheckedChange={setDraftAnalytics}
              aria-label="Analytics cookies"
            />
          </div>
        </div>
      </Dialog>
    </ConsentContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook colocated with its provider
export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) throw new Error("useConsent must be used inside ConsentProvider");
  return context;
}
