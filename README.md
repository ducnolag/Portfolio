# ducnolag · portfolio

Personal portfolio of **Nguyễn Mạnh Đức** (Business Analyst · AI Engineer · full-stack builder).
Bilingual EN/VI, scroll-driven WebGL, built for Vercel.

## What moves

- **Lanyard badge** (hero): a card with Đức's photo hanging on a strap, simulated with a custom Verlet rope. Grab it, throw it. Rises away with the hero as you scroll.
- **Lag, the companion**: a glossy TV-headed robot (after fayazara/robot-heads, rebuilt in Three.js) with an LED-matrix face and an antenna light. It glides in, follows the pointer, switches from idle to thinking to happy as the lines change, hops and spins when tapped, and glides off toward the next chapter.
- **Particle portrait**: ~50k points sampled from the sunset photo scatter, resolve into the picture, then blow away over a 3-screen hold.
- **Sideways gallery**: the three featured projects travel horizontally while the vertical scroll holds (native drag row on phones / reduced motion).
- A continuously drifting warm backdrop shader whose light shifts per chapter, an edge marquee, choreographed section entrances, and a curtain footer.

Motion is on by default (the OS "reduce motion" flag is not used, because many Windows machines have animation effects off unknowingly). The in-site **motion switch** in the nav/footer stores the choice in `localStorage` and shows finished states. Touch devices get native scrolling; low-tier devices get fewer particles and no post-processing.

## Stack

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript
- Tailwind CSS v4 (tokens in `app/globals.css`; wired via `turbopack.rules` in `next.config.ts`)
- Three.js via `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `meshline`
- `motion` for scroll-linked UI motion, `lenis` for smooth scrolling

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Edit content

All copy, projects, résumé and links live in **`lib/content.ts`**. Every string is `{ en, vi }`.
Photos live in `public/images/` (the badge uses `duc-mirror.jpg`, the particle scene uses `duc-sunset.jpg`),
project covers in `public/images/projects/` (1200×750 screenshots), the CV in `public/cv/`.

To add a project, append to `projects[]` with `title`, bilingual `tagline` / `description` / `highlights`,
`stack`, `category`, optional `repo` / `demo` + `demoKind`, `cover`, `role`, `year`, `featured`, `accent`, `visibility`.
The résumé section reads `resume` (education, experience, skillGroups, certificates, awards); update it when the CV changes
and replace `public/cv/Nguyen-Manh-Duc-CV.pdf`.

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. Import it at vercel.com/new (framework auto-detected, zero config).
3. Set the production domain, then update `metadataBase` in `app/layout.tsx`, `app/robots.ts` and `app/sitemap.ts` if it is not `ducnolag.vercel.app`.

## Structure

```
app/            layout, page, globals.css (tokens), icon, robots, sitemap
components/
  three/        World (fixed canvas), Backdrop, Lanyard, PortraitParticles, worldScale
  sections/     Nav, Hero, SceneWindow, About, ScenePortrait, Projects, Marquee, Skills, Contact, Footer
  ui/           Providers, SmoothScroll, Cursor, Reveal, LangToggle, Icon, Tilt
lib/            content.ts (data), i18n.tsx (language), scroll.ts (shared scroll state), hooks.ts
public/images/  photos
.claude/skills/ vendored design skills (impeccable, taste-skill, img2threejs) used while building
```
