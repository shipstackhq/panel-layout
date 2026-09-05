import { useState, useCallback, useRef, useEffect } from "react";
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

/** Pure, environment-independent default — safe to use as the initial render on both server and client. */
function buildDefaultState(tabs: TabDef[]): LayoutState {
  const tpl = TEMPLATES["two-h"];
  const tree = tpl.buildTree();
  return {
    template: "two-h",
    tree,
    slots: buildDefaultSlots(collectSlotIds(tree), tabs),
    sizeOverrides: {},
  };
}

/**
 * Reconcile a layout state against the current `tabs` list: drop tab ids
 * that no longer exist, and append any tabs that aren't assigned to a slot
 * yet (e.g. new tabs added since the state was last persisted).
 */
function reconcileTabs(state: LayoutState, tabs: TabDef[]): LayoutState {
  const validIds = new Set(tabs.map((t) => t.id));
  const slotIds = collectSlotIds(state.tree);
  const assigned = new Set<string>();

  const slots: Record<string, SlotState> = {};
  slotIds.forEach((sid) => {
    const tabIds = (state.slots[sid]?.tabIds ?? []).filter((id) => validIds.has(id));
    tabIds.forEach((id) => assigned.add(id));
    const activeTabId = validIds.has(state.slots[sid]?.activeTabId ?? "")
      && tabIds.includes(state.slots[sid].activeTabId)
      ? state.slots[sid].activeTabId
      : (tabIds[0] ?? "");
    slots[sid] = { tabIds, activeTabId };
  });

  const unassigned = tabs.filter((t) => !assigned.has(t.id));
  if (unassigned.length > 0 && slotIds.length > 0) {
    const firstSlot = slotIds[0];
    slots[firstSlot] = {
      ...slots[firstSlot],
      tabIds: [...slots[firstSlot].tabIds, ...unassigned.map((t) => t.id)],
      activeTabId: slots[firstSlot].activeTabId || unassigned[0].id,
    };
  }

  return { ...state, slots };
}

function readPersisted(storageKey: string): LayoutState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const saved = JSON.parse(raw) as LayoutState;
    const slotIds = collectSlotIds(saved.tree);
    const treeOk = hasValidTree(saved.tree);
    const slotsOk = slotIds.every((sid) => !!saved.slots[sid]);
    return treeOk && slotsOk ? saved : null;
  } catch {
    return null;
  }
}

function save(state: LayoutState, storageKey: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* ignore */ }
}

export function usePanelLayout(
  tabs: TabDef[],
  /** localStorage key — change this if you use the layout in multiple apps on the same domain */
  storageKey = "panel-layout-v1",
): PanelLayoutHandle {
  const tabMap = Object.fromEntries(tabs.map((t) => [t.id, t]));
  const [state, setState] = useState<LayoutState>(() => buildDefaultState(tabs));
  const rootRef = useRef<HTMLDivElement>(null);
  const dragPayloadRef = useRef<{ tabId: string; fromSlotId: string } | null>(null);

  const slotsRef = useRef(state.slots);
  slotsRef.current = state.slots;

  // Rehydrate from localStorage after mount only — keeps the first render
  // identical on server and client so hydration never mismatches.
  const hydratedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (hydratedKeyRef.current === storageKey) return;
    hydratedKeyRef.current = storageKey;
    const persisted = readPersisted(storageKey);
    if (persisted) setState(reconcileTabs(persisted, tabs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

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
    dragPayloadRef.current = { tabId, fromSlotId };
  }, []);

  const onTabDrop = useCallback((toSlotId: string, toIndex?: number) => {
    if (!dragPayloadRef.current) return;
    const { tabId, fromSlotId } = dragPayloadRef.current;
    dragPayloadRef.current = null;

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

  const onTabDragEnd = useCallback(() => { dragPayloadRef.current = null; }, []);

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
