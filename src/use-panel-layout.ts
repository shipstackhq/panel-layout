import { useState, useCallback, useRef } from "react";
import type { LayoutTemplate, LayoutState, LayoutNode, SlotState, TabDef } from "./types";
import { TEMPLATES, GUTTER_PX } from "./types";
import { collectSlotIds, hasValidTree, getNodeMinSize, getSiblingsMinSize, correctCSSVars } from "./node-utils";

export interface PanelLayoutHandle {
  state: LayoutState;
  tabMap: Record<string, TabDef>;
  setTemplate: (t: LayoutTemplate) => void;
  onResizeEnd: (nodeId: string, sizePx: number) => void;
  getBounds: (
    siblings: LayoutNode[],
    index: number,
    dir: "h" | "v",
    containerSize: number,
  ) => { min: number; max: number };
  setActiveTab: (slotId: string, tabId: string) => void;
  onTabDragStart: (tabId: string, fromSlotId: string) => void;
  onTabDrop: (toSlotId: string, toIndex?: number) => void;
  onTabDragEnd: () => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
}

function buildDefaultSlots(slotIds: string[], tabs: TabDef[]): Record<string, SlotState> {
  const slots: Record<string, SlotState> = {};
  slotIds.forEach((id) => { slots[id] = { tabIds: [], activeTabId: "" }; });
  tabs.forEach((tab, i) => {
    const slotId = slotIds[i % slotIds.length];
    slots[slotId].tabIds.push(tab.id);
    if (!slots[slotId].activeTabId) slots[slotId].activeTabId = tab.id;
  });
  return slots;
}

function load(tabs: TabDef[], storageKey: string): LayoutState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const saved = JSON.parse(raw) as LayoutState;
      const validIds = new Set(tabs.map((t) => t.id));
      const slotIds = collectSlotIds(saved.tree);
      const treeOk = hasValidTree(saved.tree);
      const slotsOk = slotIds.every((sid) => !!saved.slots[sid]);

      if (treeOk && slotsOk) {
        slotIds.forEach((sid) => {
          saved.slots[sid].tabIds = saved.slots[sid].tabIds.filter((id) => validIds.has(id));
          if (!validIds.has(saved.slots[sid].activeTabId)) {
            saved.slots[sid].activeTabId = saved.slots[sid].tabIds[0] ?? "";
          }
        });
        return saved;
      }
    }
  } catch { /* ignore */ }

  const tpl = TEMPLATES["two-h"];
  const tree = tpl.buildTree();
  return {
    template: "two-h",
    tree,
    slots: buildDefaultSlots(collectSlotIds(tree), tabs),
    sizeOverrides: {},
  };
}

function save(state: LayoutState, storageKey: string) {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* ignore */ }
}

let dragPayload: { tabId: string; fromSlotId: string } | null = null;

export function usePanelLayout(
  tabs: TabDef[],
  /** localStorage key — change this if you use the layout in multiple apps on the same domain */
  storageKey = "panel-layout-v1",
): PanelLayoutHandle {
  const tabMap = Object.fromEntries(tabs.map((t) => [t.id, t]));
  const [state, setState] = useState<LayoutState>(() => load(tabs, storageKey));
  const rootRef = useRef<HTMLDivElement>(null);

  const slotsRef = useRef(state.slots);
  slotsRef.current = state.slots;

  const setTemplate = useCallback((template: LayoutTemplate) => {
    setState((prev) => {
      const tpl = TEMPLATES[template];
      const tree = tpl.buildTree();
      const newSlotIds = collectSlotIds(tree);

      const allAssigned: string[] = [];
      collectSlotIds(prev.tree).forEach((sid) => {
        prev.slots[sid]?.tabIds.forEach((tid) => {
          if (!allAssigned.includes(tid)) allAssigned.push(tid);
        });
      });
      tabs.forEach((t) => { if (!allAssigned.includes(t.id)) allAssigned.push(t.id); });

      const next: LayoutState = {
        template,
        tree,
        slots: buildDefaultSlots(newSlotIds, allAssigned.map((id) => tabMap[id]).filter(Boolean)),
        sizeOverrides: {},
      };
      save(next, storageKey);
      return next;
    });
  }, [tabs, tabMap, storageKey]);

  const onResizeEnd = useCallback((nodeId: string, sizePx: number) => {
    setState((prev) => {
      const next: LayoutState = {
        ...prev,
        sizeOverrides: { ...prev.sizeOverrides, [nodeId]: sizePx },
      };
      save(next, storageKey);
      return next;
    });
  }, [storageKey]);

  const getBounds = useCallback((
    siblings: LayoutNode[],
    index: number,
    dir: "h" | "v",
    containerSize: number,
  ) => {
    const slots = slotsRef.current;
    // Only the dragged node's own CSS var is being resized, so its floor is
    // just its own min. Everything after it (not just the immediate right
    // neighbor) is fixed-or-flex-down-to-its-min space that must still fit
    // in whatever's left — reserve all of their minimums, not just one.
    const min = getNodeMinSize(siblings[index], dir, slots, tabMap);
    const rightSiblingsMin = getSiblingsMinSize(siblings.slice(index + 1), dir, slots, tabMap);
    const max = containerSize - rightSiblingsMin - GUTTER_PX;
    return { min, max: Math.max(min, max) };
  }, [tabMap]);

  const setActiveTab = useCallback((slotId: string, tabId: string) => {
    setState((prev) => {
      const nextSlots = { ...prev.slots, [slotId]: { ...prev.slots[slotId], activeTabId: tabId } };
      const root = rootRef.current;
      if (root) correctCSSVars(prev.tree, nextSlots, tabMap, root);
      const next = { ...prev, slots: nextSlots };
      save(next, storageKey);
      return next;
    });
  }, [tabMap, storageKey]);

  const onTabDragStart = useCallback((tabId: string, fromSlotId: string) => {
    dragPayload = { tabId, fromSlotId };
  }, []);

  const onTabDrop = useCallback((toSlotId: string, toIndex?: number) => {
    if (!dragPayload) return;
    const { tabId, fromSlotId } = dragPayload;
    dragPayload = null;

    setState((prev) => {
      const fromSlot = prev.slots[fromSlotId];
      const toSlot = prev.slots[toSlotId];
      if (!fromSlot || !toSlot) return prev;

      let nextSlots: Record<string, SlotState>;

      if (fromSlotId === toSlotId) {
        const currentIndex = fromSlot.tabIds.indexOf(tabId);
        if (currentIndex === -1) return prev;
        const without = fromSlot.tabIds.filter((id) => id !== tabId);
        const insertAt = toIndex !== undefined
          ? Math.max(0, toIndex > currentIndex ? toIndex - 1 : toIndex)
          : without.length;
        const reordered = [...without.slice(0, insertAt), tabId, ...without.slice(insertAt)];
        nextSlots = { ...prev.slots, [fromSlotId]: { ...fromSlot, tabIds: reordered } };
      } else {
        const newFromTabIds = fromSlot.tabIds.filter((id) => id !== tabId);
        const insertAt = toIndex ?? toSlot.tabIds.length;
        const newToTabIds = [...toSlot.tabIds.slice(0, insertAt), tabId, ...toSlot.tabIds.slice(insertAt)];
        nextSlots = {
          ...prev.slots,
          [fromSlotId]: {
            tabIds: newFromTabIds,
            activeTabId: newFromTabIds.includes(fromSlot.activeTabId)
              ? fromSlot.activeTabId
              : (newFromTabIds[0] ?? ""),
          },
          [toSlotId]: { tabIds: newToTabIds, activeTabId: tabId },
        };
      }

      const root = rootRef.current;
      if (root) correctCSSVars(prev.tree, nextSlots, tabMap, root);

      const next = { ...prev, slots: nextSlots };
      save(next, storageKey);
      return next;
    });
  }, [tabMap, storageKey]);

  const onTabDragEnd = useCallback(() => { dragPayload = null; }, []);

  return {
    state,
    tabMap,
    setTemplate,
    onResizeEnd,
    getBounds,
    setActiveTab,
    onTabDragStart,
    onTabDrop,
    onTabDragEnd,
    rootRef,
  };
}
