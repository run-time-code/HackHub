import { Link } from "react-router-dom";
import LegalPage from "../../components/content/LegalPage";

export default function Cookies() {
  return (
    <LegalPage
      eyebrow="Legal · Cookies"
      title="Small files. A clear choice."
      deck="Cookies and local storage keep you signed in, protect the things you submit and — only with permission — tell us which parts of the field guide are useful."
      note={
        <>
          <strong>The short version</strong>
          Essential storage is always on because the product cannot work without it. Analytics is
          optional and starts on only after you accept it. You can change your mind from the footer
          of any page.
        </>
      }
      sections={[
        {
          id: "what-they-are",
          title: "What cookies and local storage are",
          content: (
            <>
              <p>
                Cookies are small pieces of data a website asks your browser to store. Local
                storage is a similar browser mechanism with a larger shelf life. We use both for
                different jobs. Neither is a program running on your device.
              </p>
              <p>
                HackHub uses first-party storage only. We do not place advertising cookies, and we
                do not sell data to data brokers.
              </p>
            </>
          ),
        },
        {
          id: "essential",
          title: "Essential storage — always on",
          content: (
            <>
              <ul>
                <li>
                  <strong>Session cookies.</strong> Short-lived HTTP-only cookies keep you signed
                  in and let the browser refresh a session safely.
                </li>
                <li>
                  <strong>CSRF token.</strong> A security token helps us reject requests that did
                  not come from your session.
                </li>
                <li>
                  <strong>Consent record.</strong> A local record remembers that you made a cookie
                  choice, so we do not ask on every page.
                </li>
                <li>
                  <strong>Interface preferences.</strong> Your theme choice and onboarding progress
                  may be kept locally so the guide opens the way you left it.
                </li>
              </ul>
              <p>
                These are necessary to provide the service you requested. Turning them off in your
                browser may prevent sign-in, forms or the consent dialog from working.
              </p>
            </>
          ),
        },
        {
          id: "analytics",
          title: "Analytics — opt-in",
          content: (
            <>
              <p>
                If you accept analytics, we record a small set of anonymous product events: pages
                visited, teams created, invitations sent and requests accepted. We use them to
                answer questions like &quot;is the finder useful?&quot; and &quot;where does the
                invite flow lose people?&quot;
              </p>
              <p>
                Analytics events are not used for advertising, are not sold, and are not combined
                with third-party tracking profiles. Our error monitoring is separate from analytics;
                it helps us find crashes and security issues.
              </p>
              <p>
                Before you opt in, HackHub does not inject analytics scripts or record analytics
                events.
              </p>
            </>
          ),
        },
        {
          id: "third-party",
          title: "Service providers",
          content: (
            <>
              <p>
                We use a small number of providers for hosting, database storage, email delivery,
                image uploads and error monitoring. They may set their own strictly necessary
                cookies when you interact with them. They do not receive an advertising profile of
                you from HackHub.
              </p>
            </>
          ),
        },
        {
          id: "choices",
          title: "How to change your choice",
          content: (
            <>
              <p>
                Open <strong>Cookie settings</strong> in the footer of any page. There you can
                accept analytics or choose essential only. The change applies immediately and is
                remembered on this browser.
              </p>
              <p>
                You can also clear cookies and local storage in your browser settings. That removes
                your consent record, so we will ask again, and it may sign you out.
              </p>
            </>
          ),
        },
        {
          id: "lifetime",
          title: "How long they last",
          content: (
            <>
              <p>
                Session cookies are removed when they expire or you sign out. The consent record is
                kept locally until you clear it or change your choice. Analytics events are retained
                only as long as needed to understand aggregate product use and are reviewed on a
                regular schedule.
              </p>
            </>
          ),
        },
        {
          id: "more",
          title: "Where to read more",
          content: (
            <>
              <p>
                The <Link to="/legal/privacy">privacy policy</Link> explains the data behind these
                choices. The <Link to="/legal/terms">terms</Link> explain the agreement for using
                the service. If anything is still unclear, <Link to="/contact">contact us</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
