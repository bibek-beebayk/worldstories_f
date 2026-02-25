import { useState } from "react";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function TestEmail() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("WorldStories Test Email");
  const [message, setMessage] = useState("This is a test email from WorldStories.");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatusMessage("");
    setLoading(true);

    try {
      const res = await authApi.sendTestEmail({ to, subject, message });
      setStatusMessage(res.message || "Email sent.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send test email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Email Sender</CardTitle>
          <CardDescription>
            Send a test SMTP email to verify OTP and notification delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="to">Recipient Email</Label>
              <Input
                id="to"
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
            </div>

            {statusMessage && <p className="text-sm text-green-600">{statusMessage}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Test Email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

