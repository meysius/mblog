"use client";

import { ArrowLeft } from "lucide-react";
import { useState, useTransition } from "react";
import { PostArticle } from "@/components/post-article";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { MediaImage } from "@/lib/media";
import type { PostKind } from "@/lib/post-kind";
import type { PostTag } from "@/lib/posts";
import { countWords } from "@/lib/reading-time";
import type { RevisionSummary } from "@/lib/revisions";
import { cn } from "@/lib/utils";
import { loadRevision } from "../actions";

// A post's history: the list of versions slides into the settings panel, and the
// one picked shows where the editor was, to restore it or go back to writing.

/** The content a version holds, which restoring puts back in the editor. */
export type Version = {
  title: string;
  excerpt: string;
  body: string;
  featureImage: MediaImage | null;
  featureImageAlt: string;
};

/** "current", or an earlier version's id. */
export type VersionId = "current" | number;

/** Which version is picked, loading earlier ones as they're picked. */
export function useVersionHistory() {
  const [selected, setSelected] = useState<VersionId>("current");
  // Earlier versions loaded so far, by id. Null for one that's no longer kept.
  const [loaded, setLoaded] = useState(new Map<number, Version | null>());
  const [loading, startLoading] = useTransition();

  function select(id: VersionId) {
    setSelected(id);
    if (id === "current" || loaded.has(id)) return;
    startLoading(async () => {
      const version = await loadRevision(id);
      setLoaded((versions) => new Map(versions).set(id, version));
    });
  }

  return {
    selected,
    select,
    // Undefined while it loads.
    earlier: selected === "current" ? undefined : loaded.get(selected),
    loading,
  };
}

const formatWords = (count: number) => `${count.toLocaleString()} ${count === 1 ? "word" : "words"}`;

type HistoryPanelProps = {
  revisions: RevisionSummary[];
  current: Version;
  dirty: boolean;
  selected: VersionId;
  onSelect: (id: VersionId) => void;
  onBack: () => void;
  backRef: React.Ref<HTMLButtonElement>;
};

/** The versions to pick from, in the settings panel's place. */
export function HistoryPanel({
  revisions,
  current,
  dirty,
  selected,
  onSelect,
  onBack,
  backRef,
}: HistoryPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="-my-1 -ml-2 flex items-center gap-1">
        <Button
          ref={backRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Back to settings"
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>
        <h2 className="font-medium">History</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Each save keeps the version it replaces. Autosaves keep one every ten minutes.
      </p>
      <nav aria-label="Versions">
        <ul className="-mx-2 flex flex-col gap-0.5">
          <VersionButton
            selected={selected === "current"}
            onClick={() => onSelect("current")}
            label="Current version"
            detail={dirty ? "Unsaved changes" : formatWords(countWords(current.body))}
          />
          {revisions.map((revision) => (
            <VersionButton
              key={revision.id}
              selected={selected === revision.id}
              onClick={() => onSelect(revision.id)}
              label={formatDateTime(revision.savedAt)}
              detail={[
                formatWords(revision.wordCount),
                revision.title !== current.title && `“${revision.title}”`,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}

type VersionButtonProps = {
  selected: boolean;
  onClick: () => void;
  label: string;
  detail: string;
};

function VersionButton({ selected, onClick, label, detail }: VersionButtonProps) {
  return (
    <li>
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={onClick}
        className={cn(
          "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          selected && "bg-muted",
        )}
      >
        <span className="font-medium">{label}</span>
        <span className="w-full truncate text-xs text-muted-foreground">{detail}</span>
      </button>
    </li>
  );
}

type VersionViewProps = {
  kind: PostKind;
  /** The picked version, null if it's no longer kept, or undefined while it loads. */
  version: Version | null | undefined;
  /** When it was saved, for an earlier version; omitted for the current one. */
  savedAt?: Date;
  /** Versions don't keep these, so every one shows the post's. */
  publishedAt: Date | null;
  tags: PostTag[];
  /** Whether restoring would replace changes that aren't saved. */
  dirty: boolean;
  onRestore: (version: Version) => void;
  onExit: () => void;
};

/** The picked version, shown where the editor was. */
export function VersionView({
  kind,
  version,
  savedAt,
  publishedAt,
  tags,
  dirty,
  onRestore,
  onExit,
}: VersionViewProps) {
  return (
    <div className="animate-in duration-200 fade-in">
      <div className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <div className="mr-auto">
          <p className="font-medium">
            {savedAt ? `Version from ${formatDateTime(savedAt)}` : "Current version"}
          </p>
          <p className="text-muted-foreground">
            {!savedAt
              ? "What the editor holds now."
              : dirty
                ? "Restoring it replaces your unsaved changes."
                : "Restoring it puts it in the editor, to save like any change."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onExit}>
            Back to editor
          </Button>
          {savedAt && (
            <Button type="button" disabled={!version} onClick={() => version && onRestore(version)}>
              Restore this version
            </Button>
          )}
        </div>
      </div>
      {version ? (
        <PostArticle
          kind={kind}
          post={{ ...version, title: version.title || "Untitled", publishedAt, tags }}
        />
      ) : version === null ? (
        <p className="text-muted-foreground">This version is no longer kept.</p>
      ) : (
        <p className="text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}
