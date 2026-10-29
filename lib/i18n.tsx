"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { L, Lang } from "./content";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Resolve a bilingual value for the active language. */
  t: <T>(v: L<T>) => T;
};

const LangContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "portfolio.lang";

/* Tiny external store: server renders "en", the client snapshot comes from
   localStorage / navigator.language. useSyncExternalStore handles the
   hydration hand-off without a setState-in-effect. */
let current: Lang | null = null;
const listeners = new Set<() => void>();

function readLang(): Lang {
  if (current) return current;
  let detected: Lang = "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "vi") detected = saved;
    else if (navigator.language?.toLowerCase().startsWith("vi")) detected = "vi";
  } catch {}
  current = detected;
  return detected;
}

function writeLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {}
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const serverSnapshot = (): Lang => "en";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, serverSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => writeLang(l), []);
  const toggle = useCallback(() => writeLang(lang === "en" ? "vi" : "en"), [lang]);

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, toggle, t: (v) => v[lang] }),
    [lang, setLang, toggle],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LanguageProvider>");
  return ctx;
}
