import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AiGenerationModel, PromptSettings } from "@/api/types";

const MODEL_OPTIONS: { value: AiGenerationModel; label: string }[] = [
  { value: "claude-opus-5", label: "Claude Opus 5 (most capable, most expensive)" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5 (balanced)" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fastest, cheapest)" },
];

const AdminAiSettings = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const { data: promptSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-prompt-settings"],
    queryFn: storyApi.getPromptSettings,
    enabled: isAuthenticated && isSuperuser,
  });

  const [summaryInstructions, setSummaryInstructions] = useState("");
  const [summaryModel, setSummaryModel] = useState<AiGenerationModel>("claude-sonnet-5");
  const [retrospectiveInstructions, setRetrospectiveInstructions] = useState("");
  const [retrospectiveModel, setRetrospectiveModel] = useState<AiGenerationModel>("claude-sonnet-5");
  const [excerptInstructions, setExcerptInstructions] = useState("");
  const [excerptModel, setExcerptModel] = useState<AiGenerationModel>("claude-sonnet-5");
  const [bookFetchInstructions, setBookFetchInstructions] = useState("");
  const [bookFetchModel, setBookFetchModel] = useState<AiGenerationModel>("claude-sonnet-5");
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingRetrospective, setSavingRetrospective] = useState(false);
  const [savingExcerpt, setSavingExcerpt] = useState(false);
  const [savingBookFetch, setSavingBookFetch] = useState(false);

  useEffect(() => {
    if (!promptSettings) return;
    setSummaryInstructions(promptSettings.summary_instructions);
    setSummaryModel(promptSettings.summary_model);
    setRetrospectiveInstructions(promptSettings.retrospective_instructions);
    setRetrospectiveModel(promptSettings.retrospective_model);
    setExcerptInstructions(promptSettings.excerpt_instructions);
    setExcerptModel(promptSettings.excerpt_model);
    setBookFetchInstructions(promptSettings.book_fetch_instructions);
    setBookFetchModel(promptSettings.book_fetch_model);
  }, [promptSettings]);

  const saveSummarySettings = async () => {
    try {
      setSavingSummary(true);
      const updated = await storyApi.updatePromptSettings({
        summary_instructions: summaryInstructions,
        summary_model: summaryModel,
      });
      queryClient.setQueryData<PromptSettings>(["admin-prompt-settings"], updated);
      toast.success("Summary prompt settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save summary prompt settings.");
    } finally {
      setSavingSummary(false);
    }
  };

  const saveRetrospectiveSettings = async () => {
    try {
      setSavingRetrospective(true);
      const updated = await storyApi.updatePromptSettings({
        retrospective_instructions: retrospectiveInstructions,
        retrospective_model: retrospectiveModel,
      });
      queryClient.setQueryData<PromptSettings>(["admin-prompt-settings"], updated);
      toast.success("Retrospective prompt settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save retrospective prompt settings.");
    } finally {
      setSavingRetrospective(false);
    }
  };

  const saveExcerptSettings = async () => {
    try {
      setSavingExcerpt(true);
      const updated = await storyApi.updatePromptSettings({
        excerpt_instructions: excerptInstructions,
        excerpt_model: excerptModel,
      });
      queryClient.setQueryData<PromptSettings>(["admin-prompt-settings"], updated);
      toast.success("Excerpt prompt settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save excerpt prompt settings.");
    } finally {
      setSavingExcerpt(false);
    }
  };

  const saveBookFetchSettings = async () => {
    try {
      setSavingBookFetch(true);
      const updated = await storyApi.updatePromptSettings({
        book_fetch_instructions: bookFetchInstructions,
        book_fetch_model: bookFetchModel,
      });
      queryClient.setQueryData<PromptSettings>(["admin-prompt-settings"], updated);
      toast.success("Fetch Book Data prompt settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save Fetch Book Data prompt settings.");
    } finally {
      setSavingBookFetch(false);
    }
  };

  if (meLoading) {
    return <FullScreenLoader />;
  }

  if (!isSuperuser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Access denied. Superuser privileges are required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto pr-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Generation Settings</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Instructions and model used when generating a story's Summary or Retrospective from the Story Details
            page. Title, author, and (if selected) chapter content are always assembled by the backend — these
            instructions only control tone and framing, not what data gets sent.
          </p>
        </CardHeader>
      </Card>

      {settingsLoading || !promptSettings ? (
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="summary-instructions">Instructions</Label>
                <Textarea
                  id="summary-instructions"
                  value={summaryInstructions}
                  onChange={(e) => setSummaryInstructions(e.target.value)}
                  className="mt-2 min-h-32"
                />
              </div>
              <div>
                <Label htmlFor="summary-model">Model</Label>
                <Select value={summaryModel} onValueChange={(value) => setSummaryModel(value as AiGenerationModel)}>
                  <SelectTrigger id="summary-model" className="mt-2 max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={savingSummary || !summaryInstructions.trim()}
                  onClick={saveSummarySettings}
                >
                  {savingSummary ? "Saving..." : "Save Summary Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retrospective</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="retrospective-instructions">Instructions</Label>
                <Textarea
                  id="retrospective-instructions"
                  value={retrospectiveInstructions}
                  onChange={(e) => setRetrospectiveInstructions(e.target.value)}
                  className="mt-2 min-h-32"
                />
              </div>
              <div>
                <Label htmlFor="retrospective-model">Model</Label>
                <Select
                  value={retrospectiveModel}
                  onValueChange={(value) => setRetrospectiveModel(value as AiGenerationModel)}
                >
                  <SelectTrigger id="retrospective-model" className="mt-2 max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={savingRetrospective || !retrospectiveInstructions.trim()}
                  onClick={saveRetrospectiveSettings}
                >
                  {savingRetrospective ? "Saving..." : "Save Retrospective Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Excerpt</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Used for a blog post's SEO excerpt/meta description. Plain text only — no markdown or HTML.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="excerpt-instructions">Instructions</Label>
                <Textarea
                  id="excerpt-instructions"
                  value={excerptInstructions}
                  onChange={(e) => setExcerptInstructions(e.target.value)}
                  className="mt-2 min-h-32"
                />
              </div>
              <div>
                <Label htmlFor="excerpt-model">Model</Label>
                <Select value={excerptModel} onValueChange={(value) => setExcerptModel(value as AiGenerationModel)}>
                  <SelectTrigger id="excerpt-model" className="mt-2 max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={savingExcerpt || !excerptInstructions.trim()}
                  onClick={saveExcerptSettings}
                >
                  {savingExcerpt ? "Saving..." : "Save Excerpt Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fetch Book Data</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Used by the "Fetch Book Data" button on the Story Queue tab to suggest public-domain books not
                already in the catalog. The list of existing titles and the requested count are always assembled
                by the backend — these instructions only control tone, quality bar, and field-level guidance.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="book-fetch-instructions">Instructions</Label>
                <Textarea
                  id="book-fetch-instructions"
                  value={bookFetchInstructions}
                  onChange={(e) => setBookFetchInstructions(e.target.value)}
                  className="mt-2 min-h-32"
                />
              </div>
              <div>
                <Label htmlFor="book-fetch-model">Model</Label>
                <Select
                  value={bookFetchModel}
                  onValueChange={(value) => setBookFetchModel(value as AiGenerationModel)}
                >
                  <SelectTrigger id="book-fetch-model" className="mt-2 max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={savingBookFetch || !bookFetchInstructions.trim()}
                  onClick={saveBookFetchSettings}
                >
                  {savingBookFetch ? "Saving..." : "Save Fetch Book Data Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminAiSettings;
