"use client";

import { useState, type ReactNode } from "react";

export type SearchTabItem = {
  key: string;
  label: string;
  count: string;
  content: ReactNode;
};

/**
 * Client-side tab switcher. All tab contents are rendered once (server-fetched)
 * and toggled with CSS, so changing tab is instant — no navigation, no re-query.
 * The active tab is mirrored into the URL via replaceState (shareable, still no
 * round-trip).
 */
export function SearchTabs({
  tabs,
  initialTab,
  searchPath,
  q,
}: {
  tabs: SearchTabItem[];
  initialTab: string;
  searchPath: string;
  q: string;
}) {
  const initial = tabs.some((t) => t.key === initialTab) ? initialTab : tabs[0]?.key ?? "";
  const [active, setActive] = useState(initial);

  return (
    <>
      <div className="flex flex-wrap gap-x-7 gap-y-1 border-b border-[#e5e2da]">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActive(tab.key);
                if (typeof window !== "undefined") {
                  window.history.replaceState(
                    null,
                    "",
                    `${searchPath}?q=${encodeURIComponent(q)}&tab=${tab.key}`,
                  );
                }
              }}
              className={`-mb-px cursor-pointer border-b-2 pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[#1a1a1a] text-[#1a1a1a]"
                  : "border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div key={tab.key} className={tab.key === active ? "pt-6" : "hidden"}>
          {tab.content}
        </div>
      ))}
    </>
  );
}
