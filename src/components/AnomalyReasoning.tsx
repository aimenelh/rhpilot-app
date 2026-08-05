"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function AnomalyReasoning({ reasoning }: { reasoning: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (reasoning.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
      >
        <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        Pourquoi cette suggestion ?
      </button>
      {isOpen && (
        <ul className="mt-1.5 flex flex-col gap-1 rounded-lg bg-surface-subtle px-3 py-2">
          {reasoning.map((fact, i) => (
            <li key={i} className="text-xs text-ink-faint">
              {fact}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
