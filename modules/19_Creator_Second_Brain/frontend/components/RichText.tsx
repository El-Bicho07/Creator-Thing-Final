"use client";

import { Fragment } from "react";

/** Renders model text with **bold** and clickable [n] citation chips. */
export default function RichText({ text, onCite }: { text: string; onCite?: (n: number) => void }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((p, pi) => (
        <p key={pi} className="leading-relaxed [&:not(:first-child)]:mt-3">
          {p.split(/(\*\*[^*]+\*\*|\[\d+(?:,\s*\d+)*\])/g).map((part, i) => {
            const bold = part.match(/^\*\*([^*]+)\*\*$/);
            if (bold) return <strong key={i}>{bold[1]}</strong>;
            const cite = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
            if (cite)
              return (
                <Fragment key={i}>
                  {cite[1].split(/,\s*/).map((n) => (
                    <button
                      key={n}
                      onClick={() => onCite?.(Number(n))}
                      className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-accent-soft px-1 align-text-top text-[11px] font-semibold text-violet-700 hover:bg-accent hover:text-white"
                    >
                      {n}
                    </button>
                  ))}
                </Fragment>
              );
            return <Fragment key={i}>{part}</Fragment>;
          })}
        </p>
      ))}
    </>
  );
}
