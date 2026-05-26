"use client";

import { useEffect, useRef, useState } from "react";

type ArtistBioProps = {
  text: string;
  readMoreLabel: string;
};

function splitBioParagraphs(text: string): string[] {
  const byDoubleNewline = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (byDoubleNewline.length > 1) {
    return byDoubleNewline;
  }

  const bySingleNewline = text
    .split(/\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (bySingleNewline.length > 1) {
    return bySingleNewline;
  }

  return text.trim() ? [text.trim()] : [];
}

export function ArtistBio({ text, readMoreLabel }: ArtistBioProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphs = splitBioParagraphs(text);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || expanded) {
      return;
    }

    const checkOverflow = () => {
      setCanExpand(element.scrollHeight > element.clientHeight + 1);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text, expanded]);

  return (
    <div>
      <div
        ref={containerRef}
        className={`space-y-3 ${expanded ? "" : "line-clamp-4"}`}
      >
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed text-[#6b6b6b]">
            {paragraph}
          </p>
        ))}
      </div>
      {canExpand && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-sm font-semibold text-[#1a1a1a] hover:underline"
        >
          {readMoreLabel}
        </button>
      ) : null}
    </div>
  );
}
