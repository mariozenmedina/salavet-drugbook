# Build Plan - Sala Vet Drugbook

This document is the project's operational guide. Each stage should be executed as a separate task, reviewed, and marked here before moving to the next one.

## Current Status

- [x] Create the initial repository plan.
- [x] Ignore `.crawler-data/` in Git.
- [x] Document the expected JSON data architecture.
- [x] Establish English as the repository and code convention.
- [ ] Install the Vite + Vue + TypeScript project.
- [ ] Convert the initial `a.json` and `b.json` data to the new schema.
- [ ] Implement the webapp.
- [ ] Implement the prescription page and calculator.
- [ ] Prepare the public contribution workflow.

## Language Conventions

- Repository, code, and developer-facing materials must be in English.
- Use English for file names, folder names, components, composables, stores, variables, functions, types, routes, tests, scripts, comments, and commit messages.
- End-user text must be translated through locale JSON files.
- The default end-user locale is `pt-BR`, stored under `public/data/pt-BR`.
- Do not hardcode translatable user-facing strings in Vue components.
- Clinical data fields may contain translated values when they are shown to users, but schema keys and enum values must remain English.

## Product Principles

- Mobile first: the primary experience must work very well on phones.
- Installable PWA: users should be able to add the app to their home screen and use cached essential data.
- Data-driven multilingual UI: every translatable string must live in locale data, not inside components.
- Default `pt-BR`: any route without an explicit locale should fall back to `pt-BR`.
- Structured data: do not load raw source HTML; components should render typed JSON blocks.
- Persistent prescription: prescription data must survive reloads through `localStorage`.
- Clinical safety: calculations, warnings, and interactions must be traceable to source and review status.
- Agents must not test in a browser: visual and interactive validation is handled by the operator.

## Planned Stack

- `Vite` + `Vue 3` + `TypeScript`.
- `Vue Router` for screens.
- `Pinia` for prescription state, preferences, and lightweight cache.
- `LESS` for styles.
- `lucide-vue-next` for icons.
- `vite-plugin-pwa` for manifest and service worker.
- `Vitest` for pure functions, validators, search, and calculator logic.
- `@vue/test-utils` only for component unit tests when useful.

## Planned Routes

- `/` redirects to `/{locale}` with `pt-BR` as the default.
- `/{locale}`: welcome/home screen with the alphabet grid loaded from locale data.
- `/{locale}/letter/{letter}`: filterable drug list for that letter.
- `/{locale}/drug/{slug}`: drug monograph.
- `/{locale}/prescription`: calculator and editable/printable prescription page.

Route segments are intentionally English because routes are part of the repository and developer convention. User-facing labels can still be translated.

## Top Navigation

The top bar should contain only:

- Product/Sala Vet name.
- Global drug search.
- Prescription/calculator icon button.
- Locale selector.

Search should open a scrollable result list as soon as the user types at least one character. It should search `primaryName`, trade names, synonyms, and related components.

## Visual Design

Palette inspired by Boardmaster/Pilot whiteboard markers:

- Primary blue: `#0B56A4`.
- Alert/accent red: `#D7281F`.
- Ink black: `#151515`.
- Auxiliary green: `#168A3A`.
- Auxiliary orange: `#F07A00`.
- Auxiliary violet: `#4B2686`.
- Light paper: `#F8FAFC`.
- Dark background: `#101418`.

Expected usage:

- Blue for navigation, focus, and primary actions.
- Red for clinical warnings and destructive states.
- Black/gray for long-form reading.
- Green, orange, and violet only as accents that do not dominate the UI.
- Light and dark themes with CSS/LESS tokens and persisted preference.

## Stage 1 - Project Bootstrap

Goal: create the Vue foundation without implementing product features yet.

Tasks:

- Run `pnpm create vite . --template vue-ts`.
- Preserve existing docs if the scaffold tries to overwrite files.
- Install planned dependencies: Vue Router, Pinia, LESS, Lucide, and the PWA plugin.
- Configure `dev`, `build`, `preview`, `test`, `typecheck`, and `lint` scripts when applicable.
- Create the initial folder structure.
- Confirm that the project builds from the command line.

Acceptance criteria:

- `pnpm install` has been run.
- `pnpm run build` finishes without errors.
- No raw `.crawler-data/` content is versioned.
- `docs/BUILD_PLAN.md` is updated with what was done.

## Stage 2 - Data Structure and Types

Goal: define contracts before the UI depends on the data.

Tasks:

- Create TypeScript types for locale, index, drug, sections, dosages, alerts, interactions, and references.
- Create schema validators for JSON data.
- Create loaders that fetch data by locale and letter.
- Create normalized accent-insensitive and case-insensitive search.
- Create minimal mock data in `public/data/pt-BR`.

Acceptance criteria:

- Unit tests cover search normalization.
- Unit tests cover mock data loading and validation.
- Schema documentation is updated if anything changes.

## Stage 3 - Initial A/B Data Migration

Goal: transform `.crawler-data/a.json` and `.crawler-data/b.json` into reviewable structured data.

Notes about the raw data:

- Local files contain large monographs with `conteudo_texto` and `conteudo_html`.
- The `Doses` section includes embedded HTML, scripts, and calculator text.
- Publishing the content requires an explicit permission/license review before the repository becomes public.

Tasks:

- Create an import script in `scripts/`.
- Extract basic metadata: primary name, slug, letter, local source, sections, and detectable references.
- Remove scripts, styles, and raw HTML.
- Convert common sections into structured blocks.
- Isolate dosage data into reviewable fields, even if initially marked as `needsReview`.
- Mark obvious clinical warnings as candidates, never as final truth without review.
- Generate `public/data/pt-BR/letters/a.json`, `b.json`, and `search-index.json`.

Acceptance criteria:

- Import is reproducible by command.
- Generated files pass validation.
- Imported records include `reviewStatus`.
- License-sensitive data is not published without an explicit decision.

## Stage 4 - App Shell and Theme

Goal: deliver the visual shell and basic navigation.

Tasks:

- Create a mobile-first layout with sticky top navigation.
- Implement light/dark themes with LESS/CSS tokens.
- Implement locale selector.
- Persist theme and locale preferences.
- Create base components: icon button, search input, select, chip, alert, compact card, and list.

Acceptance criteria:

- Build passes.
- Components do not contain hardcoded strings that should be translated.
- Theme switching preserves basic contrast.

## Stage 5 - Welcome and Alphabet

Goal: create the home screen using only locale data.

Tasks:

- Load `manifest.json`, `ui.json`, and `alphabet.json`.
- Display the alphabet grid.
- Show drug counts by letter when available.
- Handle letters with no drugs.
- Redirect missing/invalid locale to `pt-BR`.

Acceptance criteria:

- Home screen is built from JSON.
- No letter is hardcoded in the component.
- The screen works with an alternate alphabet from another locale.

## Stage 6 - Letter Drug List

Goal: list and filter drugs for a letter.

Tasks:

- Load `letters/{letter}.json`.
- Display primary name, synonyms/trade names, class, and summarized warnings.
- Filter within the letter.
- Sort by normalized name.
- Link to the monograph.

Acceptance criteria:

- Filtering finds primary names and trade names.
- Empty state is translated.
- Inconsistent data produces a friendly error.

## Stage 7 - Global Search

Goal: allow searching from the top navigation.

Tasks:

- Load `search-index.json` for the active locale.
- Open a scrollable panel from 1 typed character.
- Search by primary name, synonyms, trade names, and components.
- Support keyboard and touch.
- Close the panel after choosing a result or changing routes.

Acceptance criteria:

- Accent-insensitive search finds accented terms.
- Results show enough context to distinguish similar drugs.
- The panel is usable on small screens.

## Stage 8 - Drug Monograph

Goal: render all structured information for a drug.

Tasks:

- Create a section renderer by block type.
- Create collapsible sections.
- Highlight clinical warnings by severity.
- Show reviewed species-specific dosages.
- Show references and review status.
- Link to add/calculate on the prescription page.

Acceptance criteria:

- No `v-html` for imported content without sanitization and an explicit decision.
- Long sections remain readable on phones.
- Content without reviewed dosage does not feed the calculator automatically.

## Stage 9 - Prescription and Calculator

Goal: create the calculation, prescription, and warning page.

Tasks:

- Create patient state: species, weight, age, and conditional fields.
- Create a searchable drug dropdown.
- List available indications/dosages for the species.
- Calculate dosage by weight or specific rules.
- Warn when the dose is outside range or above maximum.
- Warn contraindications by species, age, pregnancy, lactation, kidney/liver status when rules exist.
- Allow adding, editing, and removing prescription items.
- Persist to `localStorage`.
- Allow clearing the prescription.
- Detect interactions between added drugs.
- Create basic print CSS.

Acceptance criteria:

- Calculation functions are covered by unit tests.
- The app does not calculate with dosage marked as `needsReview`.
- Warnings show severity, reason, and reference when available.
- `localStorage` includes schema versioning for future migrations.

## Stage 10 - PWA and Offline

Goal: make the app installable and resilient.

Tasks:

- Configure manifest with name, icons, and theme.
- Configure the service worker for the app shell.
- Cache essential data for the default locale.
- Plan the strategy for on-demand locale/letter data.
- Create a translated warning when offline data is unavailable.

Acceptance criteria:

- Build generates manifest and service worker.
- Basic `pt-BR` data is available after the first load.
- Data version can invalidate an old cache.

## Stage 11 - Quality and Public Contribution

Goal: prepare the public repository for translator and contributor PRs.

Tasks:

- Create `CONTRIBUTING.md`.
- Create issue templates for translation and new drugs.
- Create a PR template.
- Document the clinical/editorial checklist.
- Create a data validation command for CI.
- Configure GitHub Actions for build, typecheck, tests, and JSON validation.

Acceptance criteria:

- Contributors can understand where to edit data.
- CI fails if JSON is invalid.
- Drug PRs require source and review status.

## Stage 12 - Editorial and Legal Review Before Publishing Data

Goal: reduce the risk of publishing content without rights or review.

Tasks:

- Define the allowed source policy.
- Decide whether data from proprietary sources can be used, summarized, cited, or only used to guide manual creation.
- Record editorial status by drug.
- Require veterinary review for dosages, interactions, and contraindications.
- Display a professional-use disclaimer and the need for clinical judgment.

Acceptance criteria:

- No raw proprietary text goes into the public repository without permission.
- Every dosage has source, review date, and reviewer.
- The product makes clear that it does not replace professional judgment.

## Execution History

### 2026-06-29 - Initial Planning

- Created `.gitignore` ignoring `.crawler-data/`.
- Created `AGENTS.md` with project rules for agents.
- Created `README.md` with initial status.
- Created planning, data architecture, and contribution documents.
- No Vue/Vite installation was performed in this stage.

### 2026-06-29 - English Repository Convention

- Renamed developer documents to English filenames.
- Updated `AGENTS.md`, `README.md`, and the build plan to require English for repository and code conventions.
- Kept `pt-BR` as the default end-user locale.
