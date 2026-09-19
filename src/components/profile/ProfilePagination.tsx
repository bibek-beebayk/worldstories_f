import { Button } from "@/components/ui/button";

const ProfilePagination = ({
  page,
  pages,
  onPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) => {
  if (!pages || pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">
        Page {page} of {pages}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= pages}
        onClick={() => onPageChange(Math.min(pages, page + 1))}
      >
        Next
      </Button>
    </div>
  );
};

export default ProfilePagination;
