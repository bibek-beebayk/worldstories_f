import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

const CONTACT_EMAIL = "worldstoriesnet@gmail.com";
const LAST_UPDATED = "July 30, 2026";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Terms of Service | WorldStories"
        description="Read the terms and conditions that govern your use of WorldStories, including rules for submitting content and using the platform."
        path="/terms"
      />
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-sm sm:prose-base prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-primary">
          <p>
            These Terms of Service ("Terms") govern your access to and use of worldstories.net (the
            "Site"), operated by WorldStories ("we", "us", or "our"). By creating an account or using
            the Site, you agree to these Terms. If you do not agree, please do not use the Site.
          </p>

          {/* <h2>1. Eligibility</h2>
          <p>
            You must be at least 13 years old to create an account. If you are under the age of
            majority in your jurisdiction, you may only use the Site with the involvement of a parent
            or legal guardian.
          </p> */}

          <h2>1. Your Account</h2>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials and for
            all activity under your account. Notify us promptly at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you suspect unauthorized use of
            your account.
          </p>

          <h2>2. User-Submitted Content</h2>
          <p>
            When you submit a story, chapter, cover image, review, or other content ("User Content"),
            you retain ownership of it. By submitting User Content, you grant WorldStories a
            non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, and
            distribute it on the Site for the purpose of operating and promoting the Site.
          </p>
          <p>
            Story submissions are reviewed before they are published. We may decline to publish, or may
            remove, any content that violates these Terms, at our discretion.
          </p>
          <p>You agree that your User Content will not:</p>
          <ul>
            <li>Infringe the copyright, trademark, or other intellectual property rights of any third party;</li>
            <li>Contain sexually explicit material involving minors, or unlawful, defamatory, or harassing content;</li>
            <li>Promote violence, hatred, or discrimination against individuals or groups;</li>
            <li>Contain malware or attempt to compromise the security of the Site; or</li>
            <li>Violate any applicable law.</li>
          </ul>

          <h2>3. Prohibited Conduct</h2>
          <ul>
            <li>Impersonating another person or misrepresenting your affiliation with anyone;</li>
            <li>Scraping, data-mining, or using automated means to access the Site beyond normal use;</li>
            <li>Interfering with or disrupting the Site's operation, including view counts or ad delivery;</li>
            <li>Attempting to gain unauthorized access to accounts or systems.</li>
          </ul>

          <h2>4. Advertising</h2>
          <p>
            The Site may display advertisements, including through Google AdSense and other ad
            networks, to support the cost of operating WorldStories. You agree not to click your own
            ads, use automated tools to generate ad impressions or clicks, or otherwise interfere with
            ad delivery.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            The WorldStories name, logo, and Site design are owned by WorldStories. Other than User
            Content, you may not copy, modify, or distribute any part of the Site without our written
            permission.
          </p>

          <h2>6. Termination</h2>
          <p>
            We may suspend or terminate your account at any time if we believe you have violated these
            Terms. You may stop using the Site and request account deletion at any time by contacting
            us.
          </p>

          <h2>7. Disclaimer of Warranties</h2>
          <p>
            The Site is provided "as is" and "as available" without warranties of any kind, express or
            implied. We do not guarantee that the Site will be uninterrupted, secure, or error-free, or
            that content submitted by other users is accurate or appropriate.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, WorldStories will not be liable for any indirect,
            incidental, special, or consequential damages arising from your use of the Site.
          </p>

          {/* <h2>10. Governing Law</h2>
          <p>
            <em>
              [Placeholder — specify the country/state whose law governs these Terms and where disputes
              will be resolved before publishing this page live.]
            </em>
          </p> */}

          <h2>9. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Site after changes take
            effect constitutes acceptance of the revised Terms.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            Questions about these Terms can be sent to{" "}
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

export default Terms;
