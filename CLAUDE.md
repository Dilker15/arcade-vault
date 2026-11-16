# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault (`arcade-vauld`) — a platform for playing games online and competing for the highest score. The codebase is currently a fresh `create-next-app` scaffold (App Router) with no game features implemented yet.

## Commands

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config via `eslint.config.mjs`)

There is no test suite configured yet.

## Architecture

- Next.js 16 App Router, React 19, TypeScript (strict mode), Tailwind CSS v4.
- Routes/pages live under `app/`; `app/layout.tsx` is the root layout, `app/page.tsx` the home page.
- Tailwind is wired through the Turbopack loader in `next.config.ts` (`@tailwindcss/turbopack` applied to `*.css`), not a standalone PostCSS config. Global styles/theme tokens are in `app/globals.css` using Tailwind's `@theme inline` block.
- `next.config.ts` enables `experimental.agentFeedback`, `cacheComponents`, and `partialPrefetching` — these are newer/experimental Next.js flags, so APIs and conventions may diverge from older Next.js knowledge. Check `node_modules/next/dist/docs/` for the installed version's actual behavior before relying on cached assumptions.
- Path alias `@/*` maps to the repo root (see `tsconfig.json`).

## Spec-driven workflow

This project intends to follow spec-driven development using the `/spec` and `/spec-impl` skills from `Klerith/fernando-skills` (installed via `npx skills@latest add Klerith/fernando-skills`). If those skills are available, prefer writing a spec first (`/spec`) and implementing against it (`/spec-impl`) rather than making ad hoc changes.
