import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bug,
  Clock3,
  Code2,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ContentHero from "../components/content/ContentHero";
import Button from "../components/ui/Button";
import { Field, Input, Select, Textarea } from "../components/ui/Field";
import { submitFeedback } from "../lib/api/platform";
import { errorMessage } from "../lib/api/http";
import { useAuth } from "../context/auth-context";
import { useDocumentTitle } from "../lib/hooks/useDocumentTitle";
import { useToast } from "../providers/ToastProvider";
import { track } from "../lib/analytics";

const TOPICS = [
  { value: "general", label: "A general question" },
  { value: "bug", label: "Something broke" },
  { value: "feature", label: "An idea for the guide" },
  { value: "content", label: "A content correction" },
];

const INITIAL = {
  name: "",
  email: "",
  topic: "general",
  subject: "",
  message: "",
};

export default function Contact() {
  useDocumentTitle("Contact");
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => {
      track("contact_submitted", { kind: form.topic });
      setSent(true);
      setForm(INITIAL);
      setErrors({});
      toast.success("Your note landed", "A human reads every message. Thank you.");
    },
    onError: (error) => {
      setErrors({ form: errorMessage(error) });
    },
  });

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field] || errors.form) {
      setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    }
    if (sent) setSent(false);
  }

  function validate() {
    const next = {};
    if (!user && form.name.trim().length < 2) {
      next.name = "Tell us what to call you.";
    }
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "A valid email lets us reply.";
    }
    if (form.subject.trim().length > 120) {
      next.subject = "Keep the subject under 120 characters.";
    }
    if (form.message.trim().length < 20) {
      next.message = "Give us at least 20 characters of context.";
    }
    if (form.message.trim().length > 1500) {
      next.message = "Keep the message under 1,500 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const topicLabel = TOPICS.find((entry) => entry.value === form.topic)?.label || "Note";
    const message = [
      `[${topicLabel}]${form.subject.trim() ? ` ${form.subject.trim()}` : ""}`,
      "",
      form.message.trim(),
      !user && form.name.trim() ? `\n\nFrom: ${form.name.trim()}` : "",
    ].join("\n");

    mutation.mutate({
      type: form.topic,
      message,
      page: "/contact",
      email: user ? undefined : form.email.trim(),
    });
  }

  return (
    <>
      <ContentHero
        eyebrow="Help · Contact"
        title="A human is on the other end."
        deck="Whether something broke, a page reads wrong or you have an idea that would make the field guide more useful, write it down here. No ticket maze, no chatbot loop."
        meta={["Replies on weekdays", "Safety reports read first", "No marketing list"]}
        aside={
          <>
            <div className="faq-aside__card">
              <h3>Before you send</h3>
              <p>
                Include the page, what you expected and what happened instead. For a bug, the browser
                and the step that broke it save us a round trip.
              </p>
            </div>
            <div className="faq-aside__card">
              <h3>Safety first</h3>
              <p>
                If someone is at risk, write to{" "}
                <a href="mailto:safety@hackhub.build">safety@hackhub.build</a> and mark the note
                urgent. Do not wait for a normal product reply.
              </p>
            </div>
            <Link to="/faq" className="eyebrow eyebrow--plain">
              Check the FAQ first <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </>
        }
      />

      <div className="content-body" id="feedback">
        <div className="container contact-grid">
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div>
              <span className="eyebrow eyebrow--plain">Send a note</span>
              <h2 className="faq-group__title" style={{ marginTop: 8 }}>
                What should we know?
              </h2>
              <p style={{ marginTop: 8, color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.6 }}>
                {user
                  ? `You are signed in as ${user.name || user.email}. We will attach your account to the note, but keep it out of any public page.`
                  : "Leave an email if you would like a reply. We only use it to answer this message."}
              </p>
            </div>

            {!user && (
              <div className="form-grid">
                <Field label="Your name" htmlFor="contact-name" error={errors.name}>
                  <Input
                    id="contact-name"
                    value={form.name}
                    onChange={(event) => set("name", event.target.value)}
                    placeholder="Aarav Mehta"
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>
                <Field label="Email" htmlFor="contact-email" error={errors.email}>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => set("email", event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                  />
                </Field>
              </div>
            )}

            <div className="form-grid">
              <Field label="Topic" htmlFor="contact-topic">
                <Select
                  id="contact-topic"
                  value={form.topic}
                  onChange={(event) => set("topic", event.target.value)}
                >
                  {TOPICS.map((topic) => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Subject"
                htmlFor="contact-subject"
                optional
                error={errors.subject}
                hint="A few words are enough."
              >
                <Input
                  id="contact-subject"
                  value={form.subject}
                  onChange={(event) => set("subject", event.target.value.slice(0, 120))}
                  placeholder="The invite dialog closed twice"
                  aria-invalid={Boolean(errors.subject)}
                />
              </Field>
            </div>

            <Field
              label="Message"
              htmlFor="contact-message"
              error={errors.message}
              hint={`${form.message.length}/1,500 characters`}
            >
              <Textarea
                id="contact-message"
                value={form.message}
                onChange={(event) => set("message", event.target.value.slice(0, 1500))}
                placeholder="I was on the team page when…"
                maxLength={1500}
                aria-invalid={Boolean(errors.message)}
                required
              />
            </Field>

            {errors.form && (
              <div className="alert alert--danger" role="alert">
                <Bug aria-hidden="true" />
                <div className="alert__body">
                  <strong>The note did not send.</strong>
                  <p>{errors.form}</p>
                </div>
              </div>
            )}

            {sent && (
              <div className="alert alert--success" role="status">
                <Sparkles aria-hidden="true" />
                <div className="alert__body">
                  <strong>It is on our desk.</strong>
                  <p>Thank you for taking the time to make the guide better.</p>
                </div>
              </div>
            )}

            <div className="cluster" style={{ justifyContent: "space-between" }}>
              <span className="field__hint">
                <ShieldCheck size={12} aria-hidden="true" /> Never send passwords or private keys.
              </span>
              <Button variant="primary" type="submit" loading={mutation.isPending} icon={<Mail />}>
                Send note
              </Button>
            </div>
          </form>

          <aside className="contact-cards" aria-label="Other ways to reach us">
            <div className="contact-card">
              <span className="contact-card__icon" aria-hidden="true">
                <Mail />
              </span>
              <div className="contact-card__body">
                <strong>General &amp; product</strong>
                <p>Questions, ideas and anything that does not fit another door.</p>
                <a href="mailto:hello@hackhub.build">hello@hackhub.build</a>
              </div>
            </div>

            <div className="contact-card">
              <span className="contact-card__icon" aria-hidden="true">
                <ShieldCheck />
              </span>
              <div className="contact-card__body">
                <strong>Safety &amp; reports</strong>
                <p>Harassment, impersonation or a conversation that feels unsafe.</p>
                <a href="mailto:safety@hackhub.build">safety@hackhub.build</a>
              </div>
            </div>

            <div className="contact-card">
              <span className="contact-card__icon" aria-hidden="true">
                <MessageSquare />
              </span>
              <div className="contact-card__body">
                <strong>Privacy requests</strong>
                <p>Export, correction or deletion of your account data.</p>
                <a href="mailto:privacy@hackhub.build">privacy@hackhub.build</a>
              </div>
            </div>

            <div className="contact-card">
              <span className="contact-card__icon" aria-hidden="true">
                <Code2 />
              </span>
              <div className="contact-card__body">
                <strong>The source</strong>
                <p>HackHub is open source. Bugs and pull requests are welcome.</p>
                <a
                  href="https://github.com/run-time-code/HackHub"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/run-time-code/HackHub
                </a>
              </div>
            </div>

            <div className="faq-aside__card">
              <h3>What happens next</h3>
              <p>
                A human reviews the note, routes it to the right person and replies if a reply will
                help. We may ask for a screenshot or a little more context.
              </p>
              <div className="cluster" style={{ marginTop: 12, gap: 6 }}>
                <Clock3 size={12} aria-hidden="true" />
                <span className="field__hint">Usually within two weekdays.</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
