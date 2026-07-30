import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

const CONTACT_EMAIL = "worldstoriesnet@gmail.com";
const LAST_UPDATED = "July 30, 2026";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Privacy Policy | WorldStories"
        description="Learn how WorldStories collects, uses, and protects your personal information, including data related to your account, reading activity, and cookies."
        path="/privacy"
      />
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-sm sm:prose-base prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-primary">
          <p>
            WorldStories ("WorldStories", "we", "us", or "our") operates worldstories.net (the "Site"),
            a platform for reading and publishing short stories, novels, and audiobooks. This Privacy
            Policy explains what information we collect, how we use it, and the choices you have.
            By using the Site, you agree to the collection and use of information as described here.
          </p>

          <h2>1. Information We Collect</h2>
          <h3>Account information</h3>
          <p>
            When you register, we collect your email address, username, and any display name, bio, or
            avatar you choose to add. If you sign in with Google, we receive the basic profile
            information Google shares with us (name, email, profile picture) to create and authenticate
            your account.
          </p>
          <h3>Content you submit</h3>
          <p>
            If you submit a story, chapter, or review, we store that content along with your account
            association so it can be displayed on the Site (and reviewed by our moderators before
            publication, in the case of story submissions).
          </p>
          <h3>Reading and usage activity</h3>
          <p>
            To power features like "Continue Reading" and to show accurate view counts, we record your
            reading progress, favorites, and ratings against your account, and we log story views
            (associated with an IP address and timestamp, kept only long enough to avoid counting
            repeat views from the same visitor) even when you are not signed in.
          </p>
          <h3>Cookies and similar technologies</h3>
          <p>
            We use browser local storage to keep you signed in, and cookies set by Google for sign-in
            and, where enabled, by Google AdSense and other advertising partners to serve and measure
            ads. See "Advertising" below for more on ad-related cookies.
          </p>

          <h2>2. How We Use Information</h2>
          <ul>
            <li>To provide, operate, and maintain the Site and your account;</li>
            <li>To show you relevant content, such as recommendations and your reading history;</li>
            <li>To moderate submitted content and enforce our Terms of Service;</li>
            <li>To measure aggregate engagement (e.g., total reads) and improve the Site;</li>
            <li>To communicate with you about your account or in response to your inquiries;</li>
            <li>To serve advertising, where applicable, as described below.</li>
          </ul>

          <h2>3. Advertising</h2>
          <p>
            WorldStories may display advertisements served by Google AdSense and other third-party ad
            networks. These providers may use cookies, device identifiers, or similar technologies to
            serve ads based on your visits to this and other websites. You can learn more about how
            Google uses information from sites that use its services at{" "}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
              policies.google.com/technologies/partner-sites
            </a>
            , and you can opt out of personalized advertising by visiting{" "}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
              Google Ads Settings
            </a>{" "}
            or{" "}
            <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer">
              aboutads.info
            </a>
            .
          </p>

          <h2>4. Sharing of Information</h2>
          <p>
            We do not sell your personal information. We share information only with:
          </p>
          <ul>
            <li>Service providers who host or operate the Site on our behalf (hosting and infrastructure providers);</li>
            <li>Advertising and analytics partners, limited to what is needed to serve and measure ads;</li>
            <li>Authorities, where required to comply with the law or protect the rights and safety of WorldStories and its users.</li>
          </ul>

          <h2>5. Your Choices and Rights</h2>
          <p>
            You can review and update your account information at any time from your profile. To
            request access to, correction of, or deletion of your personal data, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Depending on where you live, you
            may have additional rights under laws such as the GDPR or CCPA; we will respond to
            verifiable requests consistent with applicable law.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We retain account and content data for as long as your account is active or as needed to
            provide the Site. Individual view-tracking records used for de-duplicating counts are kept
            only briefly and are not used to build a profile of your browsing beyond this Site.
          </p>

          {/* <h2>7. Children's Privacy</h2>
          <p>
            WorldStories is not directed to children under 13, and we do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with personal
            information, please contact us so we can remove it.
          </p> */}

          <h2>7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will update the "Last updated" date
            above when we do, and material changes will be reflected on this page.
          </p>

          <h2>8. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </div>

        <div className="mt-10">
          <Link to="/" className="text-sm font-medium text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
