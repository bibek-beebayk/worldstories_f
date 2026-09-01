import { Download, MoreVertical, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePwaInstall } from "@/hooks/usePwaInstall";

interface PwaInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PwaInstallDialog({ open, onOpenChange }: PwaInstallDialogProps) {
  const { isInstalled, canPromptInstall, install } = usePwaInstall();
  if (isInstalled) return null;

  const installApp = async () => {
    const accepted = await install();
    if (accepted) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-6">
            <div className="rounded-full bg-primary/10 p-2 text-primary"><Smartphone className="h-5 w-5" /></div>
            <div>
              <DialogTitle>Install WorldStories</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">Add the app to your home screen for faster access and offline reading.</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {canPromptInstall && (
            <Button onClick={() => void installApp()}><Download className="h-4 w-4" />Install app</Button>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-4">
              <h3 className="flex items-center gap-2 font-semibold"><MoreVertical className="h-4 w-4" />Android</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Open WorldStories in Chrome.</li>
                <li>Tap the three-dot menu in the top-right corner.</li>
                <li>Choose <span className="font-medium text-foreground">Install app</span> or <span className="font-medium text-foreground">Add to Home screen</span>.</li>
                <li>Confirm by tapping Install.</li>
              </ol>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <h3 className="flex items-center gap-2 font-semibold"><Share className="h-4 w-4" />iPhone or iPad</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Open WorldStories in Safari.</li>
                <li>Tap the Share button in Safari’s toolbar.</li>
                <li>Scroll down and choose <span className="font-medium text-foreground">Add to Home Screen</span>.</li>
                <li>Tap Add in the top-right corner.</li>
              </ol>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
