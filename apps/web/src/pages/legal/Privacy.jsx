import { Link } from "react-router-dom";
import LegalPage from "../../components/content/LegalPage";

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Legal · Privacy"
      title="Your work is public. Your inbox is not."
      deck="HackHub is a place to be found by the right collaborators. This page explains what we collect, what stays private, and the choices you keep."
      note={
        <>
          <strong>The short version</strong>
          Discovery is opt-in. Your email is never shown on a public builder card. You can
          download or delete your data by asking us, and analytics only run after you say yes.
        </>
      }
      sections={[
        {
          id: "what-we-collect",
          title: "What we collect",
          content: (
            <>
              <p>
                We collect the information you choose to put on your builder card: your name,
                headline, bio, college, year, location, skills, skill levels, interests,
                availability, links and past builds. We also keep the email address attached to
                your account and a password hash if you sign in with a password.
              </p>
              <p>
                When you use the product, we collect the actions needed to make it work: teams
                you create or join, requests and invitations, notifications, and the timestamps
                that keep the wire in order. If something breaks, our error monitoring may record
                the page, browser and a technical stack trace. It does not record your password or
                payment details.
              </p>
              <p>
                We do not buy contact lists, scrape social profiles without permission, or build
                advertising profiles.
              </p>
            </>
          ),
        },
        {
          id: "what-stays-private",
          title: "What stays private",
          content: (
            <>
              <ul>
                <li>Your email address and account recovery details.</li>
                <li>Password hashes, session tokens and CSRF secrets.</li>
                <li>Moderation notes, reports and security logs.</li>
                <li>Any data you have not chosen to publish on your card.</li>
              </ul>
              <p>
                A public builder card is visible to anyone who has the link. It never includes
                your email address, password data, private preferences or discoverability setting.
                Being discoverable is a separate choice: it allows opted-in builders to find you in
                the teammate finder.
              </p>
            </>
          ),
        },
        {
          id: "discovery",
          title: "Discovery, match scores and consent",
          content: (
            <>
              <p>
                The teammate finder only returns builders who have opted into discovery. If you
                turn discovery off, you can still browse and invite other people, but you will not
                appear in their results. You can change this at any time from your{" "}
                <Link to="/profile#visibility">profile visibility settings</Link>.
              </p>
              <p>
                Match scores are a simple, explainable calculation: 70% weight on shared skills and
                30% on shared interests, with matches shown only when you have selected filters.
                They are a starting point for a conversation, not a verdict about a person.
              </p>
            </>
          ),
        },
        {
          id: "how-we-use-it",
          title: "How we use your information",
          content: (
            <>
              <p>
                We use your data to run the product you asked for: showing your card, finding
                teammates, delivering invitations, keeping you signed in, preventing abuse and
                answering support requests. We also use aggregated numbers, such as how many teams
                are open, to understand whether the field guide is useful. Aggregated numbers do not
                identify you.
              </p>
              <p>
                We do not sell personal information. We do not use your private messages or
                profile details for advertising. Analytics are optional and remain off until you
                accept them.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies and local storage",
          content: (
            <>
              <p>
                Essential cookies and local storage keep you signed in, protect requests against
                CSRF and remember your consent decision. Analytics cookies are optional. Our{" "}
                <Link to="/legal/cookies">cookie page</Link> lists every category and how to change
                your choice.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "When we share data",
          content: (
            <>
              <p>
                We use a small set of service providers for hosting, database storage, email
                delivery, image uploads and error monitoring. They receive only what they need to
                provide that service. If the project changes hands or a legal obligation requires
                disclosure, we will tell you what we can and challenge requests that are too broad.
              </p>
              <p>
                Other builders see the information on your public card and the requests you send.
                They do not see your email unless you choose to include it in a message or a note.
              </p>
            </>
          ),
        },
        {
          id: "retention",
          title: "Retention and deletion",
          content: (
            <>
              <p>
                We keep your account while it exists and for a short period afterward in backups.
                Resolved team requests remain while the team exists so the crew has a record.
                Feedback is kept until it has been reviewed and any follow-up is complete.
              </p>
              <p>
                You can ask us to export or delete your data by emailing{" "}
                <a href="mailto:privacy@hackhub.build">privacy@hackhub.build</a>. We may need to
                verify that the account is yours. Some records may need to be retained for security
                or legal reasons; we will explain that if it applies.
              </p>
            </>
          ),
        },
        {
          id: "your-choices",
          title: "Your choices and rights",
          content: (
            <>
              <ul>
                <li>Edit or remove the contents of your builder card at any time.</li>
                <li>Turn discovery on or off without losing your account.</li>
                <li>Withdraw a request or invitation before it is answered.</li>
                <li>Change your cookie choice from the footer of any page.</li>
                <li>Ask for a copy of your data or for your account to be deleted.</li>
              </ul>
              <p>
                Depending on where you live, you may have additional rights to access, correct,
                restrict or object to processing. Write to us and we will work through it with you.
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "Security",
          content: (
            <>
              <p>
                We use encrypted connections, hashed passwords, HTTP-only session cookies, CSRF
                protection and scoped access to production systems. No system is perfect. If you
                find a vulnerability, please report it through our{" "}
                <Link to="/contact">contact page</Link> rather than testing it against another
                person&apos;s account.
              </p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          content: (
            <>
              <p>
                When we change something material, we will update the effective date and explain
                the change in plain language. If the change affects your consent, we will ask
                again instead of assuming it.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
