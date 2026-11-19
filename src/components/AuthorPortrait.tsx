import { useEffect, useState } from "react";
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
        "relative flex items-center justify-center overflow-hidden bg-[#f3ead8] text-[#6f5940]",
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
          className={cn("h-full w-full object-cover object-top", imageClassName)}
        />
      ) : (
        <div className="flex items-center justify-center" aria-label={`${name} portrait unavailable`}>
          <span className="font-serif text-3xl font-semibold tracking-wide">{initials || "A"}</span>
        </div>
      )}
    </div>
  );
}
