import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";

interface GenreChipPickerProps {
  selectedIds: number[];
  onToggle: (id: number) => void;
}

const GenreChipPicker = ({ selectedIds, onToggle }: GenreChipPickerProps) => {
  const { data: genres, isLoading } = useQuery({
    queryKey: ["genres"],
    queryFn: storyApi.getGenres,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading genres...</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(genres || []).map((genre) => {
        const isSelected = selectedIds.includes(genre.id);
        return (
          <button
            key={genre.id}
            type="button"
            onClick={() => onToggle(genre.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/50"
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
};

export default GenreChipPicker;
