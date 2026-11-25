import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eraser,
  Sparkles,
  Square,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  type AdminMiniClue,
  type ClueBankItem,
  extractAnswerClient,
  miniApi,
  numberGridClient,
  useAdminApproveMini,
  useAdminDraftClues,
  useAdminGenerateFill,
  useAdminMini,
  useAdminSaveMini,
  useAdminUnapproveMini,
} from "@/lib/games/miniCrossword";

const DEFAULT_PATTERN = ["....#", ".....", ".....", ".....", "#...."];

function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminMiniCrosswordEdit() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const numericId = id ? Number(id) : null;
  const { data: existing, isLoading } = useAdminMini(numericId);

  const [date, setDate] = useState(searchParams.get("date") || todayIsoUtc());
  const [title, setTitle] = useState("");
  const [pattern, setPattern] = useState<string[]>(DEFAULT_PATTERN);
  const [solution, setSolution] = useState<string[]>(DEFAULT_PATTERN);
  const [clues, setClues] = useState<AdminMiniClue[]>([]);
  const [activeCell, setActiveCell] = useState<[number, number]>([0, 0]);
  const [blackToggleMode, setBlackToggleMode] = useState(false);

  // Fill generator options
  const [fillOptions, setFillOptions] = useState<string[][]>([]);

  // Clue suggestions dropdown per entry key
  const [openSuggestKey, setOpenSuggestKey] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ClueBankItem[]>([]);

  // Live validation
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const saveMutation = useAdminSaveMini();
  const approveMutation = useAdminApproveMini();
  const unapproveMutation = useAdminUnapproveMini();
  const genFillMutation = useAdminGenerateFill();
  const draftCluesMutation = useAdminDraftClues();

  const isLocked = Boolean(numericId && existing?.locked_for_edit);

  useEffect(() => {
    if (!existing) return;
    setDate(existing.date);
    setTitle(existing.title || "");
    setPattern(existing.pattern);
    setSolution(existing.solution);
    setClues(existing.clues || []);
  }, [existing]);

  const { numbering, entries } = useMemo(() => numberGridClient(pattern), [pattern]);

  // Keep clues array synchronized with current grid entries
  const syncedClues: AdminMiniClue[] = useMemo(() => {
    const byKey = new Map<string, AdminMiniClue>();
    for (const c of clues) {
      byKey.set(`${c.number}-${c.direction}`, c);
    }
    return entries.map((e) => {
      const key = `${e.number}-${e.direction}`;
      const existingClue = byKey.get(key);
      const ans = extractAnswerClient(solution, e);
      return {
        number: e.number,
        direction: e.direction,
        answer: ans,
        clue: existingClue?.clue ?? "",
        story_id: existingClue?.story_id ?? null,
      };
    });
  }, [entries, clues, solution]);

  // Debounced live validation
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const res = await miniApi.adminValidate({
          pattern,
          solution,
          clues: syncedClues,
          exclude_puzzle_id: numericId,
        });
        setErrors(res.errors);
        setWarnings(res.warnings);
      } catch {
        // ignore transient errors
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [pattern, solution, syncedClues, numericId]);

  const toggleBlackAt = (r: number, c: number) => {
    if (isLocked) return;
    const isCurrentlyBlack = pattern[r][c] === "#";
    const nextPat = pattern.map((rowStr, ri) => {
      if (ri !== r) return rowStr;
      const chars = rowStr.split("");
      chars[c] = isCurrentlyBlack ? "." : "#";
      return chars.join("");
    });
    const nextSol = solution.map((rowStr, ri) => {
      if (ri !== r) return rowStr;
      const chars = rowStr.split("");
      chars[c] = isCurrentlyBlack ? "." : "#";
      return chars.join("");
    });
    setPattern(nextPat);
    setSolution(nextSol);
  };

  const setLetterAt = (r: number, c: number, ch: string) => {
    if (isLocked || pattern[r][c] === "#") return;
    setSolution((prev) =>
      prev.map((rowStr, ri) => {
        if (ri !== r) return rowStr;
        const chars = rowStr.split("");
        chars[c] = ch;
        return chars.join("");
      })
    );
  };

  const handleCellClick = (r: number, c: number, shiftKey: boolean) => {
    setActiveCell([r, c]);
    if (blackToggleMode || shiftKey) {
      toggleBlackAt(r, c);
    }
  };

  const handleCellKeyDown = (r: number, c: number, e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isLocked) return;
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      setLetterAt(r, c, e.key.toUpperCase());
      if (c + 1 < 5) setActiveCell([r, c + 1]);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      setLetterAt(r, c, ".");
      if (c > 0) setActiveCell([r, c - 1]);
    } else if (e.key === "#") {
      e.preventDefault();
      toggleBlackAt(r, c);
    } else if (e.key === "ArrowUp" && r > 0) {
      e.preventDefault();
      setActiveCell([r - 1, c]);
    } else if (e.key === "ArrowDown" && r < 4) {
      e.preventDefault();
      setActiveCell([r + 1, c]);
    } else if (e.key === "ArrowLeft" && c > 0) {
      e.preventDefault();
      setActiveCell([r, c - 1]);
    } else if (e.key === "ArrowRight" && c < 4) {
      e.preventDefault();
      setActiveCell([r, c + 1]);
    }
  };

  const handleGenerateFill = () => {
    genFillMutation.mutate(
      { pattern },
      {
        onSuccess: (res) => {
          if (res.solutions.length === 0) {
            toast.error("No valid fill found for this pattern within 2 seconds.");
          } else {
            setFillOptions(res.solutions);
          }
        },
        onError: () => toast.error("Failed to generate fill."),
      }
    );
  };

  const handlePickFill = (sol: string[]) => {
    setSolution(sol);
    setFillOptions([]);
    draftCluesMutation.mutate(
      { pattern, solution: sol },
      {
        onSuccess: (res) => setClues(res.clues),
      }
    );
  };

  const handleDraftClues = () => {
    draftCluesMutation.mutate(
      { pattern, solution },
      {
        onSuccess: (res) => {
          setClues(res.clues);
          toast.success("Clues drafted from clue bank.");
        },
      }
    );
  };

  const handleClearLetters = () => {
    setSolution(pattern.map((row) => row));
  };

  const updateClueRow = (
    num: number,
    dir: "across" | "down",
    patch: Partial<AdminMiniClue>
  ) => {
    setClues(
      syncedClues.map((c) =>
        c.number === num && c.direction === dir ? { ...c, ...patch } : c
      )
    );
  };

  const openSuggestions = async (key: string, answer: string) => {
    if (openSuggestKey === key) {
      setOpenSuggestKey(null);
      return;
    }
    setOpenSuggestKey(key);
    try {
      const res = await miniApi.adminClueSuggestions(answer);
      setSuggestions(res.suggestions);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSaveDraft = async (): Promise<number | null> => {
    try {
      const saved = await saveMutation.mutateAsync({
        id: numericId ?? undefined,
        date,
        title,
        pattern,
        solution,
        clues: syncedClues,
      });
      toast.success("Draft saved.");
      if (!numericId) {
        navigate(`/admin/games/mini-crossword/${saved.id}`, { replace: true });
      }
      return saved.id;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save draft.");
      return null;
    }
  };

  const handleApprove = async () => {
    const savedId = await handleSaveDraft();
    if (!savedId) return;
    try {
      await approveMutation.mutateAsync(savedId);
      toast.success("Mini crossword approved and scheduled.");
      navigate("/admin/games/mini-crossword");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Approval failed.");
    }
  };

  if (numericId && isLoading) {
    return <div className="p-6 text-sm text-slate-600">Loading mini crossword...</div>;
  }

  const canApprove = !isLocked && errors.length === 0;

  return (
    <div className="h-full overflow-y-auto pr-1 pb-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/admin/games/mini-crossword"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Mini Crossword
            </Link>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {numericId ? `Edit Mini #${existing?.number ?? numericId}` : "New Mini Crossword"}
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
              onClick={() =>
                unapproveMutation.mutate(numericId, {
                  onSuccess: () => toast.success("Moved back to draft."),
                })
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Move to draft
            </button>
          )}
        </div>

        {isLocked && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            This mini crossword already has player attempts. Pattern, solution, and clues are
            locked.
          </div>
        )}

        {/* Date + Theme */}
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label htmlFor="mini-date" className="block text-xs font-semibold text-slate-700">
              Date (UTC)
            </label>
            <input
              id="mini-date"
              type="date"
              value={date}
              disabled={isLocked}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
          </div>
          <div>
            <label htmlFor="mini-title" className="block text-xs font-semibold text-slate-700">
              Theme / title (optional)
            </label>
            <input
              id="mini-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Poe and Gothic"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
          </div>
        </div>

        {/* Main Workspace: Grid Editor + Validation */}
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* 5x5 Interactive Grid Editor */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">5x5 Grid</h2>
              <button
                type="button"
                aria-pressed={blackToggleMode}
                disabled={isLocked}
                onClick={() => setBlackToggleMode((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  blackToggleMode
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800"
                }`}
              >
                <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                {blackToggleMode ? "Black mode: ON" : "Toggle blacks"}
              </button>
            </div>

            <div className="mx-auto grid w-64 grid-cols-5 gap-[1px] border-2 border-slate-900 bg-slate-900">
              {pattern.map((rowStr, r) =>
                rowStr.split("").map((ch, c) => {
                  const isBlack = ch === "#";
                  const num = numbering[r]?.[c];
                  const letter = solution[r]?.[c];
                  const isActive = activeCell[0] === r && activeCell[1] === c;
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      disabled={isLocked}
                      onClick={(e) => handleCellClick(r, c, e.shiftKey)}
                      onKeyDown={(e) => handleCellKeyDown(r, c, e)}
                      aria-label={`Row ${r + 1} Col ${c + 1} ${isBlack ? "black" : letter || "empty"}`}
                      className={`relative flex aspect-square items-center justify-center text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                        isBlack
                          ? "bg-slate-900 text-white"
                          : isActive
                          ? "bg-sky-100 text-slate-900 ring-2 ring-inset ring-slate-900"
                          : "bg-white text-slate-900"
                      }`}
                    >
                      {!isBlack && num && (
                        <span className="absolute left-0.5 top-0.5 text-[9px] font-bold text-slate-500">
                          {num}
                        </span>
                      )}
                      {!isBlack && letter && letter !== "." ? letter : ""}
                    </button>
                  );
                })
              )}
            </div>

            <p className="text-xs text-slate-600">
              Click a square and type letters (arrows move). Shift+click or use &ldquo;Toggle
              blacks&rdquo; to place black squares.
            </p>

            {!isLocked && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateFill}
                  disabled={genFillMutation.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {genFillMutation.isPending ? "Generating..." : "Generate fill"}
                </button>
                <button
                  type="button"
                  onClick={handleClearLetters}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear letters
                </button>
              </div>
            )}

            {/* Generated Fill Options */}
            {fillOptions.length > 0 && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold text-slate-700">
                  Pick a generated fill ({fillOptions.length}):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {fillOptions.map((sol, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePickFill(sol)}
                      className="rounded-lg border border-slate-300 bg-slate-50 p-2 font-mono text-[10px] leading-tight text-slate-900 hover:border-slate-900 hover:bg-white"
                    >
                      {sol.map((rStr, ri) => (
                        <div key={ri}>{rStr}</div>
                      ))}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right: Clue Table + Live Validation */}
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Clues ({syncedClues.filter((c) => c.clue.trim()).length}/{syncedClues.length})
                  </h2>
                  <p className="text-xs text-slate-600">
                    Clues must be original or from public-domain sources.
                  </p>
                </div>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleDraftClues}
                    disabled={draftCluesMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Draft from clue bank
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {syncedClues.map((c) => {
                  const key = `${c.number}-${c.direction}`;
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-20 font-mono text-xs font-bold uppercase text-slate-700">
                          {c.number}-{c.direction.slice(0, 1)}
                        </span>
                        <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-white">
                          {c.answer}
                        </span>
                        <input
                          type="text"
                          value={c.clue}
                          disabled={isLocked}
                          onChange={(e) =>
                            updateClueRow(c.number, c.direction, { clue: e.target.value })
                          }
                          placeholder={`Clue for ${c.answer}...`}
                          aria-label={`Clue for ${c.number} ${c.direction}`}
                          className="h-8 flex-1 min-w-[200px] rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-900"
                        />
                        {!isLocked && !c.answer.includes(".") && (
                          <button
                            type="button"
                            onClick={() => openSuggestions(key, c.answer)}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Bank
                          </button>
                        )}
                        <input
                          type="number"
                          value={c.story_id ?? ""}
                          disabled={isLocked}
                          onChange={(e) =>
                            updateClueRow(c.number, c.direction, {
                              story_id: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          placeholder="Story ID"
                          aria-label={`Linked story ID for ${c.number} ${c.direction}`}
                          className="h-8 w-24 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900"
                        />
                      </div>

                      {openSuggestKey === key && (
                        <div className="rounded-md border border-slate-200 bg-white p-2 space-y-1">
                          {suggestions.length === 0 ? (
                            <p className="text-xs text-slate-500">
                              No saved clues for {c.answer} in Clue Bank.
                            </p>
                          ) : (
                            suggestions.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  updateClueRow(c.number, c.direction, {
                                    clue: s.clue,
                                    story_id: s.story_id,
                                  });
                                  setOpenSuggestKey(null);
                                }}
                                className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-slate-100"
                              >
                                <span className="text-slate-900">{s.clue}</span>
                                <span className="text-slate-500">used {s.times_used}x</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Live Validation Panel */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">Validation</h2>
              {errors.length === 0 ? (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  All pattern, word, and clue checks passed.
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-red-800 list-disc pl-5">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold text-amber-950">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Warnings (non-blocking)
                  </p>
                  <ul className="list-disc pl-5 text-xs text-amber-900">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <Link
            to="/admin/games/mini-crossword"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isLocked || saveMutation.isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save draft"}
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={!canApprove || approveMutation.isPending || saveMutation.isPending}
              title={!canApprove ? errors[0] || "Fix validation errors first" : undefined}
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
