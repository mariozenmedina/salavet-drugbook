# Agent Instructions

- Never test in a browser. The operator will validate and test changes, then report back if there is a problem.
- Use `pnpm` and Docker when needed.
- When creating commits, use the identity `Mario Veronesi Medina <mazen.mario@gmail.com>`.
- Before implementing new steps, read `docs/BUILD_PLAN.md` and update the status of what was done.
- Keep the project mobile first, multilingual with `pt-BR` as the default end-user locale, installable as a PWA, and built with Vite + Vue + TypeScript + LESS.
- Repository conventions must be in English: files, folders, components, composables, stores, variables, functions, types, routes, tests, scripts, commit messages, comments, and developer documentation.
- End-user content must be translatable and live under the matching locale folder. The default user-facing content is Brazilian Portuguese in `public/data/pt-BR`.
- Do not hardcode translatable user-facing strings inside Vue components.
