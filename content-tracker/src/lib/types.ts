export interface Hook {
  id: string;
  text: string;
  tried: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  type: "reactive" | "proactive";
  status: "idea" | "editing" | "posted";
  hooks: Hook[];
  createdAt: string;
  postedAt: string | null;
}
