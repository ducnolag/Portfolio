"use client";

import { ui, type Lang } from "@/lib/content";
import { useLang } from "@/lib/i18n";

const OPTIONS: Lang[] = ["en", "vi"];

/**
 * Segmented EN / VI control. The active segment is a pressed button; the
 * inactive one carries the "switch to …" label from content so screen readers
 * hear the action, not just two letters.
 */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useLang();

  return (
    <div
      role="group"
      className={`lang-toggle relative inline-grid h-9 grid-cols-2 rounded-full border border-[var(--line-strong)] p-[3px] ${className}`}
      data-lang={lang}
    >
      <span aria-hidden className="lang-toggle-thumb" />
      {OPTIONS.map((opt) => {
        const active = opt === lang;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            aria-label={active ? undefined : t(ui.a11y.toggleLang)}
            lang={opt}
            onClick={() => setLang(opt)}
            className="lang-toggle-seg relative z-10 min-w-10 rounded-full px-2 text-[0.8125rem] font-semibold uppercase leading-none"
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
