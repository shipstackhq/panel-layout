import { useLayoutEffect } from "react";
import { PanelLayoutContext } from "./panel-layout-context";
import { PanelGroup } from "./panel-group";
import { PanelSlot } from "./panel-slot";
import type { PanelLayoutHandle } from "./use-panel-layout";
import type { LayoutNode } from "./types";
import { initNodeSizes } from "./node-utils";

interface PanelLayoutProps {
  handle: PanelLayoutHandle;
  className?: string;
}

export function PanelLayout({ handle, className }: PanelLayoutProps) {
  const {
    state,
    tabMap,
    rootRef,
    onResizeEnd,
    getBounds,
    setActiveTab,
    onTabDragStart,
    onTabDrop,
    onTabDragEnd,
  } = handle;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    initNodeSizes(
      state.tree,
      rect.width,
      rect.height,
      root,
      state.sizeOverrides,
      state.slots,
      tabMap,
    );
  }, [state.template, state.sizeOverrides]);

  const sharedSlotProps = {
    slots: state.slots,
    tabMap,
    onSetActiveTab: setActiveTab,
    onTabDragStart,
    onTabDrop,
    onTabDragEnd,
  };

  const renderRoot = (node: LayoutNode) => {
    if (node.kind === "slot") {
      return (
        <PanelSlot
          slotId={node.id}
          state={state.slots[node.id] ?? { tabIds: [], activeTabId: "" }}
          tabMap={tabMap}
          onSetActiveTab={setActiveTab}
          onTabDragStart={onTabDragStart}
          onTabDrop={onTabDrop}
          onTabDragEnd={onTabDragEnd}
        />
      );
    }
    return <PanelGroup node={node} {...sharedSlotProps} style={{ flex: 1 }} />;
  };

  return (
    <PanelLayoutContext.Provider value={{ rootRef, onResizeEnd, getBounds }}>
      <div
        ref={rootRef}
        className={`pl-root${className ? ` ${className}` : ""}`}
      >
        <div className="pl-root-inner">
          {renderRoot(state.tree)}
        </div>
      </div>
    </PanelLayoutContext.Provider>
  );
}
