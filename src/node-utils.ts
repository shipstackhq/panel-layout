import type { LayoutNode, SlotState, TabDef } from "./types";
import { GUTTER_PX } from "./types";

export const DEFAULT_MIN_PX = 120;

export function collectSlotIds(node: LayoutNode): string[] {
  if (node.kind === "slot") return [node.id];
  return node.children.flatMap(collectSlotIds);
}

export function hasValidTree(node: LayoutNode): boolean {
  if (node.kind === "slot") return true;
  if (!node.id || !node.sizes || node.sizes.length !== node.children.length) return false;
  return node.children.every(hasValidTree);
}

/**
 * Recursively compute the minimum size a node requires along a given axis.
 * Same-direction group  → sum children mins + gutters
 * Cross-direction group → max of children mins
 * Slot                  → activeTab.minWidth / minHeight, fallback DEFAULT_MIN_PX
 */
export function getNodeMinSize(
  node: LayoutNode,
  dir: "h" | "v",
  slots: Record<string, SlotState>,
  tabMap: Record<string, TabDef>,
): number {
  if (node.kind === "slot") {
    const activeTab = tabMap[slots[node.id]?.activeTabId ?? ""];
    const tabMin = dir === "h" ? activeTab?.minWidth : activeTab?.minHeight;
    return Math.max(DEFAULT_MIN_PX, tabMin ?? 0);
  }

  if (node.dir === dir) {
    const numGutters = node.children.length - 1;
    const childrenMin = node.children.reduce(
      (sum, child) => sum + getNodeMinSize(child, dir, slots, tabMap),
      0,
    );
    return childrenMin + numGutters * GUTTER_PX;
  } else {
    return Math.max(
      DEFAULT_MIN_PX,
      ...node.children.map((child) => getNodeMinSize(child, dir, slots, tabMap)),
    );
  }
}

/** Sum of minSize across a contiguous run of siblings, including gutters between them. */
export function getSiblingsMinSize(
  siblings: LayoutNode[],
  dir: "h" | "v",
  slots: Record<string, SlotState>,
  tabMap: Record<string, TabDef>,
): number {
  if (siblings.length === 0) return 0;
  const sum = siblings.reduce((total, node) => total + getNodeMinSize(node, dir, slots, tabMap), 0);
  return sum + (siblings.length - 1) * GUTTER_PX;
}

/** After a tab move, enforce minimum sizes by clamping CSS variables on the root element. */
export function correctCSSVars(
  node: LayoutNode,
  slots: Record<string, SlotState>,
  tabMap: Record<string, TabDef>,
  root: HTMLElement,
): void {
  if (node.kind === "slot") return;

  node.children.forEach((child, i) => {
    const isLast = i === node.children.length - 1;
    if (!isLast) {
      const varName = `--panel-${child.id}`;
      const current = parseFloat(root.style.getPropertyValue(varName) || "0");
      const childMin = getNodeMinSize(child, node.dir, slots, tabMap);
      if (current < childMin) root.style.setProperty(varName, `${childMin}px`);
    }
    correctCSSVars(child, slots, tabMap, root);
  });
}

/** Set CSS variables for all non-last children. Uses persisted overrides when available. */
export function initNodeSizes(
  node: LayoutNode,
  availW: number,
  availH: number,
  root: HTMLElement,
  overrides: Record<string, number>,
  slots: Record<string, SlotState>,
  tabMap: Record<string, TabDef>,
): void {
  if (node.kind === "slot") return;

  const isH = node.dir === "h";
  const numGutters = node.children.length - 1;
  const available = (isH ? availW : availH) - numGutters * GUTTER_PX;
  const sizes = node.sizes?.length === node.children.length
    ? node.sizes
    : node.children.map(() => 1);
  const totalFlex = sizes.reduce((a, b) => a + b, 0);

  let remaining = Math.max(0, available);

  node.children.forEach((child, i) => {
    const isLast = i === node.children.length - 1;
    const fractionalPx = Math.round((sizes[i] / totalFlex) * available);
    const childMin = getNodeMinSize(child, node.dir, slots, tabMap);

    let ownSize: number;
    if (!isLast) {
      const raw = overrides[child.id] ?? fractionalPx;
      ownSize = Math.max(childMin, raw);
      root.style.setProperty(`--panel-${child.id}`, `${ownSize}px`);
      remaining = Math.max(0, remaining - ownSize);
    } else {
      ownSize = remaining;
    }

    const childAvailW = isH ? ownSize : availW;
    const childAvailH = isH ? availH : ownSize;

    initNodeSizes(child, childAvailW, childAvailH, root, overrides, slots, tabMap);
  });
}
