import { useState } from "react";
import type { TabDef, SlotState } from "./types";

interface PanelSlotProps {
  slotId: string;
  state: SlotState;
  tabMap: Record<string, TabDef>;
  onSetActiveTab: (slotId: string, tabId: string) => void;
  onTabDragStart: (tabId: string, fromSlotId: string) => void;
  onTabDrop: (toSlotId: string, toIndex?: number) => void;
  onTabDragEnd: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function PanelSlot({
  slotId,
  state,
  tabMap,
  onSetActiveTab,
  onTabDragStart,
  onTabDrop,
  onTabDragEnd,
  style,
  className,
}: PanelSlotProps) {
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const activeTab = tabMap[state.activeTabId];

  const getInsertIndex = (e: React.DragEvent<HTMLButtonElement>, tabIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX < rect.left + rect.width / 2 ? tabIndex : tabIndex + 1;
  };

  return (
    <div
      style={style}
      className={`pl-slot${className ? ` ${className}` : ""}`}
    >
      {/* Tab strip */}
      <div
        className={`pl-tab-strip${dropIndex !== null && state.tabIds.length === 0 ? " pl-tab-strip--drop-target" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (e.target === e.currentTarget) setDropIndex(state.tabIds.length);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropIndex(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onTabDrop(slotId, dropIndex ?? state.tabIds.length);
          setDropIndex(null);
        }}
      >
        {state.tabIds.map((tabId, i) => {
          const tab = tabMap[tabId];
          if (!tab) return null;
          const active = tabId === state.activeTabId;
          const icon = active ? (tab.activeIcon ?? tab.icon) : tab.icon;

          return (
            <div key={tabId} className="pl-tab-wrapper">
              {dropIndex === i && (
                <span className="pl-drop-indicator pl-drop-indicator--left" />
              )}

              <button
                draggable
                data-active={active || undefined}
                className={`pl-tab${active ? " pl-tab--active" : ""}`}
                onDragStart={(e) => { e.stopPropagation(); onTabDragStart(tabId, slotId); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropIndex(getInsertIndex(e, i)); }}
                onDragEnd={onTabDragEnd}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onTabDrop(slotId, getInsertIndex(e, i)); setDropIndex(null); }}
                onClick={(e) => {
                  onSetActiveTab(slotId, tabId);
                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                }}
              >
                {icon}
                {tab.label}
              </button>

              {dropIndex === i + 1 && i === state.tabIds.length - 1 && (
                <span className="pl-drop-indicator pl-drop-indicator--right" />
              )}
            </div>
          );
        })}

        {state.tabIds.length === 0 && (
          <span className="pl-tab-empty-hint">Drop a tab here</span>
        )}
      </div>

      {/* Content */}
      <div className="pl-tab-content">
        {activeTab ? activeTab.content : (
          <div className="pl-tab-empty">No tab selected</div>
        )}
      </div>
    </div>
  );
}
