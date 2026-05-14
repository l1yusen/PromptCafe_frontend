# Repository Guidelines

## Project Structure & Module Organization

This is a Vue 3 + Vite frontend. Application entry files live in `src/main.ts`, `src/App.vue`, and `src/router/index.ts`. Page-level views are in `src/pages/`, shared layouts are in `src/layouts/`, API clients are grouped under `src/api/`, and reusable utilities are in `src/util/`. Global styles are in `src/style.css`. End-to-end tests live in `tests/e2e/`.

## Build, Test, and Development Commands

- `npm run dev`: starts the Vite development server.
- `npm run build`: runs Vue/TypeScript type checks and produces the production build in `dist/`.
- `npm run preview`: serves the built app locally for inspection.
- `npm run test:e2e`: runs Playwright browser tests against a preview server.

Run `npm install` after pulling dependency changes.

## Coding Style & Naming Conventions

Use Vue single-file components with `<script setup lang="ts">`. Keep API access inside `src/api/*` modules and expose typed functions rather than calling `fetch` directly from components. Use two-space indentation, double quotes in TypeScript, and camelCase for variables/functions. Components and page files use PascalCase, for example `CommunityPage.vue`.

## Testing Guidelines

Use Playwright for UI workflows that depend on routing, API calls, or user interaction. Test files should be named `*.spec.ts` and placed in `tests/e2e/`. Mock backend endpoints in tests when verifying frontend behavior. Before pushing, run:

```bash
npm run build
npm run test:e2e
```

## Commit & Pull Request Guidelines

Recent commits use concise Chinese summaries, for example `添加 AI 与社区前端功能`. Keep commits focused on one feature or fix. Pull requests should include a short description, affected pages or APIs, test results, and screenshots for visible UI changes. Link related issues or backend API documents when relevant.

## Security & Configuration Tips

Do not commit real API keys or tokens. Runtime API configuration should use environment variables such as `VITE_API_BASE_URL`. AI API keys are handled through the backend `/api/ai/api-key` endpoints; never store secrets directly in source files.
