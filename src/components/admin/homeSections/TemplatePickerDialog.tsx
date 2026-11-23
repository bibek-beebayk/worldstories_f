import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { storyApi } from "@/api/story";
import type { AdminHomeSection } from "@/api/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (section: AdminHomeSection) => void;
}

export function TemplatePickerDialog({ open, onClose, onCreated }: TemplatePickerDialogProps) {
  const queryClient = useQueryClient();
  const templates = useQuery({
    queryKey: ["admin-home-section-templates"],
    queryFn: storyApi.getAdminHomeSectionTemplates,
    enabled: open,
    staleTime: Infinity,
  });

  const create = useMutation({
    mutationFn: (key: string) => storyApi.createAdminHomeSectionFromTemplate(key),
    onSuccess: (section) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
      toast.success("Added hidden. Review it and turn it on.");
      onClose();
      onCreated(section);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not add section from template.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Add from template
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Pick a ready-made section. It is added at the bottom and stays hidden until you review and enable it.
        </p>

        {templates.isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {templates.isError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Could not load templates.
          </p>
        )}

        {templates.data && (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.data.map((tpl) => {
              const isCreatingThis = create.isPending && create.variables === tpl.key;
              return (
                <button
                  key={tpl.key}
                  type="button"
                  disabled={create.isPending}
                  onClick={() => create.mutate(tpl.key)}
                  className="flex flex-col items-start gap-1.5 rounded-lg border bg-card p-3.5 text-left transition-colors hover:border-primary/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{tpl.name}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {isCreatingThis && <Loader2 className="h-3 w-3 animate-spin" />}
                      {tpl.layout}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{tpl.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
