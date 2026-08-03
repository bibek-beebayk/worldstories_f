import { ImgHTMLAttributes, SyntheticEvent, useEffect, useState } from "react";

const FALLBACK_COVER = "/fallback-cover.svg";

type CoverImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
};

const CoverImage = ({ src, alt, onError, ...props }: CoverImageProps) => {
  const requestedSrc = typeof src === "string" && src.trim() ? src : FALLBACK_COVER;
  const [resolvedSrc, setResolvedSrc] = useState(requestedSrc);

  useEffect(() => {
    setResolvedSrc(requestedSrc);
  }, [requestedSrc]);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    onError?.(event);
    if (resolvedSrc !== FALLBACK_COVER) setResolvedSrc(FALLBACK_COVER);
  };

  return <img {...props} src={resolvedSrc} alt={alt} onError={handleError} />;
};

export default CoverImage;
export { FALLBACK_COVER };
