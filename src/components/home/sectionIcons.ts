import {
  BookOpen,
  Captions,
  Clock3,
  Compass,
  Crown,
  Feather,
  Flame,
  Gem,
  Globe2,
  Headphones,
  Heart,
  Leaf,
  Library,
  Mic2,
  Music,
  Newspaper,
  Rocket,
  Rss,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Youtube,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Keys the backend may store in HomeSection.icon
// (HOME_SECTION_ICON_NAMES in apps/story/models.py) — keep the two in step.
// The admin picks a name; it can never supply markup.
export const SECTION_ICONS: Record<string, LucideIcon> = {
  BookOpen, Zap, Youtube, Newspaper, Sparkles, Star, Flame, Headphones, Globe2, Heart,
  Clock3, Rss, Captions, Trophy, Crown, Music, Mic2, Feather, Leaf, Gem, Rocket, Sun,
  Compass, Library,
};

export const sectionIcon = (name: string | undefined): LucideIcon | undefined =>
  name ? SECTION_ICONS[name] : undefined;
