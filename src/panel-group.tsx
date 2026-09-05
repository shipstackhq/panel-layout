import type { LayoutNode, TabDef, SlotState } from "./types";
import { PanelSlot } from "./panel-slot";
import { ResizerGutter } from "./resizer-gutter";

interface PanelGroupProps {
  node: Extract<LayoutNode, { kind: "group" }>;
  slots: Record<string, SlotState>;
  tabMap: Record<string, TabDef>;
  onSetActiveTab: (slotId: string, tabId: string) => void;
  onTabDragStart: (tabId: string, fromSlotId: string) => void;
  onTabDrop: (toSlotId: string, toIndex?: number) => void;
  onTabDragEnd: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function PanelGroup({
  node,
  slots,
  tabMap,
  onSetActiveTab,
  onTabDragStart,
  onTabDrop,
  onTabDragEnd,
  style,
  className,
}: PanelGroupProps) {
  const isH = node.dir === "h";
  const sharedProps = { slots, tabMap, onSetActiveTab, onTabDragStart, onTabDrop, onTabDragEnd };

  return (
    <div
      className={`pl-group pl-group--${node.dir}${className ? ` ${className}` : ""}`}
      style={style ?? { flex: 1 }}
    >
      {node.children.flatMap((child, i) => {
        const isLast = i === node.children.length - 1;

        const childStyle: React.CSSProperties = isLast
          ? { flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" }
          : {
              [isH ? "width" : "height"]: `var(--panel-${child.id})`,
              flexShrink: 0,
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
            };

        const childEl = child.kind === "slot" ? (
          <PanelSlot
            key={child.id}
            slotId={child.id}
            state={slots[child.id] ?? { tabIds: [], activeTabId: "" }}
            {...sharedProps}
          />
        ) : (
          <PanelGroup
            key={child.id}
            node={child as Extract<LayoutNode, { kind: "group" }>}
            {...sharedProps}
          />
        );

        return [
          <div
            key={child.id}
            style={childStyle}
            className={`pl-group-child${!isLast ? ` pl-group-child--border-${node.dir}` : ""}`}
          >
            {childEl}
          </div>,
          !isLast && (
            <ResizerGutter
              key={`gutter-${i}`}
              dir={node.dir}
              siblings={node.children}
              index={i}
            />
          ),
        ];
      })}
    </div>
  );
}
