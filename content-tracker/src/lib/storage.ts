import { ContentItem, Hook } from "./types";

const STORAGE_KEY = "content-tracker-items";

function readItems(): ContentItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as ContentItem[];
}

function writeItems(items: ContentItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getAll(): ContentItem[] {
  return readItems();
}

export function getByStatus(status: ContentItem["status"]): ContentItem[] {
  return readItems().filter((item) => item.status === status);
}

export function create(
  title: string,
  type: ContentItem["type"]
): ContentItem {
  const items = readItems();
  const newItem: ContentItem = {
    id: crypto.randomUUID(),
    title,
    type,
    status: "idea",
    hooks: [],
    createdAt: new Date().toISOString(),
    postedAt: null,
  };
  items.unshift(newItem);
  writeItems(items);
  return newItem;
}

export function update(
  id: string,
  partial: Partial<Pick<ContentItem, "title" | "type" | "status" | "hooks" | "postedAt">>
): ContentItem {
  const items = readItems();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error(`Item ${id} not found`);
  items[index] = { ...items[index], ...partial };
  writeItems(items);
  return items[index];
}

export function remove(id: string): void {
  const items = readItems().filter((item) => item.id !== id);
  writeItems(items);
}

export function advanceStatus(id: string): ContentItem {
  const items = readItems();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error(`Item ${id} not found`);

  const item = items[index];
  if (item.status === "idea") {
    item.status = "editing";
  } else if (item.status === "editing") {
    item.status = "posted";
    item.postedAt = new Date().toISOString();
  }

  writeItems(items);
  return item;
}

export function addHook(itemId: string, text: string): Hook {
  const items = readItems();
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) throw new Error(`Item ${itemId} not found`);

  const hook: Hook = {
    id: crypto.randomUUID(),
    text,
    tried: false,
  };
  items[index].hooks.push(hook);
  writeItems(items);
  return hook;
}

export function toggleHookTried(itemId: string, hookId: string): void {
  const items = readItems();
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Item ${itemId} not found`);

  const hook = item.hooks.find((h) => h.id === hookId);
  if (!hook) throw new Error(`Hook ${hookId} not found`);

  hook.tried = !hook.tried;
  writeItems(items);
}

export function getPipelineCount(): number {
  const items = readItems();
  return items.filter((item) => item.status !== "posted").length;
}
