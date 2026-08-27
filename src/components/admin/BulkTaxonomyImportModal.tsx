import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { storyApi } from "@/api/story";
import { TaxonomyFieldDiff, TaxonomyImportPreview, TaxonomyImportRow } from "@/api/types";
import { X } from "lucide-react";

interface BulkTaxonomyImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

type FieldKey = "tags" | "themes" | "genres";

function getFieldDiff(row: TaxonomyImportRow, field: FieldKey): TaxonomyFieldDiff {
  return {
    current: row[`current_${field}`],
    proposed: row[`proposed_${field}`],
    added: row[`${field}_added`],
    removed: row[`${field}_removed`],
  };
}

function fieldClause(label: string, diff: TaxonomyFieldDiff): string | null {
  if (diff.proposed === null) return null; // not touched by this row
  if (diff.added.length === 0 && diff.removed.length === 0) return `${label} unchanged`;
  const parts: string[] = [];
  if (diff.added.length) parts.push(`+${diff.added.length}`);
  if (diff.removed.length) parts.push(`−${diff.removed.length}`);
  return `${label} ${parts.join("/")}`;
}

function categoryClause(row: TaxonomyImportRow): string | null {
  if (row.proposed_categories === null) return null;
  if (row.category_forbidden_value) return `categories: ⚠ ${row.category_forbidden_value} not allowed`;
  const added = row.categories_added.length;
  const removed = row.categories_removed.length;
  const base =
    added === 0 && removed === 0
      ? "categories unchanged"
      : `categories ${[added ? `+${added}` : null, removed ? `−${removed}` : null].filter(Boolean).join("/")}`;
  return row.category_count_warning ? `${base} ⚠` : base;
}

function summaryLine(row: TaxonomyImportRow): string {
  const clauses = [
    fieldClause("tags", getFieldDiff(row, "tags")),
    fieldClause("themes", getFieldDiff(row, "themes")),
    fieldClause("genres", getFieldDiff(row, "genres")),
    categoryClause(row),
  ].filter((clause): clause is string => Boolean(clause));
  return clauses.length ? clauses.join(" · ") : "No changes proposed";
}

const FieldDetail = ({
  label,
  diff,
  newNames,
}: {
  label: string;
  diff: TaxonomyFieldDiff;
  newNames: string[];
}) => {
  if (diff.proposed === null) {
    return (
      <p>
        <span className="font-medium">{label}:</span> unchanged
      </p>
    );
  }
  return (
    <div>
      <p className="font-medium">{label}</p>
      {diff.added.length > 0 && <p className="pl-2 text-emerald-700">+ {diff.added.join(", ")}</p>}
      {diff.removed.length > 0 && <p className="pl-2 text-destructive">− {diff.removed.join(", ")}</p>}
      {diff.added.length === 0 && diff.removed.length === 0 && <p className="pl-2 text-muted-foreground">No change</p>}
      {newNames.length > 0 && (
        <p className="pl-2 text-amber-700">will create: {newNames.join(", ")}</p>
      )}
    </div>
  );
};

const CategoryDetail = ({ row }: { row: TaxonomyImportRow }) => {
  if (row.proposed_categories === null) {
    return (
      <p>
        <span className="font-medium">Categories:</span> unchanged
      </p>
    );
  }
  return (
    <div>
      <p className="font-medium">Categories</p>
      {row.categories_added.length > 0 && <p className="pl-2 text-emerald-700">+ {row.categories_added.join(", ")}</p>}
      {row.categories_removed.length > 0 && <p className="pl-2 text-destructive">− {row.categories_removed.join(", ")}</p>}
      {row.categories_added.length === 0 && row.categories_removed.length === 0 && (
        <p className="pl-2 text-muted-foreground">No change</p>
      )}
      {row.new_categories_not_created.length > 0 && (
        <p className="pl-2 text-destructive">
          will NOT be created — add manually first if needed: {row.new_categories_not_created.join(", ")}
        </p>
      )}
      {row.category_count_warning && <p className="pl-2 text-amber-700">⚠ {row.category_count_warning}</p>}
      {row.category_forbidden_value && (
        <p className="pl-2 font-medium text-destructive">
          ⚠ "{row.category_forbidden_value}" is never an allowed category — this entire row will be skipped at
          confirm even if selected.
        </p>
      )}
    </div>
  );
};

const BulkTaxonomyImportModal = ({ onClose, onImported }: BulkTaxonomyImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<TaxonomyImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const matchedRows = useMemo(() => (preview ? preview.rows.filter((r) => r.match_status === "matched") : []), [preview]);
  const ambiguousRows = useMemo(
    () => (preview ? preview.rows.filter((r) => r.match_status === "ambiguous") : []),
    [preview]
  );
  const notFoundRows = useMemo(
    () => (preview ? preview.rows.filter((r) => r.match_status === "not_found") : []),
    [preview]
  );

  const runPreview = async () => {
    if (!file) return;
    try {
      setPreviewing(true);
      const result = await storyApi.previewTaxonomyBulkUpdate(file);
      setPreview(result);
      setSelected(
        new Set(
          result.rows
            .filter((r) => r.match_status === "matched" && !r.category_forbidden_value)
            .map((r) => r.story_id as number)
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to preview the file.");
    } finally {
      setPreviewing(false);
    }
  };

  const toggleSelected = (storyId: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  };

  const backToFileSelect = () => {
    setPreview(null);
    setFile(null);
    setSelected(new Set());
  };

  const confirmUpdate = async () => {
    if (!preview) return;
    const records = matchedRows.filter((row) => selected.has(row.story_id as number));
    if (records.length === 0) return;
    try {
      setConfirming(true);
      const result = await storyApi.confirmTaxonomyBulkUpdate(records);
      toast.success(
        `Updated ${result.updated_count} stor${result.updated_count === 1 ? "y" : "ies"}` +
          (result.skipped_count ? ` (${result.skipped_count} skipped).` : ".")
      );
      onImported();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply the selected updates.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Bulk Update Taxonomy</CardTitle>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!preview ? (
            <>
              <p className="text-xs text-muted-foreground">
                Upload a CSV or Excel (.xlsx) file to bulk-edit tags, themes, genres, and categories on already
                published stories. Expected columns: title (required), author_name (optional — disambiguates
                duplicate titles), tags, themes, genres, categories (all comma or semicolon separated). A blank
                cell for tags/themes/genres/categories leaves that field unchanged on that story.
              </p>
              <div>
                <Label htmlFor="bulk-taxonomy-file">File</Label>
                <Input
                  id="bulk-taxonomy-file"
                  type="file"
                  accept=".csv,.xlsx"
                  className="mt-2"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" disabled={!file || previewing} onClick={runPreview}>
                  {previewing ? "Reading file..." : "Preview"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-medium">{preview.matched_count}</span> matched ·{" "}
                <span className="font-medium">{preview.ambiguous_count}</span> ambiguous ·{" "}
                <span className="font-medium">{preview.not_found_count}</span> not found
              </p>

              {matchedRows.length > 0 && (
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">
                  {matchedRows.map((row) => (
                    <div key={row.story_id} className="rounded-md border p-2 text-sm">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.has(row.story_id as number)}
                          onChange={() => toggleSelected(row.story_id as number)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {row.title}
                            {row.author_name ? ` — ${row.author_name}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{summaryLine(row)}</p>
                          {row.category_forbidden_value && (
                            <p className="mt-1 text-xs font-medium text-destructive">
                              ⚠ "{row.category_forbidden_value}" is never an allowed category — unchecked by
                              default; confirming this row will still skip it.
                            </p>
                          )}
                          {!row.category_forbidden_value && row.category_count_warning && (
                            <p className="mt-1 text-xs font-medium text-amber-700">
                              ⚠ {row.category_count_warning}
                            </p>
                          )}
                        </div>
                      </label>
                      <details className="mt-2 pl-6">
                        <summary className="cursor-pointer text-xs text-muted-foreground">Details</summary>
                        <div className="mt-1 space-y-1.5 text-xs">
                          <FieldDetail
                            label="Tags"
                            diff={getFieldDiff(row, "tags")}
                            newNames={row.new_tags_to_create}
                          />
                          <FieldDetail
                            label="Themes"
                            diff={getFieldDiff(row, "themes")}
                            newNames={row.new_themes_to_create}
                          />
                          <FieldDetail
                            label="Genres"
                            diff={getFieldDiff(row, "genres")}
                            newNames={row.new_genres_to_create}
                          />
                          <CategoryDetail row={row} />
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
              {matchedRows.length === 0 && (
                <p className="text-xs text-muted-foreground">No rows in this file matched a single published story.</p>
              )}

              {ambiguousRows.length > 0 && (
                <details className="rounded-md border border-amber-300/60 p-2 text-sm">
                  <summary className="cursor-pointer text-amber-700">
                    {ambiguousRows.length} ambiguous — matched more than one story, not applied
                  </summary>
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                    {ambiguousRows.map((row, index) => (
                      <div key={index} className="text-xs">
                        <p className="font-medium">
                          {row.title}
                          {row.author_name ? ` — ${row.author_name}` : ""}
                        </p>
                        <ul className="pl-3 text-muted-foreground">
                          {row.ambiguous_candidates.map((candidate) => (
                            <li key={candidate.id}>
                              {candidate.title} — {candidate.author_name || "no author"} ({candidate.slug})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {notFoundRows.length > 0 && (
                <details className="rounded-md border p-2 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">
                    {notFoundRows.length} not found — no published story with that title
                  </summary>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {notFoundRows.map((row, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {row.title}
                        {row.author_name ? ` — ${row.author_name}` : ""}
                      </p>
                    ))}
                  </div>
                </details>
              )}

              {preview.errors.length > 0 && (
                <details className="rounded-md border border-destructive/30 p-2 text-sm">
                  <summary className="cursor-pointer text-destructive">
                    {preview.errors.length} row error{preview.errors.length === 1 ? "" : "s"}
                  </summary>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {preview.errors.map((message, index) => (
                      <p key={index} className="text-xs text-destructive">
                        {message}
                      </p>
                    ))}
                  </div>
                </details>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={backToFileSelect}>
                  Back
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" disabled={selected.size === 0 || confirming} onClick={confirmUpdate}>
                  {confirming ? "Updating..." : `Update ${selected.size} Stor${selected.size === 1 ? "y" : "ies"}`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkTaxonomyImportModal;
