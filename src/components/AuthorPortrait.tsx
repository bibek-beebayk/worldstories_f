import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthorPortraitProps {
  src?: string | null;
  name: string;
  className?: string;
  imageClassName?: string;
}

export default function AuthorPortrait({
  src,
  name,
  className,
  imageClassName,
}: AuthorPortraitProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden tinted-panel [--tint:#8b5cf6] [--tint-2:#0ea5e9]",
        className
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-primary/70" aria-label={`${name} portrait unavailable`}>
          <UserRound className="h-10 w-10" aria-hidden="true" />
          <span className="text-xl font-bold tracking-wide">{initials || "A"}</span>
        </div>
      )}
    </div>
  );
}
