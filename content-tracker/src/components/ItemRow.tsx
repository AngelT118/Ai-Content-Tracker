"use client";

import * as React from "react";
import type { ContentItem, Hook } from "../lib/types";
import {
  addHook,
  advanceStatus,
  remove,
  toggleHookTried,
  update,
} from "../lib/storage";
import {
  cx,
  IconCheck,
  IconChevronDown,
  IconDots,
  IconPlus,
  IconSparkle,
  IconX,
} from "./ui";

type Snapshot = {
  id: string;
  title: string;
  prevStatus: ContentItem["status"];
  prevPostedAt: string | null;
};

export function ItemRow({
  item,
  onChange,
  onSwipedToPosted,
}: {
  item: ContentItem;
  onChange: () => void;
  onSwipedToPosted?: (s: Snapshot) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(item.title);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close the dots menu when tapping outside it. pointerdown covers both
  // mouse and touch. We also close on Escape for keyboard users.
  React.useEffect(() => {
    if (!menuOpen) return;
    const pointerHandler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", pointerHandler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("pointerdown", pointerHandler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [menuOpen]);

  const changeStatus = (next: ContentItem["status"]) => {
    update(item.id, {
      status: next,
      postedAt: next === "posted" ? new Date().toISOString() : null,
    });
    setMenuOpen(false);
    onChange();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${item.title}"?`)) {
      remove(item.id);
      onChange();
    }
  };

  // Double-tap on the title enters edit mode. We always stopPropagation on
  // title taps so the row's expand/collapse is NOT triggered — otherwise the
  // first tap of a double-tap would toggle the whole expanded panel (including
  // the dots menu) open and closed, which looked like a conflict.
  // Expand/collapse is still available via the rest of the row (circle, type
  // pill, chevron, empty space).
  const lastTitleTapRef = React.useRef(0);
  const handleTitleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTitleTapRef.current < 350) {
      setEditMode(true);
      lastTitleTapRef.current = 0;
    } else {
      lastTitleTapRef.current = now;
    }
  };

  // swipe state
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startXRef = React.useRef<number | null>(null);
  const activePointerRef = React.useRef<number | null>(null);
  const movedRef = React.useRef(false);

  React.useEffect(() => setEditTitle(item.title), [item.title]);

  const onPointerDown = (e: React.PointerEvent) => {
    // Don't start a swipe when the user taps an interactive child
    // (status circle button, chevron, inputs, links). Pointer capture would
    // otherwise steal the click event from the intended target.
    const target = e.target as HTMLElement;
    if (target.closest("button, input, a, textarea, select")) {
      return;
    }
    activePointerRef.current = e.pointerId;
    startXRef.current = e.clientX;
    movedRef.current = false;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (activePointerRef.current !== e.pointerId) return;
    if (startXRef.current == null) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 4) movedRef.current = true;
    setDragX(Math.max(-180, Math.min(0, dx)));
  };

  const commitSwipe = () => {
    const threshold = -90;
    if (dragX <= threshold) {
      const snap: Snapshot = {
        id: item.id,
        title: item.title,
        prevStatus: item.status,
        prevPostedAt: item.postedAt,
      };
      setDragX(-480);
      window.setTimeout(() => {
        update(item.id, {
          status: "posted",
          postedAt: new Date().toISOString(),
        });
        onSwipedToPosted?.(snap);
        onChange();
      }, 180);
      return;
    }
    setDragX(0);
  };

  const handleStatusTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.status === "idea") {
      advanceStatus(item.id);
      onChange();
    }
  };

  const handleRowTap = () => {
    if (movedRef.current) return;
    setExpanded((v) => !v);
  };

  const swipeProgress = Math.min(1, Math.abs(dragX) / 90);

  return (
    <div>
      {/* SWIPE ZONE — only the collapsed row. Expanded panel is a sibling below, outside this zone. */}
      <div className="relative">
        {/* Reveal panel (behind the sliding row) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-end pr-5"
          style={{
            background: "var(--posted-soft)",
            opacity: 0.2 + swipeProgress * 0.8,
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              color: "var(--ink)",
              transform: `translateX(${(1 - swipeProgress) * 12}px)`,
              opacity: 0.5 + swipeProgress * 0.5,
            }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: "var(--posted)" }}
            >
              <IconCheck className="h-3.5 w-3.5" />
            </span>
            <span
              className="text-[15px] italic"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              posted
            </span>
          </div>
        </div>

        {/* Sliding collapsed row */}
        <div
          className="relative select-none flex items-center gap-3 px-1 py-3 touch-pan-y cursor-pointer"
          style={{
            background: "var(--bg)",
            transform: `translate3d(${dragX}px, 0, 0)`,
            transition: dragging
              ? undefined
              : "transform 220ms cubic-bezier(.2,.9,.2,1)",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => {
            if (activePointerRef.current === e.pointerId) {
              activePointerRef.current = null;
              startXRef.current = null;
              setDragging(false);
              commitSwipe();
            }
          }}
          onPointerCancel={() => {
            activePointerRef.current = null;
            startXRef.current = null;
            setDragging(false);
            setDragX(0);
          }}
          onClick={handleRowTap}
        >
          {/* Status circle */}
          <button
            type="button"
            aria-label={
              item.status === "idea"
                ? "Mark as have footage"
                : "Have footage (swipe left to post)"
            }
            onClick={handleStatusTap}
            className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{
              border: "2px solid var(--line)",
              background:
                item.status === "editing" ? "var(--proactive-soft)" : "transparent",
            }}
          >
            {item.status === "editing" ? (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 right-0 w-1/2 rounded-r-full"
                style={{ background: "var(--proactive)" }}
              />
            ) : null}
          </button>

          {/* Title + type */}
          <div className="min-w-0 flex-1">
            {editMode ? (
              <input
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const t = editTitle.trim();
                    if (t) {
                      update(item.id, { title: t });
                      onChange();
                    }
                    setEditMode(false);
                  } else if (e.key === "Escape") {
                    setEditTitle(item.title);
                    setEditMode(false);
                  }
                }}
                onBlur={() => {
                  const t = editTitle.trim();
                  if (t && t !== item.title) {
                    update(item.id, { title: t });
                    onChange();
                  }
                  setEditMode(false);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent text-[15px] outline-none"
                style={{ color: "var(--ink)" }}
              />
            ) : (
              <div
                className="truncate text-[15px] leading-tight select-none"
                style={{ color: "var(--ink)", cursor: "text" }}
                onClick={handleTitleTap}
                title="Double-tap to edit"
              >
                {item.title}
              </div>
            )}
          </div>

          {/* Type dot + label */}
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background:
                  item.type === "reactive"
                    ? "var(--reactive)"
                    : "var(--proactive)",
              }}
            />
            <span
              className="text-[10px] font-medium uppercase tracking-[0.12em]"
              style={{ color: "var(--ink-faint)" }}
            >
              {item.type}
            </span>
          </div>

          {/* Chevron */}
          <IconChevronDown
            className="h-4 w-4 shrink-0 transition-transform duration-200"
            style={
              {
                color: "var(--ink-faint)",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      {/* EXPANDED PANEL — sibling of swipe zone, fully outside pointer handlers */}
      {expanded ? (
        <div className="pl-9 pr-1 pb-4 pt-1">
          {/* Dots menu floats top-right over the hooks panel */}
          <div className="relative">
            <div
              className="absolute right-0 -top-1"
              ref={menuRef}
            >
              <button
                type="button"
                aria-label="Options"
                aria-expanded={menuOpen}
                className="h-7 w-7 rounded-full flex items-center justify-center transition-colors"
                style={{
                  color: menuOpen ? "var(--ink)" : "var(--ink-soft)",
                  background: menuOpen ? "var(--line-soft)" : "transparent",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
              >
                <IconDots className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-2xl"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    boxShadow:
                      "0 20px 50px -16px rgba(61, 46, 37, 0.22)",
                  }}
                >
                  <div
                    className="px-3 pt-2.5 pb-1 text-[10px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    move to
                  </div>
                  <StatusMenuItem
                    label="to film"
                    hint="idea"
                    dotColor="var(--line)"
                    active={item.status === "idea"}
                    onClick={() => changeStatus("idea")}
                  />
                  <StatusMenuItem
                    label="editing"
                    hint="have footage"
                    dotColor="var(--proactive)"
                    active={item.status === "editing"}
                    onClick={() => changeStatus("editing")}
                  />
                  <StatusMenuItem
                    label="posted"
                    hint="live"
                    dotColor="var(--posted)"
                    active={item.status === "posted"}
                    onClick={() => changeStatus("posted")}
                  />

                  <div
                    className="my-1"
                    style={{ height: 1, background: "var(--line-soft)" }}
                  />

                  <SimpleMenuItem
                    onClick={() => {
                      setEditMode(true);
                      setMenuOpen(false);
                    }}
                  >
                    edit title
                    <span
                      className="ml-auto text-[10px]"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      2× tap
                    </span>
                  </SimpleMenuItem>
                  <SimpleMenuItem
                    danger
                    onClick={() => {
                      setMenuOpen(false);
                      handleDelete();
                    }}
                  >
                    delete
                  </SimpleMenuItem>
                </div>
              ) : null}
            </div>
          </div>

          <HooksPanel item={item} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}

function SimpleMenuItem({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors"
      style={{
        background: "transparent",
        color: danger ? "var(--accent-strong)" : "var(--ink)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--line-soft)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function StatusMenuItem({
  label,
  hint,
  dotColor,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  dotColor: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={active}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors disabled:cursor-default"
      style={{
        background: "transparent",
        color: active ? "var(--ink-faint)" : "var(--ink)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--line-soft)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: dotColor }}
      />
      <span className="flex-1">{label}</span>
      {active ? (
        <span
          className="text-[10px] uppercase tracking-[0.12em]"
          style={{ color: "var(--ink-faint)" }}
        >
          current
        </span>
      ) : (
        <span
          className="text-[11px]"
          style={{ color: "var(--ink-faint)" }}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

function HooksPanel({
  item,
  onChange,
}: {
  item: ContentItem;
  onChange: () => void;
}) {
  const [newHook, setNewHook] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const add = (text: string) => {
    const t = text.trim();
    if (!t) return;
    addHook(item.id, t);
    setNewHook("");
    onChange();
  };

  const requestSuggestions = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: item.title }),
      });
      const json = (await res.json()) as { hooks?: string[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Request failed");
      setSuggestions(Array.isArray(json.hooks) ? json.hooks : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate hooks");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {item.hooks.length === 0 ? (
          <div
            className="text-xs italic"
            style={{ color: "var(--ink-faint)" }}
          >
            no hooks yet.
          </div>
        ) : (
          item.hooks.map((h) => (
            <HookRow
              key={h.id}
              hook={h}
              onToggle={() => {
                toggleHookTried(item.id, h.id);
                onChange();
              }}
            />
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={newHook}
          onChange={(e) => setNewHook(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add(newHook);
          }}
          placeholder="add a hook…"
          className="h-8 flex-1 rounded-full bg-transparent px-3 text-[13px] outline-none"
          style={{
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        />
        <button
          type="button"
          onClick={() => add(newHook)}
          disabled={!newHook.trim()}
          aria-label="Add hook"
          className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
          style={{ background: "var(--line-soft)", color: "var(--ink)" }}
        >
          <IconPlus className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={requestSuggestions}
        disabled={busy}
        className="flex items-center gap-1.5 text-[13px] disabled:opacity-50"
        style={{ color: "var(--accent-strong)" }}
      >
        <IconSparkle className="h-3.5 w-3.5" />
        {busy ? "thinking…" : suggestions.length > 0 ? "regenerate hooks" : "try ai hooks"}
      </button>

      {error ? (
        <div className="text-xs" style={{ color: "var(--ink-soft)" }}>
          {error}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="space-y-1.5">
          {suggestions.map((s, idx) => (
            <button
              key={`${idx}-${s}`}
              type="button"
              onClick={() => {
                add(s);
                setSuggestions((prev) => prev.filter((x) => x !== s));
              }}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-[13px]"
              style={{
                background: "var(--accent-soft)",
                color: "var(--ink)",
              }}
            >
              <IconPlus
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "var(--accent-strong)" } as React.CSSProperties}
              />
              <span>{s}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HookRow({
  hook,
  onToggle,
}: {
  hook: Hook;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-2 py-1">
      <button
        type="button"
        aria-pressed={hook.tried}
        aria-label={hook.tried ? "Mark as not tried" : "Mark as tried"}
        onClick={onToggle}
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
        style={{
          border: "1.5px solid var(--line)",
          background: hook.tried ? "var(--accent)" : "transparent",
          color: "var(--surface)",
        }}
      >
        {hook.tried ? <IconCheck className="h-3 w-3" /> : null}
      </button>
      <div
        className={cx(
          "flex-1 text-[13px] leading-5",
          hook.tried ? "line-through" : ""
        )}
        style={{
          color: hook.tried ? "var(--ink-faint)" : "var(--ink)",
        }}
      >
        {hook.text}
      </div>
    </div>
  );
}

export type { Snapshot };
// Re-export IconX so callers needing to close chips can reach it without a new import site.
export { IconX };
