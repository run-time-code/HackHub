import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Mail, Plus, ShieldCheck, UsersRound } from "lucide-react";
import ContentHero from "../components/content/ContentHero";
import Button from "../components/ui/Button";
import { useDocumentTitle } from "../lib/hooks/useDocumentTitle";

function AccordionItem({ question, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion__item">
      <button
        type="button"
        className="accordion__trigger"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{question}</span>
        <Plus aria-hidden="true" />
      </button>
      {open && (
        <div className="accordion__content" id={`answer-${question.replace(/\W+/g, "-").toLowerCase()}`}>
          {children}
        </div>
      )}
    </div>
  );
}

const GROUPS = [
  {
    index: "01",
    label: "The basics",
    title: "Starting with a card.",
    icon: BookOpen,
    items: [
      {
        question: "What is HackHub for?",
        answer: (
          <>
            HackHub is a field guide for student builders: a builder card, a teammate finder, team
            workspaces and one place to keep the handshakes moving. It is designed for the moment
            before a hackathon, when the idea exists but the crew does not.
          </>
        ),
      },
      {
        question: "Is it free?",
        answer: (
          <>
            Yes. Creating a card, finding teammates and joining teams costs nothing. We may add paid
            tools for teams later, but discovery will not be put behind a paywall.
          </>
        ),
      },
      {
        question: "Do I need a hackathon to join?",
        answer: (
          <>
            You can create a card and browse without one. Teams are attached to a hackathon so the
            deadline and the brief stay honest. If the calendar is empty, you can still meet people
            and sharpen your card.
          </>
        ),
      },
      {
        question: "How do I get started?",
        answer: (
          <>
            Create an account, finish the onboarding notes and open the{" "}
            <Link to="/teammates">teammate finder</Link>. If you already have a crew, start a team
            from the <Link to="/teams">team hub</Link> and invite them directly.
          </>
        ),
      },
    ],
  },
  {
    index: "02",
    label: "Finding people",
    title: "The room, and how it works.",
    icon: UsersRound,
    items: [
      {
        question: "Why can I not find everyone?",
        answer: (
          <>
            Discovery is opt-in. Only builders who have turned it on appear in the finder. Your own
            card can stay private while you browse — but nobody can invite you back until you turn
            discovery on from <Link to="/profile#visibility">profile visibility</Link>.
          </>
        ),
      },
      {
        question: "How is the match score calculated?",
        answer: (
          <>
            It is 70% shared skills and 30% shared interests, based on the filters you select. A
            score is a conversation starter, not a compatibility test. The card and the first message
            still matter more.
          </>
        ),
      },
      {
        question: "Can I message someone without inviting them?",
        answer: (
          <>
            Not yet. Invitations and join requests carry a role and a note, which keeps the first
            contact specific. Email addresses and direct contact details are never shown on a public
            card.
          </>
        ),
      },
      {
        question: "What does the availability badge mean?",
        answer: (
          <>
            <strong>Available</strong> means the builder is ready to start now.{" "}
            <strong>Limited</strong> means they are interested but have less time.{" "}
            <strong>Not available</strong> means the door is closed for now. You can change yours
            from the profile editor at any time.
          </>
        ),
      },
    ],
  },
  {
    index: "03",
    label: "Teams",
    title: "Crews, requests and the wire.",
    icon: UsersRound,
    items: [
      {
        question: "What happens when I request to join?",
        answer: (
          <>
            The team leader sees your role and note on their wire. They can accept or decline. A
            pending request expires after seven days, and you can withdraw it sooner. If the team is
            full or closed, the request cannot be sent.
          </>
        ),
      },
      {
        question: "Who can remove a member or change the team?",
        answer: (
          <>
            The team leader. They can edit the brief, change the seat count, remove a member,
            transfer leadership or disband the crew. A leader must hand over leadership before
            leaving, so a team is never left without a captain.
          </>
        ),
      },
      {
        question: "Can I be in more than one team?",
        answer: (
          <>
            Yes, for different hackathons. Within one hackathon, the product does not stop you from
            belonging to more than one crew, but teams are human promises first. Do not take a seat
            you cannot honour.
          </>
        ),
      },
      {
        question: "A team filled up while I was applying.",
        answer: (
          <>
            The team closes automatically when every seat is taken, and pending requests are
            released. Browse other open crews in the same hackathon, or start one of your own. The
            finder is a good place to meet the next teammate before you do.
          </>
        ),
      },
    ],
  },
  {
    index: "04",
    label: "Privacy and safety",
    title: "Trust is part of the build.",
    icon: ShieldCheck,
    items: [
      {
        question: "Who can see my email address?",
        answer: (
          <>
            Nobody through HackHub&apos;s public surfaces. Your email is used for sign-in and account
            recovery, and is never included on a public builder card, team page or discovery result.
          </>
        ),
      },
      {
        question: "What does opt-in discovery mean?",
        answer: (
          <>
            You choose whether other builders can find your card in the finder. Turning discovery
            off does not delete your account or stop you from browsing. It simply removes you from
            the room&apos;s results. The control lives under{" "}
            <Link to="/profile#visibility">visibility</Link>.
          </>
        ),
      },
      {
        question: "Do you use analytics cookies?",
        answer: (
          <>
            Only after you accept them. Essential cookies are always on because sign-in and CSRF
            protection need them. You can change your mind from <strong>Cookie settings</strong> in
            the footer. Read the <Link to="/legal/cookies">cookie page</Link> for the full list.
          </>
        ),
      },
      {
        question: "How do I report a problem?",
        answer: (
          <>
            Use the <Link to="/contact">contact page</Link> for bugs, content issues, privacy
            requests or safety reports. For urgent safety concerns, write to{" "}
            <a href="mailto:safety@hackhub.build">safety@hackhub.build</a>. A human reads every
            note.
          </>
        ),
      },
    ],
  },
];

export default function FAQ() {
  useDocumentTitle("Help & FAQ");

  return (
    <>
      <ContentHero
        eyebrow="Help · The field guide"
        title="Questions are how a room becomes a crew."
        deck="Everything you need to know about your card, the finder, teams, requests and the way we handle your data. If the answer is not here, a human is one message away."
        meta={["18 answers", "Last reviewed 26 October 2026", "Plain language"]}
        aside={
          <>
            <div className="faq-aside__card">
              <h3>Still stuck?</h3>
              <p>
                Send us the page, the step and what you expected to happen. We read every note and
                reply when a reply will help.
              </p>
              <Button to="/contact" variant="primary" size="sm" icon={<Mail />} className="mt-4">
                Contact the team
              </Button>
            </div>
            <div className="faq-aside__card">
              <h3>The short rule</h3>
              <p>
                Be specific, ask before you pitch and leave people better off than you found them.
                The full version lives in the{" "}
                <Link to="/legal/community">community guidelines</Link>.
              </p>
            </div>
            <Link to="/legal/privacy" className="eyebrow eyebrow--plain">
              How your data works <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </>
        }
      />

      <div className="content-body">
        <div className="container faq-layout">
          <aside className="faq-aside" aria-label="Help shortcuts">
            <div className="faq-aside__card">
              <h3>Start here</h3>
              <p>
                New to the guide? Finish your builder card, then let the finder do the introductions.
              </p>
              <div className="stack" style={{ gap: 6, marginTop: 14 }}>
                <Link className="eyebrow eyebrow--plain" to="/profile">
                  Edit your card <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
                <Link className="eyebrow eyebrow--plain" to="/teammates">
                  Open the finder <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
                <Link className="eyebrow eyebrow--plain" to="/legal/community">
                  Read the room rules <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="faq-aside__card">
              <h3>Response time</h3>
              <p>
                Product and safety notes are reviewed on weekdays. Privacy requests may take longer
                while we verify the account.
              </p>
            </div>

            <Button to="/contact" variant="secondary" icon={<Mail />} block>
              Ask a human
            </Button>
          </aside>

          <div className="faq-groups">
            {GROUPS.map((group) => (
              <section key={group.index} aria-labelledby={`faq-group-${group.index}`}>
                <div className="faq-group__label">
                  {group.index} / {group.label}
                </div>
                <h2 className="faq-group__title" id={`faq-group-${group.index}`}>
                  {group.title}
                </h2>
                <div className="accordion">
                  {group.items.map((item, index) => (
                    <AccordionItem
                      key={item.question}
                      question={item.question}
                      defaultOpen={group.index === "01" && index === 0}
                    >
                      <p>{item.answer}</p>
                    </AccordionItem>
                  ))}
                </div>
              </section>
            ))}

            <div className="legal-note">
              <strong>One more thing</strong>
              HackHub is a room for people, not a promise machine. We do not guarantee a teammate, a
              win or a deadline. We do promise to keep the room clear, explain the rules and listen
              when something feels wrong.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
