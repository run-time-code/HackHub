import { Link } from "react-router-dom";
import LegalPage from "../../components/content/LegalPage";

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Legal · Terms"
      title="A field guide, not a guarantee."
      deck="These terms describe the deal between you and HackHub. Keep them in mind when you create a card, join a crew or invite someone into your build."
      note={
        <>
          <strong>The short version</strong>
          Be honest about who you are, respect the people you meet, and do not use HackHub to spam,
          harass or break the law. You own what you publish. We provide the room.
        </>
      }
      sections={[
        {
          id: "agreement",
          title: "The agreement",
          content: (
            <>
              <p>
                By creating an account or using HackHub, you agree to these terms and to our{" "}
                <Link to="/legal/privacy">privacy policy</Link>. If you do not agree, please do not
                use the service. You must be old enough to enter a binding agreement in your
                jurisdiction, and at least 13 years old everywhere.
              </p>
              <p>
                If you use HackHub for a school, club or team, you confirm that you have permission
                to do so. You are responsible for the activity on your account.
              </p>
            </>
          ),
        },
        {
          id: "your-account",
          title: "Your account",
          content: (
            <>
              <p>
                Give accurate information, keep your sign-in details private and tell us promptly if
                you believe someone else has access to your account. Do not create accounts to evade
                a suspension or to impersonate another builder.
              </p>
              <p>
                You can close your account by contacting us. We may suspend or remove accounts that
                are abandoned, fraudulent, abusive or a security risk.
              </p>
            </>
          ),
        },
        {
          id: "your-content",
          title: "Your content and your work",
          content: (
            <>
              <p>
                You keep ownership of the writing, links, images and project details you publish.
                You give us a limited licence to host and display that content so the product can
                work: showing your card, rendering a team page, notifying the right people and
                producing a screenshot for a share card. That licence ends when you remove the
                content, except where we need to keep a record for security or legal reasons.
              </p>
              <p>
                Only upload work you have the right to share. If a project belongs to a team or an
                employer, get permission before publishing it. Hackathon rules may give the event
                organiser additional rights; those rules are between you and the organiser.
              </p>
            </>
          ),
        },
        {
          id: "teams",
          title: "Teams, requests and invitations",
          content: (
            <>
              <p>
                HackHub helps people find each other, but it does not employ you, supervise the
                work, guarantee a teammate or decide who wins a hackathon. Team leaders control the
                brief, the seats and the membership. Pending requests expire after seven days.
              </p>
              <p>
                Be clear about what you want and what you can contribute. Do not accept a paid role,
                share sensitive information or sign a contract through the app without doing your
                own diligence. If a conversation feels unsafe, stop it and report it.
              </p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "What is not allowed",
          content: (
            <>
              <ul>
                <li>Harassment, threats, hate speech, sexual harassment or targeted abuse.</li>
                <li>Impersonation, fake profiles or misleading claims about your skills and work.</li>
                <li>Spam, mass invitations, scraping or automated access to other people&apos;s data.</li>
                <li>Attempting to break authentication, probe other accounts or disrupt the service.</li>
                <li>Uploading malware, stolen work or content that violates someone else&apos;s rights.</li>
                <li>Using the service to break the law or a hackathon&apos;s published rules.</li>
              </ul>
              <p>
                Read the <Link to="/legal/community">community guidelines</Link> for the behaviour we
                expect in the room. We may remove content, restrict features or close an account when
                these rules are broken.
              </p>
            </>
          ),
        },
        {
          id: "third-parties",
          title: "Hackathons and third parties",
          content: (
            <>
              <p>
                HackHub may link to hackathons, registration forms, repositories and other services
                we do not control. We are not responsible for their content, availability or
                decisions. A deadline shown on HackHub is a convenience copy; the organiser&apos;s
                site is the source of truth.
              </p>
            </>
          ),
        },
        {
          id: "availability",
          title: "Availability and changes",
          content: (
            <>
              <p>
                We work to keep the field guide open, but the service is provided as available and
                without a promise of uninterrupted access. We may add, change or retire features,
                and we may pause the service for maintenance or security.
              </p>
              <p>
                If we make a material change to these terms, we will update the effective date and
                tell you in the product when we can. Continuing to use HackHub after the change
                means you accept the revised terms.
              </p>
            </>
          ),
        },
        {
          id: "liability",
          title: "Liability and disclaimers",
          content: (
            <>
              <p>
                To the fullest extent permitted by law, HackHub is provided &quot;as is&quot;. We
                do not promise that a teammate will be compatible, that a team will stay together or
                that a hackathon will accept your project. We are not liable for indirect or
                consequential losses, lost opportunities or work done with a team formed through the
                service.
              </p>
              <p>
                Nothing here limits liability that cannot legally be limited. If you are a consumer,
                your local rights still apply.
              </p>
            </>
          ),
        },
        {
          id: "ending",
          title: "Ending the agreement",
          content: (
            <>
              <p>
                You can stop using HackHub at any time. We may suspend or end your access if you
                break these terms, create risk for other people or the service, or if we decide to
                close the product with reasonable notice. If we close your account for a reason
                other than a breach, we will try to give you a way to retrieve your content first.
              </p>
            </>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          content: (
            <>
              <p>
                Terms questions can go to{" "}
                <a href="mailto:legal@hackhub.build">legal@hackhub.build</a>. Product questions,
                bugs and ideas belong on the <Link to="/contact">contact page</Link>. We read every
                note.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
