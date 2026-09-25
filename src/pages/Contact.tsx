import { Link } from "react-router";
import { Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/buildMeta";

const CONTACT_EMAIL = "beebayk0001@gmail.com";

export function meta() {
  return buildMeta({
    title: "Contact | WorldStories",
    description:
      "Contact WorldStories publisher Bibek Gautam with questions, feedback, rights, or publishing enquiries.",
    path: "/contact",
  });
}

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          For questions, feedback, rights or publishing enquiries, contact Bibek Gautam at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <Card className="mt-8 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Email us</p>
              <p className="mt-1 text-lg font-semibold">Bibek Gautam</p>
              <p className="mt-1 text-sm text-muted-foreground">Kathmandu, Nepal</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block text-sm font-medium text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">We aim to respond within a few business days.</p>
            </div>
            <Button asChild>
              <a href={`mailto:${CONTACT_EMAIL}`}>
                <Mail className="mr-2 h-4 w-4" />
                Send an email
              </a>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-8 text-sm text-muted-foreground">
          Want to publish your own story instead?{" "}
          <Link to="/publish" className="font-medium text-primary hover:underline">
            Submit it here
          </Link>
          . For details on how we handle your data, see our{" "}
          <Link to="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
};

export default Contact;
