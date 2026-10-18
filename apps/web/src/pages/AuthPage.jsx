import { useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import ForgotPasswordForm from "../components/auth/ForgotPasswordForm";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import ResetPasswordForm from "../components/auth/ResetPasswordForm";
import VerifyEmail from "./auth/VerifyEmail";

const PANELS = {
  login: "login",
  register: "register",
  forgot: "forgot",
  reset: "reset",
  verify: "verify",
  "verify-pending": "verify",
};

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const panel = PANELS[searchParams.get("panel")] || "login";

  let content;
  if (panel === "register") content = <RegisterForm />;
  else if (panel === "forgot") content = <ForgotPasswordForm />;
  else if (panel === "reset") content = <ResetPasswordForm />;
  else if (panel === "verify") content = <VerifyEmail />;
  else content = <LoginForm />;

  return (
    <AuthLayout panel={panel}>
      {content}
    </AuthLayout>
  );
}
