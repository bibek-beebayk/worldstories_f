import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Star, X } from "lucide-react";
import {
  feedbackApi,
  FEEDBACK_CATEGORIES,
  FEEDBACK_IMAGE_ACCEPT,
  MAX_FEEDBACK_IMAGE_BYTES,
  MAX_FEEDBACK_IMAGES,
} from "@/api/feedback";
import type { FeedbackCategory } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

const MAX_MESSAGE_LENGTH = 5000;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackDialog = ({ open, onOpenChange }: FeedbackDialogProps) => {
  const isLoggedIn = useIsLoggedIn();
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addImages = (fileList: FileList | null) => {
    const picked = Array.from(fileList ?? []);
    const tooLarge = picked.filter((file) => file.size > MAX_FEEDBACK_IMAGE_BYTES);
    if (tooLarge.length) toast.error(`Images must be under ${MAX_FEEDBACK_IMAGE_BYTES / 1024 / 1024} MB each.`);
    const accepted = picked.filter((file) => file.size <= MAX_FEEDBACK_IMAGE_BYTES && file.type.startsWith("image/"));
    const room = MAX_FEEDBACK_IMAGES - images.length;
    if (accepted.length > room) toast.error(`You can attach up to ${MAX_FEEDBACK_IMAGES} images.`);
    setImages((current) => [...current, ...accepted.slice(0, room)]);
    // Clear the input so picking the same file again after removing it still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    setCategory("idea");
    setRating(null);
    setMessage("");
    setEmail("");
    setImages([]);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 3) {
      toast.error("Please tell us a little more.");
      return;
    }
    try {
      setSubmitting(true);
      await feedbackApi.submit({
        category,
        rating,
        message: message.trim(),
        email: isLoggedIn ? undefined : email.trim() || undefined,
        page_url: `${window.location.pathname}${window.location.search}`,
        images,
      });
      toast.success("Thanks for your feedback!");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>Found a bug or have an idea? We read every message.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>What's it about?</Label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_CATEGORIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  aria-pressed={category === option.value}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    category === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>How's your experience so far? <span className="text-muted-foreground">(optional)</span></Label>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  // Clicking the current rating again clears it, since it's optional.
                  onClick={() => setRating((current) => (current === value ? null : value))}
                  className="rounded p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 ${
                      rating !== null && value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">Your feedback</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Tell us what's working, what isn't, or what you'd like to see…"
              className="min-h-32"
              required
            />
            <p className="text-right text-xs text-muted-foreground">
              {message.length} / {MAX_MESSAGE_LENGTH}
            </p>
          </div>

          <div className="space-y-2">
            <Label>
              Screenshots{" "}
              <span className="text-muted-foreground">
                (optional, up to {MAX_FEEDBACK_IMAGES})
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {previews.map((url, index) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-md border">
                  <img src={url} alt={`Attachment ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                    aria-label={`Remove attachment ${index + 1}`}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < MAX_FEEDBACK_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted"
                >
                  <ImagePlus className="h-5 w-5" />
                  Add
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={FEEDBACK_IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => addImages(e.target.files)}
            />
          </div>

          {!isLoggedIn && (
            <div className="space-y-2">
              <Label htmlFor="feedback-email">
                Email <span className="text-muted-foreground">(optional, if you'd like a reply)</span>
              </Label>
              <Input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !message.trim()}>
              {submitting ? "Sending..." : "Send feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
