# Shram Kadia · Portfolio

Personal site for Shram Kadia, a software engineer who builds AI products end to end.

**Live:** https://shram-kadia.vercel.app

It is one page (projects, experience, about, skills, contact) with live demos of several projects, a command palette (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd>) and a small developer game, Mission Control, that opens from the astronaut on the home screen or from `play()` in the browser console.

## Stack

- [Next.js 15](https://nextjs.org) (App Router) with React 19 and TypeScript
- Tailwind CSS 4, with `next-themes` for light and dark mode
- Framer Motion for small interactions; three.js through React Three Fiber for the starfield and the 3D project view, both loaded lazily
- A Node.js API route (`/api/contact`) that sends contact-form mail through Nodemailer
- Vitest for unit tests, Playwright for end-to-end tests, Lighthouse CI for performance, accessibility, best-practice and SEO budgets

## Running it

```bash
npm ci
npm run dev        # http://localhost:3000
```

The contact form needs these environment variables (in `.env.local` locally, or in the Vercel project settings):

| Variable | Purpose |
| --- | --- |
| `CONTACT_EMAIL_USER` | Gmail address that sends the mail |
| `GMAIL_APP_PASSWORD` | App password for that account |
| `CONTACT_EMAIL_TO` | Where messages go (defaults to `CONTACT_EMAIL_USER`) |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with Turbopack |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next.js core web vitals and TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright smoke tests (run `npm run build` first; uses the local Chrome) |

CI (`.github/workflows/ci.yml`) runs all of these on every pull request and on pushes to `main`, then checks production dependencies with `npm audit` and runs Lighthouse CI against the budgets in `lighthouserc.json`.

## Layout

```
src/
  app/                 layout, home page, 404, OG image, robots, sitemap, /api/contact
  components/
    sections/          Hero, Projects (grid and 3D), Experience, About, Skills, Contact
    site/              Nav and command palette
    game/              Mission Control
    projects/, ui/     Project card and shared UI pieces
    visuals/           Starfield and the astronaut guide
  lib/
    data/              Site content: projects, experience, education, skills
    site.ts            Site name, URLs, nav links
public/
  demos/               Static builds of project demos (each built in its own repo)
e2e/                   Playwright tests
```

Most content changes are edits to `src/lib/data/*`. A project with `featured: true` in `src/lib/data/projects.ts` shows in the first row of the grid.

## Notes

- Security headers, including a Content Security Policy, are set in `next.config.ts`. Only the Voice Tutor demo is allowed to use the microphone.
- Animations respect the system Reduce Motion setting.
