import { Link } from "react-router-dom";
import LegalPage from "../../components/content/LegalPage";

export default function Community() {
  return (
    <LegalPage
      eyebrow="Legal · Community"
      title="The room works because people keep it decent."
      deck="HackHub is a small, opt-in room for people who want to build together. These guidelines describe the behaviour that makes a stranger feel safe enough to say yes."
      note={
        <>
          <strong>The short version</strong>
          Be specific, be kind, ask before you pitch, and leave people better off than you found
          them. Harassment, impersonation and spam are not welcome here.
        </>
      }
      sections={[
        {
          id: "first-move",
          title: "Make the first move useful",
          content: (
            <>
              <p>
                &quot;Hey, want to team?&quot; is not a brief. Say what you are building, what you
                can contribute and what you need. A good invitation gives the other person enough
                truth to make a real decision.
              </p>
              <p>
                If you are inviting someone, read their card first. Mention the specific skill,
                project or question that made you think of them. Do not send the same message to
                everyone you can find.
              </p>
            </>
          ),
        },
        {
          id: "consent",
          title: "Consent before contact",
          content: (
            <>
              <p>
                Discovery is opt-in. Do not scrape the finder, copy cards into a spreadsheet, or
                move a conversation to another platform before the other person has agreed. An
                invitation is a request, not a claim on someone&apos;s time.
              </p>
              <p>
                No means no. If someone declines or stops replying, let it rest. Do not send repeated
                invitations through different teams or accounts.
              </p>
            </>
          ),
        },
        {
          id: "respect",
          title: "Respect the person, not just the skill",
          content: (
            <>
              <ul>
                <li>No harassment, threats, stalking or sexual attention that was not invited.</li>
                <li>No hate speech or discrimination based on identity or background.</li>
                <li>Do not pressure someone to share private contact details, money or credentials.</li>
                <li>Critique the work, not the worth of the person who made it.</li>
                <li>Give credit for ideas, code, designs and opportunities.</li>
              </ul>
              <p>
                When you are wrong, repair it. A clear apology and a changed behaviour matter more
                than a perfect record.
              </p>
            </>
          ),
        },
        {
          id: "honesty",
          title: "Keep the card honest",
          content: (
            <>
              <p>
                Use your real name or a consistent handle, and describe your skills with the
                proficiency you would defend in a working session. Do not impersonate another
                builder, a school or an organisation.
              </p>
              <p>
                Past builds should be work you actually contributed to. If a project is private or
                under a deadline, describe it without publishing what you do not have permission to
                share.
              </p>
            </>
          ),
        },
        {
          id: "safety",
          title: "Meet and build safely",
          content: (
            <>
              <p>
                You do not have to meet anyone in person to collaborate. If you do meet, choose a
                public place, tell someone where you are going, and keep the first session short.
                Never share passwords, API keys, private repositories or identity documents with a
                stranger.
              </p>
              <p>
                If a conversation moves toward money, unpaid labour or something that feels wrong,
                slow down and ask questions. HackHub does not broker paid work or guarantee that a
                teammate is who they say they are.
              </p>
            </>
          ),
        },
        {
          id: "report",
          title: "Report what you see",
          content: (
            <>
              <p>
                If someone breaks these guidelines, use the{" "}
                <Link to="/contact">contact page</Link> and choose &quot;Something broke&quot; or
                write to <a href="mailto:safety@hackhub.build">safety@hackhub.build</a>. Include the
                team, profile link, message and what happened. Screenshots help, but do not risk
                your safety to collect them.
              </p>
              <p>
                Reports are read by a human. We may ask for more context, restrict an account while
                we investigate, or remove content. We will not publish a report about you to the
                person you reported.
              </p>
            </>
          ),
        },
        {
          id: "consequences",
          title: "What happens when the line is crossed",
          content: (
            <>
              <p>
                Consequences depend on the behaviour and the risk. A first, small mistake may be a
                warning and a request to repair it. Serious harm, repeated abuse, fraud or a safety
                risk can lead to removal from teams, suspension or a permanent ban.
              </p>
              <p>
                You can appeal a decision by replying to the email we send. We will explain what we
                can and revisit new information.
              </p>
            </>
          ),
        },
        {
          id: "more",
          title: "The agreement behind the guidelines",
          content: (
            <>
              <p>
                These guidelines sit alongside the <Link to="/legal/terms">terms</Link> and the{" "}
                <Link to="/legal/privacy">privacy policy</Link>. They are not a substitute for the
                law. If you are unsure whether something belongs here, ask us before you post it.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
