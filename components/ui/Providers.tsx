"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { SmoothScroll } from "./SmoothScroll";
import { Cursor } from "./Cursor";
import { LagChat } from "./LagChat";

/** Flags `html.js` so CSS may hold pre-reveal states; without it the page is simply finished. */
function JsFlag() {
  useLayoutEffect(() => {
    document.documentElement.classList.add("js");
  }, []);
  return null;
}

/**
 * Client-side providers: language context, Lenis smooth scroll (off under
 * reduced motion / touch, with a native scroll writer instead) and the
 * fine-pointer custom cursor.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <JsFlag />
      <SmoothScroll>{children}</SmoothScroll>
      <LagChat />
      <Cursor />
    </LanguageProvider>
  );
}
