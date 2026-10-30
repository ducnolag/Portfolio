/**
 * Lag's brain: a local, bilingual retrieval bot over the page's own content.
 * No network. Questions are normalised (lower-case, diacritics stripped) and
 * scored against a handful of intents; answers are assembled from
 * lib/content.ts with the few connective phrases below.
 */
import { profile, projects, resume, ui, type Lang, type Project } from "./content";

export type ChatLink = { label: string; href: string };
export type Mood = "happy" | "speaking" | "error";
export type Answer = {
  text: string;
  links?: ChatLink[];
  mood: Mood;
  /** Follow-up chips. */
  suggestions?: string[];
};

const P = {
  about: {
    en: (name: string, roles: string, loc: string) => `${name}: ${roles}, based in ${loc}.`,
    vi: (name: string, roles: string, loc: string) => `${name}: ${roles}, hiện ở ${loc}.`,
  },
  skillsLead: { en: "The short version of what he brings:", vi: "Bản ngắn về những gì Đức làm được:" },
  projectsLead: { en: "Eight things he built or led:", vi: "Tám sản phẩm Đức đã làm hoặc dẫn dắt:" },
  projectsTail: { en: "Ask me about any of them by name.", vi: "Hỏi mình về cái nào cũng được, cứ gọi tên." },
  contactLead: { en: "Easiest is email:", vi: "Dễ nhất là email:" },
  eduLead: { en: "Education:", vi: "Học vấn:" },
  gpa: { en: "GPA", vi: "GPA" },
  expLead: { en: "Experience:", vi: "Kinh nghiệm:" },
  awardsLead: { en: "Honours and certificates:", vi: "Danh hiệu và chứng chỉ:" },
  cvLead: { en: "Here is his CV, one page, PDF.", vi: "CV của Đức đây, một trang, PDF." },
  me: {
    en: "I'm Lag, Đức's build companion. The name is a joke: he ships without lag. Ask me about him, a project, or how to reach him.",
    vi: "Mình là Lag, bạn đồng hành của Đức. Tên là đùa thôi: Đức ship không lag. Hỏi mình về Đức, một dự án, hay cách liên hệ nhé.",
  },
  stack: { en: "Stack", vi: "Công nghệ" },
  year: { en: "Year", vi: "Năm" },
  gmail: { en: "Write in Gmail", vi: "Viết bằng Gmail" },
  mailApp: { en: "Open mail app", vi: "Mở ứng dụng mail" },
  cv: { en: "Download CV", vi: "Tải CV" },
  linkedin: { en: "LinkedIn", vi: "LinkedIn" },
  github: { en: "GitHub", vi: "GitHub" },
  thanks: { en: "Anytime. Anything else?", vi: "Có gì đâu. Còn gì nữa không?" },
} as const;

export function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PROJECT_KEYS: Record<string, string[]> = {
  toolify: ["toolify", "tool ai", "ai tool", "pdf", "watermark"],
  sv5t: ["sv5t", "5 tot", "five merits", "sinh vien 5", "xet duyet", "ekyc", "ocr"],
  misher: ["misher", "voice", "giong noi", "elder", "nguoi gia", "nguoi cao tuoi", "expo", "react native", "mobile app"],
  "lab-manager": ["lab", "phong may", "lab room", "computer lab", "thuc hanh"],
  "data-to-decision": ["data to decision", "decision", "quyet dinh", "champion", "quan quan", "dashboard", "data competition"],
  minigame: ["minigame", "mini game", "game", "vuot ai", "quiz", "it club", "clb"],
  sendmail: ["send mail", "sendmail", "gui mail", "tool mail", "mail tool", "bulk", "hang loat", "many people"],
  noodles: ["noodle", "noodles", "mi tron", "tiem an vat", "an vat", "storefront", "shop", "cua hang"],
};

const INTENTS: Record<string, string[]> = {
  greeting: ["hi", "hello", "hey", "chao", "xin chao", "alo", "yo", "good morning", "good evening"],
  self: ["who are you", "ban la ai", "may la ai", "what are you", "lag la", "ten gi", "your name"],
  about: ["who is", "who s", "duc la ai", "la ai", "about", "gioi thieu", "introduce", "tell me about duc", "ve duc", "himself", "background"],
  skills: ["skill", "ky nang", "business analyst", "as a ba", "ba ", "can he do", "lam duoc gi", "good at", "gioi gi", "strength", "brd", "bpmn", "figma", "requirements", "yeu cau"],
  projects: ["project", "du an", "built", "da lam", "portfolio", "work", "san pham", "what did he build", "products"],
  contact: ["contact", "lien he", "reach", "hire", "tuyen", "email", "mail", "linkedin", "gmail", "phone", "so dien thoai"],
  education: ["study", "studies", "hoc o", "school", "university", "truong", "gpa", "education", "hoc van", "academy", "hoc vien", "degree", "major", "nganh"],
  awards: ["award", "giai", "prize", "certificate", "chung chi", "scholarship", "hoc bong", "honour", "honor", "danh hieu", "mos"],
  experience: ["experience", "kinh nghiem", "worked", "intern", "thuc tap", "cong ty", "company", "annotator", "job"],
  cv: ["cv", "resume", "pdf", "download", "tai ve", "tai cv"],
  thanks: ["thanks", "thank you", "cam on", "thx", "ty"],
};

function hits(q: string, keys: readonly string[]) {
  let n = 0;
  for (const k of keys) if (q.includes(k)) n += k.length > 4 ? 2 : 1;
  return n;
}

function demoLabel(p: Project, lang: Lang) {
  const key = p.demoKind === "ui-only" ? ui.projects.viewUiOnly : p.demoKind === "build" ? ui.projects.viewBuild : ui.projects.viewDemo;
  return key[lang];
}

function projectAnswer(p: Project, lang: Lang): Answer {
  const links: ChatLink[] = [];
  if (p.demo) links.push({ label: demoLabel(p, lang), href: p.demo });
  if (p.repo) links.push({ label: ui.projects.viewRepo[lang], href: p.repo });
  const role = p.role ? ` ${p.role[lang]}.` : "";
  return {
    text: `${p.title}: ${p.lagSays[lang]} ${p.tagline[lang]}${role} ${P.stack[lang]}: ${p.stack.join(" · ")}.`,
    links,
    mood: "speaking",
    suggestions: projects.filter((x) => x.slug !== p.slug).slice(0, 2).map((x) => x.title),
  };
}

export function greeting(lang: Lang): Answer {
  return { text: ui.chat.greeting[lang], mood: "happy", suggestions: [...ui.chat.suggestions[lang]] };
}

export function answer(question: string, lang: Lang): Answer {
  const q = ` ${normalise(question)} `;
  const sugg = ui.chat.suggestions[lang];

  // A named project wins over everything else.
  let best: { p: Project; score: number } | null = null;
  for (const p of projects) {
    const score = hits(q, [p.slug, normalise(p.title), ...(PROJECT_KEYS[p.slug] ?? [])]);
    if (score > 0 && (!best || score > best.score)) best = { p, score };
  }
  if (best && best.score >= 2) return projectAnswer(best.p, lang);

  const scores = Object.fromEntries(Object.entries(INTENTS).map(([k, keys]) => [k, hits(q, keys)]));
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const intent = top && top[1] > 0 ? top[0] : best ? "project" : "unknown";

  switch (intent) {
    case "project":
      return projectAnswer(best!.p, lang);
    case "greeting":
      return { text: ui.chat.greeting[lang], mood: "happy", suggestions: [...sugg] };
    case "self":
      return { text: P.me[lang], mood: "happy", suggestions: [sugg[0], sugg[2]] };
    case "thanks":
      return { text: P.thanks[lang], mood: "happy", suggestions: [sugg[1], sugg[3]] };
    case "about":
      return {
        text: `${P.about[lang](profile.name, profile.roles[lang].join(" · "), profile.location[lang])} ${profile.intro[lang][0]} ${profile.intro[lang][1]}`,
        mood: "speaking",
        suggestions: [sugg[1], sugg[2]],
      };
    case "skills":
      return {
        text: `${P.skillsLead[lang]} ${resume.skillGroups.map((g) => `${g.group[lang]}: ${g.items[lang].join("; ")}`).join(" — ")}`,
        mood: "speaking",
        links: [{ label: P.cv[lang], href: profile.cv.href }],
        suggestions: [sugg[2], sugg[3]],
      };
    case "projects":
      return {
        text: `${P.projectsLead[lang]} ${projects.map((p) => `${p.title} (${p.tagline[lang]})`).join(" · ")}. ${P.projectsTail[lang]}`,
        mood: "speaking",
        suggestions: projects.slice(0, 3).map((p) => p.title),
      };
    case "contact": {
      const su = encodeURIComponent(ui.contact.emailSubject[lang]);
      return {
        text: `${P.contactLead[lang]} ${profile.email}`,
        links: [
          { label: P.gmail[lang], href: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}&su=${su}` },
          { label: P.mailApp[lang], href: `mailto:${profile.email}?subject=${su}` },
          { label: P.linkedin[lang], href: profile.links.linkedin },
          { label: P.github[lang], href: profile.links.github },
          { label: P.cv[lang], href: profile.cv.href },
        ],
        mood: "happy",
        suggestions: [sugg[0], sugg[1]],
      };
    }
    case "education": {
      const e = resume.education;
      return {
        text: `${P.eduLead[lang]} ${e.school[lang]}, ${e.faculty[lang]}. ${e.degree[lang]}, ${e.period}. ${P.gpa[lang]} ${e.gpa}.`,
        mood: "speaking",
        suggestions: [sugg[1], sugg[2]],
      };
    }
    case "awards":
      return {
        text: `${P.awardsLead[lang]} ${[...resume.awards, ...resume.certificates].map((a) => `${a.name[lang]} (${a.year})`).join(" · ")}.`,
        mood: "happy",
        suggestions: [sugg[0], sugg[3]],
      };
    case "experience":
      return {
        text: `${P.expLead[lang]} ${resume.experience.map((j) => `${j.role[lang]}, ${j.company}, ${j.period}. ${j.summary[lang]}`).join(" ")}`,
        mood: "speaking",
        suggestions: [sugg[1], sugg[2]],
      };
    case "cv":
      return { text: P.cvLead[lang], links: [{ label: P.cv[lang], href: profile.cv.href }], mood: "happy", suggestions: [sugg[1], sugg[3]] };
    default:
      return { text: ui.chat.unknown[lang], mood: "error", suggestions: [sugg[0], sugg[2]] };
  }
}
