import React, { useState, useRef, useEffect } from "react";
import type { LayoutTemplate } from "./types";
import { TEMPLATES } from "./types";

// Minimal SVG previews — no icon library dependency
const LAYOUT_PREVIEWS: Record<LayoutTemplate, () => React.ReactElement> = {
  single: () => (
    <svg viewBox="0 0 20 14" fill="currentColor" width="20" height="14">
      <rect x="1" y="1" width="18" height="12" rx="1" />
    </svg>
  ),
  "two-h": () => (
    <svg viewBox="0 0 20 14" fill="currentColor" width="20" height="14">
      <rect x="1" y="1" width="8" height="12" rx="1" />
      <rect x="11" y="1" width="8" height="12" rx="1" />
    </svg>
  ),
  "two-v": () => (
    <svg viewBox="0 0 20 14" fill="currentColor" width="20" height="14">
      <rect x="1" y="1" width="18" height="5" rx="1" />
      <rect x="1" y="8" width="18" height="5" rx="1" />
    </svg>
  ),
  "three-main-right": () => (
    <svg viewBox="0 0 20 14" fill="currentColor" width="20" height="14">
      <rect x="1" y="1" width="10" height="12" rx="1" />
      <rect x="13" y="1" width="6" height="5" rx="1" />
      <rect x="13" y="8" width="6" height="5" rx="1" />
    </svg>
  ),
  "three-main-left": () => (
    <svg viewBox="0 0 20 14" fill="currentColor" width="20" height="14">
      <rect x="1" y="1" width="6" height="5" rx="1" />
      <rect x="1" y="8" width="6" height="5" rx="1" />
      <rect x="9" y="1" width="10" height="12" rx="1" />
    </svg>
  ),
  "three-h": () => (
    <svg viewBox="0 0 20 14" fill="currentColor" width="20" height="14">
      <rect x="1" y="1" width="5" height="12" rx="1" />
      <rect x="7.5" y="1" width="5" height="12" rx="1" />
      <rect x="14" y="1" width="5" height="12" rx="1" />
    </svg>
  ),
  four: () => (
    <svg viewBox="0 0 20 14" fill="currentColor" width="20" height="14">
      <rect x="1" y="1" width="8" height="5" rx="1" />
      <rect x="11" y="1" width="8" height="5" rx="1" />
      <rect x="1" y="8" width="8" height="5" rx="1" />
      <rect x="11" y="8" width="8" height="5" rx="1" />
    </svg>
  ),
};

interface LayoutPickerProps {
  current: LayoutTemplate;
  onChange: (template: LayoutTemplate) => void;
  /** Custom trigger element — receives onClick and aria props */
  trigger?: (props: { onClick: () => void; "aria-expanded": boolean }) => React.ReactElement;
}

export function LayoutPicker({ current, onChange, trigger }: LayoutPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const defaultTrigger = (
    <button
      className="pl-picker-trigger"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      title="Change layout"
    >
      {/* Simple grid icon */}
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    </button>
  );

  return (
    <div ref={containerRef} className="pl-picker-root">
      {trigger
        ? trigger({ onClick: () => setOpen((v) => !v), "aria-expanded": open })
        : defaultTrigger}

      {open && (
        <div className="pl-picker-popup">
          <p className="pl-picker-label">Layout</p>
          <div className="pl-picker-grid">
            {(Object.keys(TEMPLATES) as LayoutTemplate[]).map((tpl) => {
              const Preview = LAYOUT_PREVIEWS[tpl];
              const isActive = tpl === current;
              return (
                <button
                  key={tpl}
                  title={TEMPLATES[tpl].label}
                  data-active={isActive || undefined}
                  className={`pl-picker-item${isActive ? " pl-picker-item--active" : ""}`}
                  onClick={() => { onChange(tpl); setOpen(false); }}
                >
                  <Preview />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
