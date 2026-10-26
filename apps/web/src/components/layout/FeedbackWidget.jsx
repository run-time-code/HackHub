import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Bug, FileText, Lightbulb, MessageSquare, Send } from "lucide-react";
import Button from "../ui/Button";
import Dialog from "../ui/Dialog";
import { Field, Input, Textarea } from "../ui/Field";
import { submitFeedback } from "../../lib/api/platform";
import { errorMessage } from "../../lib/api/http";
import { useToast } from "../../providers/ToastProvider";
import { useConsent } from "../../providers/ConsentProvider";
import { useAuth } from "../../context/auth-context";
import { track } from "../../lib/analytics";

const TYPES = [
  { value: "general", label: "General note", icon: MessageSquare },
  { value: "bug", label: "Something broke", icon: Bug },
  { value: "feature", label: "An idea", icon: Lightbulb },
  { value: "content", label: "Content fix", icon: FileText },
];

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();
  const toast = useToast();
  const { showBanner } = useConsent();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => {
      track("feedback_submitted", { type });
      toast.success("Feedback landed", "A human reads every note. Thank you.");
      setOpen(false);
      setMessage("");
      setEmail("");
      setType("general");
      setError("");
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });

  if (location.pathname.startsWith("/auth") || location.pathname.startsWith("/onboarding")) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (message.trim().length < 8) {
      setError("Give us a little more context — at least 8 characters.");
      return;
    }
    mutation.mutate({
      type,
      message: message.trim(),
      page: `${location.pathname}${location.search || ""}`,
      email: user?.email ? undefined : email.trim() || undefined,
    });
  }

  return (
    <>
      <button
        type="button"
        className={`feedback-fab ${showBanner ? "is-raised" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
      >
        <MessageSquare aria-hidden="true" />
        <span>Feedback</span>
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tell us what you noticed"
        description="A bug, a rough edge, an idea. Every note goes to the builders."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="feedback-form"
              loading={mutation.isPending}
              icon={<Send />}
            >
              Send feedback
            </Button>
          </>
        }
      >
        <form className="feedback-form" id="feedback-form" onSubmit={handleSubmit}>
          <div className="feedback-types" role="group" aria-label="Feedback type">
            {TYPES.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.value}
                  type="button"
                  className={`feedback-type ${type === entry.value ? "is-selected" : ""}`}
                  onClick={() => setType(entry.value)}
                  aria-pressed={type === entry.value}
                >
                  <Icon aria-hidden="true" />
                  {entry.label}
                </button>
              );
            })}
          </div>

          <Field
            label="What happened?"
            htmlFor="feedback-message"
            error={error}
            hint={`${message.length}/1000 characters`}
          >
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value.slice(0, 1000));
                if (error) setError("");
              }}
              placeholder="The invite dialog closed twice when I…"
              maxLength={1000}
              required
            />
          </Field>

          {!user && (
            <Field
              label="Email"
              htmlFor="feedback-email"
              optional
              hint="Only if you would like a reply."
            >
              <Input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
          )}

          <div className="feedback-context">
            <FileText aria-hidden="true" />
            <span>Attached context: {location.pathname}</span>
          </div>
        </form>
      </Dialog>
    </>
  );
}
