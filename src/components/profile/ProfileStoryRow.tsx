import { Link } from "react-router";
import CoverImage from "@/components/CoverImage";

// Replaces the old full-width, text-only rows across the Reader page's 6
// list views (reading/completed/history/listening/favorites/reviews) with a
// cover thumbnail + content layout — CoverImage already falls back to a
// generated placeholder when a story has no real cover, so this degrades
// gracefully rather than needing its own "no image" branch.
const ProfileStoryRow = ({
  coverImage,
  title,
  author,
  linkTo,
  children,
}: {
  coverImage: string;
  title: string;
  author?: string | null;
  linkTo: string;
  children: React.ReactNode;
}) => (
  <div className="flex min-w-0 gap-3 overflow-hidden rounded-md border p-3 sm:p-4">
    <Link to={linkTo} className="block shrink-0">
      <div className="h-24 w-16 overflow-hidden rounded shadow-sm sm:h-28 sm:w-20">
        <CoverImage src={coverImage} alt={title} author={author} className="h-full w-full object-cover" />
      </div>
    </Link>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export default ProfileStoryRow;
