"use client";

import { useEffect, useRef, useState } from "react";
import { profile, ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Closing chapter on the ink-3 ground. The primary action opens a Gmail
 * compose window (works without a desktop mail client); the mail-app link,
 * copy-email and CV download sit beside it. Parts arrive in reading order.
 */
export function Contact() {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  const subject = encodeURIComponent(t(ui.contact.emailSubject));
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}&su=${subject}`;
  const mailto = `mailto:${profile.email}?subject=${subject}`;

  return (
    <section
      id="contact"
      className="ground-ink-3 flex min-h-[100svh] scroll-mt-16 items-center py-[clamp(6rem,14vh,10rem)]"
      aria-labelledby="contact-heading"
    >
      <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-8">
          <h2
            id="contact-heading"
            className="m-0 max-w-[12ch] text-[clamp(2.75rem,7vw,6rem)] font-bold leading-[0.95] tracking-[-0.035em]"
          >
            <span className="mask-line">
              <Reveal as="span" variant="line">
                {t(ui.contact.heading)}
              </Reveal>
            </span>
          </h2>
          <Reveal as="p" variant="rise" delay={80} className="mt-7 max-w-[44ch] text-[clamp(1.125rem,1.5vw,1.375rem)] leading-[1.45] text-fg">
            {t(ui.contact.body)}
          </Reveal>

          {/* Action group: 2×2 on phones, one row from 640px */}
          <Reveal variant="rise" delay={160} className="mt-9">
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:flex sm:flex-wrap sm:items-center">
              <li>
                <a href={gmail} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full sm:w-auto">
                  <Icon name="mail" size={18} />
                  {t(ui.contact.emailCta)}
                </a>
              </li>
              <li>
                <a href={mailto} className="btn btn-ghost w-full sm:w-auto">
                  {t(ui.contact.openMailApp)}
                </a>
              </li>
              <li>
                <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={copy} data-copied={copied ? "" : undefined}>
                  <Icon name={copied ? "check" : "copy"} size={18} />
                  {copied ? t(ui.contact.copied) : t(ui.contact.copy)}
                </button>
              </li>
              <li>
                <a href={profile.cv.href} download={profile.cv.filename} className="btn btn-ghost w-full sm:w-auto">
                  <Icon name="download" size={18} />
                  {t(ui.contact.cv)}
                </a>
              </li>
            </ul>
            <p className="mt-3 max-w-none text-[0.875rem] text-fg-muted">{t(ui.contact.cvNote)}</p>
            <span aria-live="polite" className="sr-only">
              {copied ? t(ui.contact.copied) : ""}
            </span>
          </Reveal>
        </div>

        <Reveal variant="fade" delay={240} className="self-end lg:col-span-4 lg:col-start-9">
          <p className="m-0 max-w-none break-all text-[clamp(1.125rem,1.5vw,1.375rem)] font-medium">
            <a href={mailto} className="no-underline hover:text-orchid">
              {profile.email}
            </a>
          </p>
          <ul className="m-0 mt-5 flex list-none flex-wrap gap-x-7 gap-y-3 p-0 text-[1.0625rem]">
            <li>
              <a href={profile.links.github} target="_blank" rel="noopener noreferrer" className="link-arrow">
                <Icon name="github" size={20} />
                GitHub
                <Icon name="arrow-up-right" size={16} />
              </a>
            </li>
            <li>
              <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" className="link-arrow">
                <Icon name="linkedin" size={20} />
                LinkedIn
                <Icon name="arrow-up-right" size={16} />
              </a>
            </li>
          </ul>
          <p className="m-0 mt-5 max-w-none text-[1.0625rem] text-fg-muted">{t(profile.location)}</p>
        </Reveal>
      </div>
    </section>
  );
}
