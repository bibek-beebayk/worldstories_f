import { cn } from "@/lib/utils";

interface AudioErrorMessageProps {
  message: string | null | undefined;
  className?: string;
}

/** Inline playback error text. Renders nothing when `message` is empty. */
export function AudioErrorMessage({ message, className }: AudioErrorMessageProps) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("text-center text-sm text-rose-200 sm:text-left", className)}>
      {message}
    </p>
  );
}
