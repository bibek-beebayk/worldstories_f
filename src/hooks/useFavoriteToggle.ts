import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";

interface FavoritableStory {
  is_favorite?: boolean;
  favorites_count?: number;
}

// Shared favorite/save state + toggle, extracted from StoryDetail so
// StorySummary (Quick Read) can offer the same save action without
// duplicating the request/cache-invalidation logic.
export function useFavoriteToggle(slug: string | undefined, story: FavoritableStory | undefined) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const queryClient = useQueryClient();
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();

  useEffect(() => {
    if (!story) return;
    setIsFavorite(Boolean(story.is_favorite));
    setFavoritesCount(story.favorites_count || 0);
  }, [story]);

  const toggleFavorite = async () => {
    if (!slug) return;
    setFavoriteError("");

    if (!isAuthenticated) {
      setFavoriteError("Please log in to favorite stories.");
      openLoginModal();
      return;
    }

    setFavoriteLoading(true);
    try {
      const response = isFavorite
        ? await storyApi.removeFavorite(slug)
        : await storyApi.addFavorite(slug);
      setIsFavorite(response.is_favorite);
      setFavoritesCount(response.favorites_count);
      await queryClient.invalidateQueries({ queryKey: ["story", slug] });
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update favorite.";
      setFavoriteError(message);
    } finally {
      setFavoriteLoading(false);
    }
  };

  return { isFavorite, favoritesCount, favoriteLoading, favoriteError, toggleFavorite };
}
