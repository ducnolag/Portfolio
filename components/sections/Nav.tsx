"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useState } from "react";
import { profile, ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { LangToggle } from "@/components/ui/LangToggle";
import { MotionToggle } from "@/components/ui/MotionToggle";

const LINKS = [
  { id: "about", label: ui.nav.about },
  { id: "projects", label: ui.nav.projects },
  { id: "skills", label: ui.nav.skills },
  { id: "contact", label: ui.nav.contact },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

/** "ducnolag": the handle, with its "nolag" set in the serif voice. */
function Wordmark() {
  const handle = profile.handle;
  const i = handle.indexOf("nolag");
  const pre = i >= 0 ? handle.slice(0, i) : handle;
  const mark = i >= 0 ? handle.slice(i) : "";
  return (
    <a
      href="#content"
      className="inline-flex items-baseline font-display text-[1.25rem] font-bold tracking-[-0.02em] no-underline transition-colors duration-200 hover:text-orchid active:text-magenta"
    >
      {pre}
      {mark && <span className="font-serif text-[1.15em] italic text-orchid">{mark}</span>}
    </a>
  );
}

export function Nav() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    let ticking = false;
    const check = () => {
      setScrolled(window.scrollY > 24);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => {
      if (mq.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const solid = scrolled || open;

  return (
    <>
      <a
        href="#content"
        className="sr-only-focusable fixed left-4 top-4 z-[60] rounded-full bg-violet px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] no-underline"
      >
        {t(ui.a11y.skip)}
      </a>

      <header
        className="fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300 ease-out"
        style={{
          backgroundColor: solid ? "var(--ink-2)" : "transparent",
          borderColor: solid ? "var(--line)" : "transparent",
        }}
      >
        <nav className="container-x flex h-16 items-center justify-between gap-4">
          <Wordmark />

          <ul className="m-0 hidden list-none items-center gap-7 p-0 md:flex">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} className="nav-link">
                  {t(l.label)}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <MotionToggle className="hidden md:inline-flex" />
            <LangToggle />
            <button
              type="button"
              className="icon-btn md:hidden"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={t(open ? ui.a11y.closeMenu : ui.a11y.menu)}
              onClick={() => setOpen((o) => !o)}
            >
              <Icon name={open ? "close" : "menu"} size={22} />
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              id={menuId}
              className="border-t border-line bg-ink-2 md:hidden"
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              exit={{ clipPath: "inset(0 0 100% 0)", transition: { duration: 0.2, ease: EASE } }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <ul className="container-x m-0 flex list-none flex-col py-4">
                {LINKS.map((l) => (
                  <li key={l.id}>
                    <a
                      href={`#${l.id}`}
                      onClick={close}
                      className="nav-link block py-3 font-display text-[2rem] font-semibold tracking-[-0.02em]"
                    >
                      {t(l.label)}
                    </a>
                  </li>
                ))}
                <li className="pt-4">
                  <MotionToggle />
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
