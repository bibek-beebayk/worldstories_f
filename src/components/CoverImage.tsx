import { ImgHTMLAttributes, SyntheticEvent, useEffect, useMemo, useState } from "react";
import { buildFallbackCoverDataUri } from "@/lib/fallbackCover";

type CoverImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  // Shown on the generated placeholder when there's no real cover image (or
  // it fails to load). Defaults to `alt`, since nearly every caller already
  // passes the story's title there — pass `title` explicitly only when `alt`
  // is something else (e.g. left empty for a decorative background image).
  title?: string;
  author?: string | null;
};

const CoverImage = ({ src, alt, title, author, onError, ...props }: CoverImageProps) => {
  const fallbackTitle = title || (typeof alt === "string" ? alt : "") || "Untitled Story";
  const fallbackSrc = useMemo(
    () => buildFallbackCoverDataUri(fallbackTitle, author),
    [fallbackTitle, author]
  );
  const requestedSrc = typeof src === "string" && src.trim() ? src : fallbackSrc;
  const [resolvedSrc, setResolvedSrc] = useState(requestedSrc);

  useEffect(() => {
    setResolvedSrc(requestedSrc);
  }, [requestedSrc]);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    onError?.(event);
    if (resolvedSrc !== fallbackSrc) setResolvedSrc(fallbackSrc);
  };

  return <img {...props} src={resolvedSrc} alt={alt} onError={handleError} />;
};

export default CoverImage;
