import type { ReactNode } from "react";

/** Split prose into ~3 paragraphs using sentence boundaries, with fallbacks for short text. */
function splitIntoThreeParagraphs(raw: string): string[] {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return [];

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return splitRoughIntoThree(text);
  }

  if (sentences.length === 1) {
    const one = sentences[0];
    const bySemicolon = one.split(/\s*;\s+/).map((s) => s.trim()).filter(Boolean);
    if (bySemicolon.length >= 3) {
      return [
        bySemicolon[0],
        bySemicolon[1],
        bySemicolon.slice(2).join("; "),
      ];
    }
    if (bySemicolon.length === 2) {
      return [bySemicolon[0], bySemicolon[1]];
    }
    const clauses = one.split(/,\s+/);
    if (clauses.length >= 6) {
      const t = Math.ceil(clauses.length / 3);
      return [
        clauses.slice(0, t).join(", "),
        clauses.slice(t, 2 * t).join(", "),
        clauses.slice(2 * t).join(", "),
      ].map((s) => s.trim());
    }
    return [one];
  }

  if (sentences.length === 2) {
    return [sentences[0], sentences[1]];
  }

  const n = sentences.length;
  const base = Math.floor(n / 3);
  const rem = n % 3;
  const sizes = [base + (rem > 0 ? 1 : 0), base + (rem > 1 ? 1 : 0), base];
  const out: string[] = [];
  let idx = 0;
  for (const size of sizes) {
    out.push(sentences.slice(idx, idx + size).join(" "));
    idx += size;
  }
  return out;
}

function splitRoughIntoThree(text: string): string[] {
  const len = text.length;
  if (len <= 2) return [text];
  const third = Math.max(1, Math.ceil(len / 3));
  const parts: string[] = [];
  let at = 0;
  for (let k = 0; k < 3 && at < len; k++) {
    let end = k === 2 ? len : Math.min(len, at + third);
    if (k < 2 && end < len) {
      const sp = text.lastIndexOf(" ", end);
      if (sp > at + 12) end = sp;
    }
    parts.push(text.slice(at, end).trim());
    at = end;
    while (at < len && text[at] === " ") at++;
  }
  return parts.filter(Boolean);
}

/** Index of a `*` that opens `*...*` (skips `**` pairs so `**bold**` stays one token). */
function indexOfSingleStarOpen(text: string, from: number): number {
  let j = from;
  while (j < text.length) {
    if (text[j] !== "*") {
      j++;
      continue;
    }
    if (j + 1 < text.length && text[j + 1] === "*") {
      j += 2;
      continue;
    }
    return j;
  }
  return -1;
}

/** Renders plain segments, `"quoted"` / `“curly”` as italic, `*bold*` and `**bold**` as strong. */
function parseDescriptionInlines(text: string): ReactNode {
  if (!text) return null;

  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const openQuote = (j: number) => {
    const c = text[j];
    return c === '"' || c === "\u201c";
  };

  const closeQuoteIndex = (from: number, open: string) => {
    const closeChar = open === "\u201c" ? "\u201d" : '"';
    return text.indexOf(closeChar, from);
  };

  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end === -1) {
        nodes.push(text.slice(i));
        break;
      }
      nodes.push(
        <strong key={`b-${key++}`} className="font-semibold text-[#1a1a1a]">
          {text.slice(i + 2, end)}
        </strong>
      );
      i = end + 2;
      continue;
    }

    // Single *...* → bold (common in CMS copy); ** handled above
    if (text[i] === "*") {
      const end = text.indexOf("*", i + 1);
      if (end === -1) {
        nodes.push(text.slice(i));
        break;
      }
      nodes.push(
        <strong key={`s-${key++}`} className="font-semibold text-[#1a1a1a]">
          {text.slice(i + 1, end)}
        </strong>
      );
      i = end + 1;
      continue;
    }

    if (openQuote(i)) {
      const open = text[i] === "\u201c" ? "\u201c" : '"';
      const end = closeQuoteIndex(i + 1, open);
      if (end === -1) {
        nodes.push(text.slice(i));
        break;
      }
      const inner = text.slice(i + 1, end);
      nodes.push(
        <em key={`q-${key++}`} className="italic">
          {open}
          {inner}
          {open === "\u201c" ? "\u201d" : '"'}
        </em>
      );
      i = end + 1;
      continue;
    }

    const nextDoubleStar = text.indexOf("**", i);
    const nextSingleStar = indexOfSingleStarOpen(text, i);
    const nextStraight = text.indexOf('"', i);
    const nextCurly = text.indexOf("\u201c", i);
    let nextQuote = -1;
    if (nextStraight === -1) nextQuote = nextCurly;
    else if (nextCurly === -1) nextQuote = nextStraight;
    else nextQuote = Math.min(nextStraight, nextCurly);

    let next = text.length;
    if (nextDoubleStar !== -1) next = Math.min(next, nextDoubleStar);
    if (nextSingleStar !== -1) next = Math.min(next, nextSingleStar);
    if (nextQuote !== -1) next = Math.min(next, nextQuote);

    if (next > i) {
      nodes.push(text.slice(i, next));
    }
    i = next;
  }

  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

type ArtworkDescriptionContentProps = {
  description: string;
};

export function ArtworkDescriptionContent({ description }: ArtworkDescriptionContentProps) {
  const paragraphs = splitIntoThreeParagraphs(description);

  return (
    <div className="text-sm leading-relaxed text-[#4a4a4a]">
      <div className="min-w-0">
        {paragraphs.map((block, index) => (
          <p
            key={index}
            className="m-0 text-pretty mb-[1.75em] last:mb-0"
          >
            {parseDescriptionInlines(block)}
          </p>
        ))}
      </div>
    </div>
  );
}
