"use client";

import * as React from "react";
import { create, getAll, update } from "../lib/storage";
import type { ContentItem } from "../lib/types";
import { ItemRow } from "./ItemRow";
import { cx, IconCheck, IconPlus, IconX } from "./ui";

type UndoSnapshot = {
  id: string;
  title: string;
  prevStatus: ContentItem["status"];
  prevPostedAt: string | null;
};

const UNDO_MS = 5000;

export function PipelineShell() {
  const [items, setItems] = React.useState<ContentItem[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const [showPosted, setShowPosted] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [undo, setUndo] = React.useState<UndoSnapshot | null>(null);
  const undoTimerRef = React.useRef<number | null>(null);

  const refresh = React.useCallback(() => {
    setItems(getAll());
  }, []);

  React.useEffect(() => {
    refresh();
    setMounted(true);
  }, [refresh]);

  const clearUndoTimer = React.useCallback(() => {
    if (undoTimerRef.current != null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);

  const handlePostedViaSwipe = React.useCallback(
    (snap: UndoSnapshot) => {
      clearUndoTimer();
      setUndo(snap);
      undoTimerRef.current = window.setTimeout(() => {
        setUndo(null);
        undoTimerRef.current = null;
      }, UNDO_MS);
    },
    [clearUndoTimer]
  );

  const handleUndo = React.useCallback(() => {
    if (!undo) return;
    update(undo.id, {
      status: undo.prevStatus,
      postedAt: undo.prevPostedAt,
    });
    clearUndoTimer();
    setUndo(null);
    refresh();
  }, [undo, clearUndoTimer, refresh]);

  React.useEffect(() => () => clearUndoTimer(), [clearUndoTimer]);

  const ideas = items.filter((i) => i.status === "idea");
  const editing = items.filter((i) => i.status === "editing");
  const posted = items.filter((i) => i.status === "posted");
  const runwayCount = ideas.length + editing.length;

  return (
    <div className="min-h-full" style={{ background: "var(--bg)" }}>
      <div className="mx-auto w-full max-w-[430px] px-6 pb-32 pt-10">
        {/* Header */}
        <header className="mb-8">
          <h1
            className="text-[34px] leading-none tracking-tight"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--ink)",
              fontWeight: 400,
              fontStyle: "italic",
            }}
          >
            your pipeline
          </h1>
          <p
            className="mt-2 text-[13px]"
            style={{ color: "var(--ink-soft)" }}
          >
            {mounted ? (
              runwayCount === 0 ? (
                <span>no ideas yet — start one below ↓</span>
              ) : (
                <span>
                  {runwayCount} in flight
                  {editing.length > 0 ? (
                    <>
                      {" · "}
                      <span style={{ color: "var(--accent-strong)" }}>
                        {editing.length} ready to edit
                      </span>
                    </>
                  ) : null}
                </span>
              )
            ) : (
              <span>&nbsp;</span>
            )}
          </p>
        </header>

        {/* Inline add row */}
        {adding ? (
          <AddRow
            onCancel={() => setAdding(false)}
            onSave={(title, type) => {
              create(title, type);
              setAdding(false);
              refresh();
            }}
          />
        ) : null}

        {/* List */}
        <main>
          {mounted && ideas.length === 0 && editing.length === 0 && !adding ? (
            <div
              className="py-12 text-center text-[13px] italic"
              style={{ color: "var(--ink-faint)" }}
            >
              a calm place. tap + to add your first idea.
            </div>
          ) : null}

          {ideas.length > 0 ? (
            <StageLabel>to film</StageLabel>
          ) : null}
          {ideas.map((i, idx) => (
            <React.Fragment key={i.id}>
              <ItemRow
                item={i}
                onChange={refresh}
                onSwipedToPosted={handlePostedViaSwipe}
              />
              {idx < ideas.length - 1 ? <Divider /> : null}
            </React.Fragment>
          ))}

          {editing.length > 0 ? (
            <>
              {ideas.length > 0 ? <div className="h-4" /> : null}
              <StageLabel>editing</StageLabel>
            </>
          ) : null}
          {editing.map((i, idx) => (
            <React.Fragment key={i.id}>
              <ItemRow
                item={i}
                onChange={refresh}
                onSwipedToPosted={handlePostedViaSwipe}
              />
              {idx < editing.length - 1 ? <Divider /> : null}
            </React.Fragment>
          ))}
        </main>

        {/* Posted link */}
        <footer className="mt-16">
          <button
            type="button"
            onClick={() => setShowPosted((v) => !v)}
            className="text-[13px]"
            style={{ color: "var(--accent-strong)" }}
          >
            posted ({posted.length}) {showPosted ? "↑" : "↗"}
          </button>
          {showPosted ? (
            <div className="mt-3 space-y-1.5">
              {posted.length === 0 ? (
                <div
                  className="text-[13px] italic"
                  style={{ color: "var(--ink-faint)" }}
                >
                  nothing yet.
                </div>
              ) : (
                posted.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 truncate text-[13px]"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: "var(--posted-soft)",
                        color: "var(--ink)",
                      }}
                    >
                      <IconCheck className="h-2.5 w-2.5" />
                    </span>
                    <span className="truncate">{p.title}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </footer>
      </div>

      {/* FAB */}
      {!adding ? (
        <button
          type="button"
          aria-label="New idea"
          onClick={() => setAdding(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-95"
          style={{
            background: "var(--accent)",
            color: "var(--surface)",
            boxShadow:
              "0 14px 30px -8px rgba(216, 133, 156, 0.55), 0 4px 10px -4px rgba(61, 46, 37, 0.15)",
          }}
        >
          <IconPlus className="h-6 w-6" />
        </button>
      ) : null}

      {/* Undo toast */}
      {undo ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        >
          <div
            className="pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-full px-4 py-3"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              boxShadow: "0 20px 50px -16px rgba(61, 46, 37, 0.25)",
            }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: "var(--posted)", color: "var(--ink)" }}
            >
              <IconCheck className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]">
              posted —{" "}
              <span style={{ color: "var(--ink-soft)" }}>{undo.title}</span>
            </span>
            <button
              type="button"
              onClick={handleUndo}
              className="text-[13px] font-medium"
              style={{ color: "var(--accent-strong)" }}
            >
              undo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StageLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-1 mt-2 text-[10px] font-medium uppercase tracking-[0.22em]"
      style={{ color: "var(--ink-faint)" }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 1,
        background: "var(--line-soft)",
        marginLeft: 36,
      }}
    />
  );
}

function AddRow({
  onSave,
  onCancel,
}: {
  onSave: (title: string, type: "reactive" | "proactive") => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<"reactive" | "proactive">("reactive");

  const canSave = title.trim().length > 0;

  const commit = () => {
    if (!canSave) return;
    onSave(title.trim(), type);
  };

  return (
    <div
      className="mb-4 rounded-2xl px-4 py-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-6 w-6 shrink-0 rounded-full"
          style={{ border: "2px dashed var(--line)" }}
        />
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") onCancel();
          }}
          placeholder="what's the idea?"
          className="h-8 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          style={{ color: "var(--ink)" }}
        />
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ color: "var(--ink-soft)" }}
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 pl-9">
        <TypeChip
          active={type === "reactive"}
          tone="reactive"
          onClick={() => setType("reactive")}
        >
          reactive
        </TypeChip>
        <TypeChip
          active={type === "proactive"}
          tone="proactive"
          onClick={() => setType("proactive")}
        >
          proactive
        </TypeChip>
        <button
          type="button"
          onClick={commit}
          disabled={!canSave}
          className="ml-auto rounded-full px-4 py-1.5 text-[13px] font-medium disabled:opacity-40"
          style={{
            background: "var(--accent)",
            color: "var(--surface)",
          }}
        >
          save
        </button>
      </div>
    </div>
  );
}

function TypeChip({
  active,
  tone,
  children,
  onClick,
}: {
  active: boolean;
  tone: "reactive" | "proactive";
  children: React.ReactNode;
  onClick: () => void;
}) {
  const dotColor =
    tone === "reactive" ? "var(--reactive)" : "var(--proactive)";
  const bgColor =
    tone === "reactive" ? "var(--reactive-soft)" : "var(--proactive-soft)";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition-colors"
      )}
      style={{
        background: active ? bgColor : "transparent",
        color: active ? "var(--ink)" : "var(--ink-soft)",
        border: `1px solid ${active ? "transparent" : "var(--line)"}`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: dotColor }}
      />
      {children}
    </button>
  );
}
