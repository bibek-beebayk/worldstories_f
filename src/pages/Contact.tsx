import { Link } from "react-router-dom";
import { Mail, MessageSquareText, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";

const CONTACT_EMAIL = "worldstoriesnet@gmail.com";

const topics = [
  {
    icon: MessageSquareText,
    title: "General support",
    description: "Questions about your account, reading a story, or something not working as expected.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy & content concerns",
    description: "Requests about your personal data, or reporting content that violates our Terms of Service.",
  },
];

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Contact Us | WorldStories"
        description="Get in touch with the WorldStories team for support, privacy requests, or feedback."
        path="/contact"
      />
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact Us</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Have a question, found a bug, or want to reach out about your account or a story on
          WorldStories? We'd like to hear from you.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {topics.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="flex flex-col gap-2 p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="text-xs text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Email us</p>
              <p className="mt-1 text-lg font-semibold">{CONTACT_EMAIL}</p>
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
