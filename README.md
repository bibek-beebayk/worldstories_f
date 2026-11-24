# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules. 

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Admin audiobooks

Routes under the admin shell (`src/routes.ts`, sidebar link in `src/layouts/AdminShellLayout.tsx`):

- `/admin/audiobooks` (`src/pages/admin/AdminAudiobooks.tsx`) — paginated list with URL-synced search/filters (`q`, `story_link`, `series`, `status`, `ordering`, `page`), 4 stat tiles, dismissible backfill notice, and Series management tab.
- `/admin/audiobooks/new` (`src/pages/admin/AdminAudiobookCreate.tsx`) — create standalone or story-linked audiobooks with initial `.mp3` track upload.
- `/admin/audiobooks/:id` (`src/pages/admin/AdminAudiobookEdit.tsx`) — two-column editor with story-inherited field indicators, track drag-and-drop/keyboard reorder, multi-file track uploader, transcript & read-along cue editor dialog (`AudioTranscriptImportPanel`), move-track dialog, cover/series/publishing sidebar controls, and live `AudiobookCard` preview.

Shared components live in `src/components/admin/audiobooks/` (`StatusChip`, `StoryPicker`, `TrackRow`, `AudiobookTracksCard`, `DeleteAudiobookDialog`, `SeriesDialog`, `MoveTrackDialog`), backed by React Query hooks in `src/hooks/useAdminAudiobooks.ts`.

## Public audiobooks & slug resolution (Phase 3)

- **Two-step slug resolution** (`src/lib/audiobookLoader.ts`): `/listen/:slug`, `/listen/:slug/:chapter_slug`, `/read-along/:slug`, and `/read-along/:slug/:audio_slug` resolve the first segment as an **Audiobook** slug first. If 404, they look up the slug as a **Story** slug and issue a **301 redirect** to the story's primary audiobook slug (preserving the track segment). Unknown slugs return a proper 404 status with `NotFoundBody`.
- **Canonical URL builder** (`src/lib/urls.ts`): all `/listen/...` and `/read-along/...` links use `audiobookUrl(audiobook, track?)` and `readAlongUrl(audiobook, track?)`.
- **Progress**: authenticated playback uses `/api/audio-progress/audiobook/<slug>/` via `useAudiobookProgress` / `useAudioProgress({ audiobookSlug })`, with server-side legacy fallback to story-keyed progress.
- **Phase 4 cleanup complete**: removed deprecated `useContinueListening` and `useAudiobookStats` hooks; all public audiobook pages, cards, player, and read-along routes use the public `/api/audiobooks/` and `/api/audio-progress/audiobook/<slug>/` APIs.

### How to add an audiobook (Admin)

1. Open **Content → Audiobooks** (`/admin/audiobooks`) and click **New audiobook**.
2. Choose **Standalone** (no linked story; requires Title, Author, Language, and About) or **Linked to a story** (pick an existing story; blank metadata fields inherit from the story).
3. Drop one or more `.mp3` files to create tracks (titles are inferred from filenames and durations are probed automatically), then click **Create audiobook**.
4. On the edit screen (`/admin/audiobooks/:id`), reorder tracks by drag-and-drop or arrow buttons, import `.vtt`/`.srt`/`.txt` transcripts for Read Along, optionally assign a Series and cover override, and toggle **Published** (or set a future publish date).
