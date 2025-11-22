import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Calendar, Users } from "lucide-react";
import AdSpace from "@/components/AdSpace";

const Contest = () => {
  const contests = [
    {
      title: "Spring Writing Challenge 2024",
      description: "Write a story about new beginnings and win amazing prizes!",
      prize: "$5,000",
      deadline: "March 31, 2024",
      participants: 1250,
      status: "Active"
    },
    {
      title: "Fantasy Adventure Contest",
      description: "Create an epic fantasy tale set in a magical world.",
      prize: "$3,000",
      deadline: "April 15, 2024",
      participants: 890,
      status: "Active"
    },
    {
      title: "Romance Short Story Contest",
      description: "Tell us a heartwarming love story in under 5,000 words.",
      prize: "$2,000",
      deadline: "April 30, 2024",
      participants: 650,
      status: "Active"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">Writing Contests</h1>
          <p className="text-lg text-muted-foreground">Showcase your talent and win exciting prizes</p>
        </div>

        <AdSpace size="banner" className="mb-8" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {contests.map((contest, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Trophy className="h-8 w-8 text-primary" />
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                    {contest.status}
                  </span>
                </div>
                <CardTitle className="text-xl">{contest.title}</CardTitle>
                <CardDescription>{contest.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">Prize: {contest.prize}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Deadline: {contest.deadline}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{contest.participants} participants</span>
                  </div>
                  <Button className="w-full mt-4">Enter Contest</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AdSpace size="banner" />
      </main>
    </div>
  );
};

export default Contest;
