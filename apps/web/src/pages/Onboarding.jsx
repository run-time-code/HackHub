import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import { useAuth } from "../context/auth-context";

export default function Onboarding() {
  const { user } = useAuth();
  const userKey = user?._id || user?.id || user?.email || "current-user";
  return <OnboardingWizard key={userKey} userKey={userKey} />;
}