import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const Contest = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Contests Are Coming Soon</h1>
            <p className="max-w-md text-muted-foreground">
              We are preparing exciting writing contests. Stay tuned for updates and get ready to participate.
            </p>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Contest;
