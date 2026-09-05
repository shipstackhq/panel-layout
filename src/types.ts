import type { ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  /** Any ReactNode rendered before the label in the tab strip */
  icon?: ReactNode;
  /** Icon shown when the tab is active — falls back to `icon` */
  activeIcon?: ReactNode;
  content: ReactNode;
  /** Minimum pixel width the panel must have when this tab is active */
  minWidth?: number;
  /** Minimum pixel height the panel must have when this tab is active */
  minHeight?: number;
}

export type LayoutNode =
  | { kind: "slot"; id: string }
  | { kind: "group"; id: string; dir: "h" | "v"; children: LayoutNode[]; sizes: number[] };

export interface SlotState {
  tabIds: string[];
  activeTabId: string;
}

export interface LayoutState {
  template: LayoutTemplate;
  tree: LayoutNode;
  slots: Record<string, SlotState>;
  sizeOverrides: Record<string, number>;
}

export type LayoutTemplate =
  | "single"
  | "two-h"
  | "two-v"
  | "three-main-right"
  | "three-main-left"
  | "three-h"
  | "four";

export interface TemplateInfo {
  label: string;
  slotIds: string[];
  buildTree: () => LayoutNode;
}

export const TEMPLATES: Record<LayoutTemplate, TemplateInfo> = {
  single: {
    label: "Single",
    slotIds: ["s0"],
    buildTree: () => ({ kind: "slot", id: "s0" }),
  },
  "two-h": {
    label: "Side by Side",
    slotIds: ["s0", "s1"],
    buildTree: () => ({
      kind: "group", id: "g-root", dir: "h", sizes: [1, 1],
      children: [{ kind: "slot", id: "s0" }, { kind: "slot", id: "s1" }],
    }),
  },
  "two-v": {
    label: "Stacked",
    slotIds: ["s0", "s1"],
    buildTree: () => ({
      kind: "group", id: "g-root", dir: "v", sizes: [1, 1],
      children: [{ kind: "slot", id: "s0" }, { kind: "slot", id: "s1" }],
    }),
  },
  "three-main-right": {
    label: "Main + Right Split",
    slotIds: ["s0", "s1", "s2"],
    buildTree: () => ({
      kind: "group", id: "g-root", dir: "h", sizes: [1, 1],
      children: [
        { kind: "slot", id: "s0" },
        { kind: "group", id: "g-right", dir: "v", sizes: [1, 1],
          children: [{ kind: "slot", id: "s1" }, { kind: "slot", id: "s2" }] },
      ],
    }),
  },
  "three-main-left": {
    label: "Left Split + Main",
    slotIds: ["s0", "s1", "s2"],
    buildTree: () => ({
      kind: "group", id: "g-root", dir: "h", sizes: [1, 1],
      children: [
        { kind: "group", id: "g-left", dir: "v", sizes: [1, 1],
          children: [{ kind: "slot", id: "s0" }, { kind: "slot", id: "s1" }] },
        { kind: "slot", id: "s2" },
      ],
    }),
  },
  "three-h": {
    label: "Three Columns",
    slotIds: ["s0", "s1", "s2"],
    buildTree: () => ({
      kind: "group", id: "g-root", dir: "h", sizes: [1, 1, 1],
      children: [
        { kind: "slot", id: "s0" },
        { kind: "slot", id: "s1" },
        { kind: "slot", id: "s2" },
      ],
    }),
  },
  four: {
    label: "Four Panels",
    slotIds: ["s0", "s1", "s2", "s3"],
    buildTree: () => ({
      kind: "group", id: "g-root", dir: "h", sizes: [1, 1],
      children: [
        { kind: "group", id: "g-left", dir: "v", sizes: [1, 1],
          children: [{ kind: "slot", id: "s0" }, { kind: "slot", id: "s1" }] },
        { kind: "group", id: "g-right", dir: "v", sizes: [1, 1],
          children: [{ kind: "slot", id: "s2" }, { kind: "slot", id: "s3" }] },
      ],
    }),
  },
};

export const GUTTER_PX = 16;
