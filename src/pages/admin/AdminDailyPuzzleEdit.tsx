import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PUZZLE_TYPE_META,
  type AdminClueItem,
  type AnswerKind,
  type AuthorSearchResult,
  type LeakIssue,
  type PuzzleType,
  type SearchResultItem,
  type StorySearchResult,
  gamesApi,
  useAdminApprovePuzzle,
  useAdminBuildClues,
  useAdminCandidates,
  useAdminPuzzle,
  useAdminSavePuzzle,
  useAdminUnapprovePuzzle,
  useSearch,
} from "@/lib/games/nameThatStory";

const PUZZLE_TYPES: PuzzleType[] = ["opening_line", "quote", "trivia", "author_bio"];

const STORY_ATTR_OPTIONS = [
  { key: "genre", label: "Genre" },
  { key: "country", label: "Country" },
  { key: "era", label: "Era" },
  { key: "length", label: "Length" },
  { key: "initials", label: "Author initials" },
];

const AUTHOR_ATTR_OPTIONS = [
  { key: "genre", label: "Genres" },
  { key: "works_sample", label: "Notable work" },
  { key: "country", label: "Country" },
  { key: "era", label: "Era" },
  { key: "works_count", label: "Published works" },
  { key: "initials", label: "Initials" },
];

function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDailyPuzzleEdit() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const numericId = id ? Number(id) : null;
  const duplicateFromId = searchParams.get("duplicateFrom")
    ? Number(searchParams.get("duplicateFrom"))
    : null;

  const { data: existing, isLoading } = useAdminPuzzle(numericId || duplicateFromId);

  const [date, setDate] = useState(searchParams.get("date") || todayIsoUtc());
  const [puzzleType, setPuzzleType] = useState<PuzzleType>(
    (searchParams.get("type") as PuzzleType) || "opening_line"
  );
  const [answerId, setAnswerId] = useState<number | null>(null);
  const [answerLabel, setAnswerLabel] = useState("");
  const [answerSearch, setAnswerSearch] = useState("");
  const [showAnswerList, setShowAnswerList] = useState(false);
  const [difficulty, setDifficulty] = useState("");
  const [clues, setClues] = useState<AdminClueItem[]>([]);

  // Candidate picker modal/panel for opening_line & quote
  const [showCandidatePicker, setShowCandidatePicker] = useState(false);
  const [selectedCandidateText, setSelectedCandidateText] = useState<string>("");
  const [customLineMode, setCustomLineMode] = useState(false);
  const [customLineText, setCustomLineText] = useState("");

  // Live validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [leaks, setLeaks] = useState<LeakIssue[]>([]);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const answerKind: AnswerKind = puzzleType === "author_bio" ? "author" : "story";
  const attrOptions = answerKind === "author" ? AUTHOR_ATTR_OPTIONS : STORY_ATTR_OPTIONS;
  const isLocked = Boolean(numericId && existing?.locked_for_edit);

  const { data: searchData } = useSearch(answerSearch, undefined, answerKind);
  const { data: candidatesData } = useAdminCandidates(puzzleType, answerKind, answerId);
  const buildCluesMutation = useAdminBuildClues();
  const saveMutation = useAdminSavePuzzle();
  const approveMutation = useAdminApprovePuzzle();
  const unapproveMutation = useAdminUnapprovePuzzle();

  // Populate from loaded puzzle (edit or duplicate)
  useEffect(() => {
    if (!existing) return;
    if (numericId) {
      setDate(existing.date);
    } else if (duplicateFromId) {
      setDate(todayIsoUtc());
    }
    setPuzzleType(existing.puzzle_type);
    setAnswerId(existing.answer_id);
    setAnswerLabel(existing.answer_label);
    setDifficulty(existing.difficulty || "");
    setClues(existing.clues || []);
  }, [existing, numericId, duplicateFromId]);

  // Debounced live validate call
  useEffect(() => {
    if (!answerId) {
      setValidationErrors(["Select an answer before approving."]);
      setLeaks([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await gamesApi.adminValidate({
          puzzle_type: puzzleType,
          answer_kind: answerKind,
          answer_id: answerId,
          clues,
        });
        setValidationErrors(res.errors);
        setLeaks(res.leaks);
      } catch {
        // ignore transient errors
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [puzzleType, answerKind, answerId, clues]);

  const leaksByClue = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const leak of leaks) {
      const arr = map.get(leak.clue_index) ?? [];
      arr.push(leak.term);
      map.set(leak.clue_index, arr);
    }
    return map;
  }, [leaks]);

  const handleTypeChange = (nextType: PuzzleType) => {
    if (isLocked || nextType === puzzleType) return;
    const prevKind = answerKind;
    const nextKind: AnswerKind = nextType === "author_bio" ? "author" : "story";
    setPuzzleType(nextType);
    setShowCandidatePicker(false);
    if (prevKind !== nextKind) {
      setAnswerId(null);
      setAnswerLabel("");
      setAnswerSearch("");
      setClues([]);
    }
  };

  const handleSelectAnswer = (item: SearchResultItem) => {
    const label =
      answerKind === "author"
        ? (item as AuthorSearchResult).name
        : (item as StorySearchResult).title;
    setAnswerId(item.id);
    setAnswerLabel(label);
    setAnswerSearch("");
    setShowAnswerList(false);
  };

  const moveClue = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= clues.length) return;
    setClues((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      copy.splice(target, 0, removed);
      return copy;
    });
  };

  const deleteClue = (index: number) => {
    setClues((prev) => prev.filter((_, i) => i !== index));
  };

  const updateClue = (index: number, patch: Partial<AdminClueItem>) => {
    setClues((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const addClue = (kind: "text" | "attribute" | "cover") => {
    if (clues.length >= 6) return;
    if (kind === "text") {
      setClues((prev) => [
        ...prev,
        { kind: "text", label: `Clue ${prev.length + 1}`, value: "" },
      ]);
    } else if (kind === "attribute") {
      const usedKeys = new Set(clues.filter((c) => c.kind === "attribute").map((c) => c.key));
      const nextOpt = attrOptions.find((o) => !usedKeys.has(o.key)) ?? attrOptions[0];
      setClues((prev) => [
        ...prev,
        { kind: "attribute", key: nextOpt.key, label: nextOpt.label },
      ]);
    } else {
      setClues((prev) => [...prev, { kind: "cover", label: "Blurred cover" }]);
    }
  };

  const handleBuildClick = () => {
    if (!answerId) return;
    if (puzzleType === "opening_line" || puzzleType === "quote") {
      const cands = candidatesData?.candidates ?? [];
      if (cands.length > 0) {
        setSelectedCandidateText(cands[0].text);
        setCustomLineMode(false);
      } else {
        setCustomLineMode(true);
      }
      setShowCandidatePicker(true);
      return;
    }

    buildCluesMutation.mutate(
      { type: puzzleType, answer_kind: answerKind, answer_id: answerId },
      {
        onSuccess: (res) => {
          if (puzzleType === "trivia" && res.fallback_attributes) {
            setClues((prev) => [...prev, ...res.fallback_attributes!].slice(0, 6));
            toast.success("Appended genre, country, and era clues.");
          } else {
            setClues(res.clues);
            toast.success("Clues built from author data.");
          }
        },
        onError: () => toast.error("Could not build clues."),
      }
    );
  };

  const handleApplyCandidateBuild = () => {
    if (!answerId) return;
    const chosen = customLineMode ? customLineText.trim() : selectedCandidateText;
    buildCluesMutation.mutate(
      {
        type: puzzleType,
        answer_kind: answerKind,
        answer_id: answerId,
        chosen_text: chosen,
      },
      {
        onSuccess: (res) => {
          setClues(res.clues);
          setShowCandidatePicker(false);
          toast.success("Clue ladder built.");
        },
        onError: () => toast.error("Could not build clues."),
      }
    );
  };

  const handleSaveDraft = async (): Promise<number | null> => {
    if (!answerId) {
      toast.error("Please select an answer first.");
      return null;
    }
    setServerErrors([]);
    try {
      const saved = await saveMutation.mutateAsync({
        id: numericId ?? undefined,
        date,
        puzzle_type: puzzleType,
        answer_id: answerId,
        clues,
        difficulty: difficulty || undefined,
      });
      toast.success("Draft saved.");
      if (!numericId) {
        navigate(`/admin/games/daily-puzzle/${saved.id}`, { replace: true });
      }
      return saved.id;
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message ? err.message : "Could not save puzzle.";
      setServerErrors([msg]);
      toast.error(msg);
      return null;
    }
  };

  const handleApproveAndSchedule = async () => {
    const savedId = await handleSaveDraft();
    if (!savedId) return;
    try {
      await approveMutation.mutateAsync(savedId);
      toast.success("Puzzle approved and scheduled.");
      navigate("/admin/games/daily-puzzle");
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message ? err.message : "Approval failed.";
      setServerErrors([msg]);
      toast.error(msg);
    }
  };

  const handleUnapprove = () => {
    if (!numericId) return;
    unapproveMutation.mutate(numericId, {
      onSuccess: () => toast.success("Puzzle moved back to draft."),
      onError: (err: unknown) => {
        const msg = err instanceof Error && err.message ? err.message : "Could not unapprove.";
        toast.error(msg);
      },
    });
  };

  if (numericId && isLoading) {
    return <div className="p-6 text-sm text-slate-600">Loading puzzle...</div>;
  }

  const canApprove = !isLocked && Boolean(answerId) && validationErrors.length === 0;

  return (
    <div className="h-full overflow-y-auto pr-1 pb-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/admin/games/daily-puzzle"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Daily Puzzle
            </Link>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {numericId ? `Edit Puzzle #${existing?.number ?? numericId}` : "New Daily Puzzle"}
              </h1>
              {existing && numericId && (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    existing.approval_status === "approved"
                      ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                      : "border-amber-300 bg-amber-100 text-amber-950"
                  }`}
                >
                  {existing.approval_status === "approved" ? "Approved" : "Draft"}
                </span>
              )}
            </div>
          </div>

          {numericId && existing?.approval_status === "approved" && existing.attempts_count === 0 && (
            <button
              type="button"
              onClick={handleUnapprove}
              disabled={unapproveMutation.isPending}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Move to draft
            </button>
          )}
        </div>

        {isLocked && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            This puzzle is live or in the past and already has player attempts. Its answer and clues
            are locked.
          </div>
        )}

        {/* Section 1: Type, Date & Answer */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          {/* Segmented Puzzle Type Selector */}
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Puzzle type
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Puzzle type">
              {PUZZLE_TYPES.map((t) => {
                const active = puzzleType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={isLocked}
                    onClick={() => handleTypeChange(t)}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    } disabled:opacity-60`}
                  >
                    {PUZZLE_TYPE_META[t].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="puzzle-date" className="block text-xs font-semibold text-slate-700">
                Date (UTC)
              </label>
              <input
                id="puzzle-date"
                type="date"
                value={date}
                disabled={isLocked}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">Answer is</span>
              <div className="mt-1 flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800">
                {answerKind === "author" ? "Author" : "Story"}
              </div>
            </div>

            <div>
              <label
                htmlFor="puzzle-difficulty"
                className="block text-xs font-semibold text-slate-700"
              >
                Difficulty
              </label>
              <select
                id="puzzle-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <option value="">Auto-compute</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Answer Search Select */}
          <div className="relative">
            <label htmlFor="answer-search" className="block text-xs font-semibold text-slate-700">
              {answerKind === "author" ? "Select author" : "Select story"}
            </label>
            {answerId && answerLabel && (
              <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-900">{answerLabel}</span>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnswerId(null);
                      setAnswerLabel("");
                    }}
                    className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
                  >
                    Change
                  </button>
                )}
              </div>
            )}

            {(!answerId || !answerLabel) && (
              <div className="relative mt-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="answer-search"
                  type="text"
                  value={answerSearch}
                  disabled={isLocked}
                  onChange={(e) => {
                    setAnswerSearch(e.target.value);
                    setShowAnswerList(e.target.value.trim().length >= 2);
                  }}
                  placeholder={
                    answerKind === "author"
                      ? "Type at least 2 characters to search authors..."
                      : "Type at least 2 characters to search stories..."
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />

                {showAnswerList && (searchData?.results ?? []).length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {(searchData?.results ?? []).map((item) => {
                      const label =
                        answerKind === "author"
                          ? (item as AuthorSearchResult).name
                          : (item as StorySearchResult).title;
                      const sub =
                        answerKind === "author"
                          ? (item as AuthorSearchResult).subtitle
                          : (item as StorySearchResult).author;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectAnswer(item)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100"
                          >
                            <span className="font-medium text-slate-900">{label}</span>
                            {sub && <span className="text-xs text-slate-500">{sub}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Clue Ladder Editor */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Clue ladder ({clues.length}/6)
              </h2>
              <p className="text-xs text-slate-600">
                Ordered hardest (1) to easiest (6). Requires 4 to 6 clues.
              </p>
            </div>

            {!isLocked && answerId && (
              <button
                type="button"
                onClick={handleBuildClick}
                disabled={buildCluesMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                {puzzleType === "author_bio"
                  ? "Build from author"
                  : puzzleType === "trivia"
                  ? "Append genre, country & era"
                  : "Build from story"}
              </button>
            )}
          </div>

          {/* Candidate Picker for opening_line / quote */}
          {showCandidatePicker && (
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Choose clue 1 line
              </p>
              <div className="space-y-2">
                {(candidatesData?.candidates ?? []).map((cand) => (
                  <label
                    key={cand.index}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="candidate-line"
                      checked={!customLineMode && selectedCandidateText === cand.text}
                      onChange={() => {
                        setCustomLineMode(false);
                        setSelectedCandidateText(cand.text);
                      }}
                      className="mt-1"
                    />
                    <span className="flex-1 text-slate-900">
                      {cand.text}
                      <span className="ml-2 text-xs text-slate-500">
                        ({cand.word_count} words)
                      </span>
                    </span>
                  </label>
                ))}

                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <input
                    type="radio"
                    name="candidate-line"
                    checked={customLineMode}
                    onChange={() => setCustomLineMode(true)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <span className="font-medium text-slate-900">Write my own line</span>
                    {customLineMode && (
                      <textarea
                        rows={2}
                        value={customLineText}
                        onChange={(e) => setCustomLineText(e.target.value)}
                        placeholder="Enter opening line or quote..."
                        className="w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
                      />
                    )}
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCandidatePicker(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCandidateBuild}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Apply to ladder
                </button>
              </div>
            </div>
          )}

          {/* Clue Rows */}
          <ol className="space-y-3">
            {clues.map((clue, idx) => {
              const clueLeaks = leaksByClue.get(idx) ?? [];
              return (
                <li
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={clue.label}
                        disabled={isLocked}
                        onChange={(e) => updateClue(idx, { label: e.target.value })}
                        aria-label={`Clue ${idx + 1} label`}
                        className="h-8 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900"
                      />
                      {clue.kind !== "text" && (
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-700">
                          Auto
                        </span>
                      )}
                    </div>

                    {!isLocked && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveClue(idx, -1)}
                          disabled={idx === 0}
                          aria-label={`Move clue ${idx + 1} up`}
                          className="rounded p-1 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveClue(idx, 1)}
                          disabled={idx === clues.length - 1}
                          aria-label={`Move clue ${idx + 1} down`}
                          className="rounded p-1 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteClue(idx)}
                          aria-label={`Delete clue ${idx + 1}`}
                          className="rounded p-1 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>

                  {clue.kind === "text" && (
                    <textarea
                      rows={2}
                      value={clue.value || ""}
                      disabled={isLocked}
                      onChange={(e) => updateClue(idx, { value: e.target.value })}
                      placeholder="Write clue text..."
                      aria-label={`Clue ${idx + 1} text`}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                    />
                  )}

                  {clue.kind === "attribute" && (
                    <select
                      value={clue.key || attrOptions[0].key}
                      disabled={isLocked}
                      onChange={(e) => {
                        const opt = attrOptions.find((o) => o.key === e.target.value);
                        updateClue(idx, {
                          key: e.target.value,
                          label: opt ? opt.label : clue.label,
                        });
                      }}
                      aria-label={`Clue ${idx + 1} attribute`}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900"
                    >
                      {attrOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label} ({opt.key})
                        </option>
                      ))}
                    </select>
                  )}

                  {clue.kind === "cover" && (
                    <p className="text-xs text-slate-600">
                      Serves the blurred cover image when unlocked (resolved automatically).
                    </p>
                  )}

                  {clueLeaks.length > 0 && (
                    <div
                      role="alert"
                      className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                      <span>
                        Potential answer leak: {clueLeaks.map((t) => `"${t}"`).join(", ")}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {/* Add Clue Buttons */}
          {!isLocked && clues.length < 6 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => addClue("text")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add text clue
              </button>
              <button
                type="button"
                onClick={() => addClue("attribute")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add attribute clue
              </button>
              <button
                type="button"
                onClick={() => addClue("cover")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add cover clue
              </button>
            </div>
          )}
        </section>

        {/* Validation Summary */}
        {(validationErrors.length > 0 || serverErrors.length > 0) && (
          <div
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-1"
          >
            <p className="font-semibold">Fix before approving:</p>
            <ul className="list-disc pl-5 text-xs space-y-0.5">
              {[...new Set([...validationErrors, ...serverErrors])].map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <Link
            to="/admin/games/daily-puzzle"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isLocked || saveMutation.isPending || !answerId}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save draft"}
            </button>

            <button
              type="button"
              onClick={handleApproveAndSchedule}
              disabled={!canApprove || approveMutation.isPending || saveMutation.isPending}
              title={!canApprove ? validationErrors[0] || "Fix validation issues first" : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {approveMutation.isPending ? "Approving..." : "Approve and schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
