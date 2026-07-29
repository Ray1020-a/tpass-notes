"use client";

import { useEffect, useRef, useState } from "react";

interface TagMultiSelectProps {
  tags: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function TagMultiSelect({ tags, selected, onChange, placeholder = "選擇標籤" }: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag];
    onChange(next);
  };

  const label = selected.length > 0 ? `標籤 (${selected.length})` : placeholder;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-xl border-2 border-foreground px-4 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)] ${
          selected.length > 0 ? "bg-primary/10" : "bg-card"
        }`}
      >
        <span>{label}</span>
        <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border-2 border-foreground bg-card p-1.5 shadow-[4px_4px_0_0_var(--color-foreground)]">
          {tags.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">尚無標籤</p>
          ) : (
            tags.map((tag) => {
              const isSelected = selected.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  className={`flex w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-sm font-bold text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-background"
                      : "border-transparent bg-transparent text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{tag}</span>
                  {isSelected ? (
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
