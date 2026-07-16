# Build Plan - Sala Vet Drugbook

This document is the project's operational guide. Each stage should be executed as a separate task, reviewed, and marked here before moving to the next one.

## Current Status

- [x] Create the initial repository plan.
- [x] Ignore `.crawler-data/` in Git.
- [x] Document the expected JSON data architecture.
- [x] Establish English as the repository and code convention.
- [x] Install the Vite + Vue + TypeScript project.
- [x] Replace the lost crawler migration with an official-source ingestion plan.
- [x] Define v1 as an installable, drugbook-only PWA.
- [x] Implement Stage 2 data contracts, runtime validation, loaders, normalized search, and fixture data.
- [x] Audit the current MAPA veterinary product sources and add fail-closed local intake validation.
- [x] Obtain and audit product-level MAPA pharmaceutical and biological exports.
- [x] Approve the MAPA panel exports for redistribution and transformation.
- [x] Publish the initial 2,825-record MAPA pharmaceutical product inventory and product search index.
- [x] Deliver the mobile commercial-product search and regulatory product-detail experience tracked in issue #11.
- [ ] Implement the official Brazilian veterinary product catalog pipeline.
- [ ] Implement the v1 drugbook webapp and publish the initial reviewed monographs.
- [ ] Prepare the public contribution workflow.

## Release Scope

### V1 - Installable Drugbook

V1 is a mobile-first, installable PWA focused on finding and reading veterinary drug information. It includes:

- an active-ingredient and fixed-combination catalog;
- Brazilian commercial products and trade names linked to their components;
- global search by ingredient, combination, synonym, or trade name;
- structured monographs with species-specific sections, references, provenance, and review status;
- a valid web app manifest, icons, service worker, and an offline-capable app shell;
- essential default-locale catalog data available after the first successful load.

The catalog can contain imported entries that do not yet have a complete monograph, but the UI must distinguish imported, draft, and reviewed information clearly.

### Post-v1

The following features remain planned but must not delay the first release:

- prescription builder;
- dose calculator;
- automated interaction and patient-specific warning checks;
- advanced offline packs and additional locales.

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
- Forward-compatible prescription: when the post-v1 prescription feature is implemented, its data must survive reloads through versioned `localStorage`.
- Clinical safety: calculations, warnings, and interactions must be traceable to source and review status.
- Agents must not test in a browser: visual and interactive validation is handled by the operator.

## Planned Stack

- `Vite` + `Vue 3` + `TypeScript`.
- `Vue Router` for screens.
- `Pinia` for prescription state, preferences, and lightweight cache.
- `LESS` for styles.
- `@lucide/vue` for icons.
- `vite-plugin-pwa` for manifest and service worker.
- `Vitest` for pure functions, validators, search, and calculator logic.
- `@vue/test-utils` only for component unit tests when useful.

## Planned V1 Routes

- `/` redirects to `/{locale}` with `pt-BR` as the default.
- `/{locale}`: welcome/home screen with the alphabet grid loaded from locale data.
- `/{locale}/letter/{letter}`: filterable drug list for that letter.
- `/{locale}/drug/{slug}`: drug monograph.
- `/{locale}/product/{id}`: regulatory commercial-product detail, including products that do not yet have a reviewed concept link.

Post-v1 adds `/{locale}/prescription` for the calculator and editable/printable prescription page.

Route segments are intentionally English because routes are part of the repository and developer convention. User-facing labels can still be translated.

## Top Navigation

The top bar should contain only:

- Product/Sala Vet name.
- Global drug search.
- Locale selector.

The prescription/calculator icon button is added after the post-v1 prescription route exists.

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

- [x] `pnpm install` has been run.
- [x] `pnpm run build` finishes without errors.
- [x] No raw `.crawler-data/` content is versioned.
- [x] `docs/BUILD_PLAN.md` is updated with what was done.

## Stage 2 - Drugbook Data Structure and Types

Goal: define catalog and monograph contracts before the UI or importer depends on the data.

Tasks:

- [x] Create TypeScript types for locale, index, ingredient, combination, commercial product, monograph, provenance, sections, species evidence, and references.
- [x] Create schema validators for JSON data.
- [x] Create loaders that fetch data by locale and letter.
- [x] Create normalized accent-insensitive and case-insensitive search.
- [x] Create minimal mock data in `public/data/pt-BR`.
- [x] Keep dosage and calculator contracts forward-compatible without making them a v1 requirement.

Acceptance criteria:

- [x] Unit tests cover search normalization.
- [x] Unit tests cover mock data loading and validation.
- [x] Schema documentation is updated if anything changes.

## Stage 3 - Official Source and Catalog Ingestion Foundation

Goal: replace the lost crawler data with a reproducible, licensed, source-traceable product catalog pipeline.

Primary source:

- Use the audited, operator-approved MAPA pharmaceutical or biological exports as the primary inventory of Brazilian commercial products.
- Treat the current SIPEAGRO `Produto Veterinário` open-data resource as an establishment catalog and possible holder cross-check, not as a commercial-product inventory.
- Record the source URL, upstream record identifier when available, retrieval time, content hash, jurisdiction, and license attribution.
- Treat foreign regulatory databases as secondary cross-checks, never as evidence that a product is marketed or approved in Brazil.

Tasks:

- [x] Inspect and document the current SIPEAGRO CSV columns and data-quality limitations.
- [x] Add deterministic, fail-closed intake auditing for explicit local delimited files.
- [x] Obtain manual pharmaceutical and biological panel exports and inspect their exact fields and data quality.
- [x] Recognize the official export headers and detect comma, semicolon, or tab delimiters deterministically.
- [x] Record the project operator's approval for redistribution and transformation of the supplied panel exports.
- [x] Create a deterministic first-stage pharmaceutical adapter in `scripts/` that accepts explicit local input and output files.
- [x] Normalize pharmaceutical source rows into intermediate product candidates without inventing missing ingredient links.
- [x] Maintain review queues for legacy registrations, duplicate registrations, missing ingredients, unknown statuses, and unmatched source components.
- [x] Add an explicit reviewable component-mapping registry keyed by exact MAPA source values.
- [x] Generate the complete pharmaceutical product inventory, product manifest, and product search index under `public/data/pt-BR`.
- [ ] Derive ingredient, combination, letter, and concept-search artifacts only from explicitly reviewed component mappings.
- [x] Create fictitious fixtures and unit tests for exact schema validation, multiline fields, missing values, duplicate registrations, component splitting, exclusions, and source attribution.
- Add a manual and scheduled GitHub Actions workflow that downloads the upstream source, runs validation, and opens or updates a draft data PR when the generated catalog changes.
- Never let source synchronization merge directly into the default branch.

Acceptance criteria:

- Import is reproducible from a pinned fixture or source snapshot.
- Inputs without product-level trade name, product registration, and active ingredient or composition fields are rejected before transformation.
- Generated files pass validation.
- Imported records include provenance and normalization status.
- Trade names belong to commercial product records; all products are discoverable in the product index, while only reviewed component relationships are derived into ingredient/combination search entries.
- Unresolved component mappings remain visible to editors and are never guessed into reviewed data.
- License-sensitive or proprietary monograph text is not imported.

## Stage 4 - V1 App Shell, Theme, and Installability

Goal: deliver the visual shell and basic navigation.

Tasks:

- [x] Create a mobile-first layout with sticky top navigation.
- [x] Implement light/dark themes with LESS/CSS tokens.
- Implement locale selector.
- Persist theme and locale preferences.
- Create base components: icon button, search input, select, chip, alert, compact card, and list.
- [x] Configure the web app manifest, install icon, theme colors, and service worker required for installation on supported mobile browsers.

Acceptance criteria:

- Build passes.
- Components do not contain hardcoded strings that should be translated.
- Theme switching preserves basic contrast.
- The production build contains the manifest and service worker needed for PWA installation.

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

Acceptance criteria:

- No `v-html` for imported content without sanitization and an explicit decision.
- Long sections remain readable on phones.
- Content without reviewed dosage does not feed the calculator automatically.

## Stage 9 - Post-v1 Prescription and Calculator

Goal: create the calculation, prescription, and warning page after the drugbook v1 is released.

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

## Stage 10 - V1 PWA and Offline Baseline

Goal: make the v1 drugbook installable and resilient without requiring every monograph to be downloaded upfront.

Tasks:

- [x] Configure manifest with name, icon, language, and theme.
- [x] Configure the service worker for the app shell.
- [x] Cache the essential catalog and default-locale data after the first successful load.
- [x] Use a bounded, network-first runtime cache for locale data and visited product shards.
- Cache visited monographs on demand without making stale clinical data appear current.
- Create a translated warning when offline data is unavailable.

Acceptance criteria:

- Build generates manifest and service worker.
- The app meets the technical installability requirements of supported mobile browsers.
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

### 2026-06-29 - Stage 1 Project Bootstrap

- Installed Vite + Vue + TypeScript with `pnpm`.
- Installed Vue Router, Pinia, LESS, `@lucide/vue`, `vite-plugin-pwa`, Vitest, Vue Test Utils, jsdom, and `npm-run-all2`.
- Replaced the default Vite demo with a minimal app shell, English route segments, Pinia setup, router setup, PWA config, LESS global styles, and initial `public/data/pt-BR` JSON files.
- Used `@lucide/vue` instead of `lucide-vue-next` because the registry marks `lucide-vue-next` as deprecated.
- Verified `pnpm run typecheck`, `pnpm run test`, and `pnpm run build`.
- Did not run browser tests or open a browser.

### 2026-07-16 - V1 Drugbook Scope and Data Recovery Plan

- Defined v1 as an installable, mobile-first drugbook PWA.
- Deferred the prescription builder, calculator, and automated interaction checks until after v1.
- Replaced the lost crawler-based A/B migration stage with an official-source ingestion plan.
- Selected the MAPA SIPEAGRO dataset as the initial Brazilian commercial-product candidate, subject to importer field inspection. The later Stage 3A audit rejected it for product ingestion because it contains establishment records.
- Required commercial products, active ingredients, combinations, clinical monographs, and provenance to remain separate concepts.

### 2026-07-16 - Stage 2 Drugbook Data Contracts

- Added TypeScript contracts for locale data, drug concepts, commercial products, combinations, monographs, species evidence, dosages, safety, interactions, and provenance.
- Added path-aware runtime validators for every public JSON loader.
- Added relationship validation for concept, combination, product, letter, search, monograph, and reference links.
- Added `pnpm run data:validate` for focused fixture and relationship validation.
- Added typed loaders with HTTP, parse, path-segment, and schema error handling.
- Added deterministic accent-insensitive and case-insensitive search across generic names, synonyms, trade names, and components.
- Added a deliberately fictitious `pt-BR` fixture dataset with no unsupported clinical claims and a `needsReview` monograph.
- Added unit tests for valid and invalid data, relationships, loaders, and search behavior.
- Did not run browser tests or open a browser.

### 2026-07-16 - Stage 3A MAPA Source Audit

- Audited the current MAPA SIPEAGRO resource named `Produto Veterinário` from its downloaded bytes.
- Recorded its exact 11 establishment-level columns, 64,536 rows, 25,008 distinct establishment registrations, byte count, and SHA-256 hash.
- Confirmed that the resource has no product registration, trade name, active ingredient, composition, dosage form, route, or authorized-species fields and rejected it as a commercial-product source.
- Identified the official MAPA pharmaceutical and biological Qlik panels as the next product-level candidates, pending manual exports, field inspection, and reuse review.
- Added a deterministic local source-audit command with strict delimited-text parsing, source hashing, schema classification, blocking reasons, fictitious fixtures, and unit tests.
- Kept raw snapshots and research files under the ignored `.data/` inbox.
- Did not run browser tests or open a browser.

### 2026-07-16 - Stage 3B MAPA Panel Export Audit

- Audited the operator-provided pharmaceutical export with 2,825 rows and the biological export with 1,374 rows, recording their exact schemas, byte counts, hashes, statuses, duplicate identifiers, and missing component fields.
- Confirmed that both exports meet the minimum product-catalog schema and added deterministic recognition for their official Portuguese headers.
- Added automatic comma, semicolon, and tab delimiter detection while preserving strict quoted-field and multiline parsing.
- Defined the first adapter scope as pharmaceutical inventory only, with review queues for missing current registrations, duplicate registrations, source ingredient variants, and unmatched components.
- Excluded `Modo de Uso`, `Advertência`, and `Indicação` from bulk monograph ingestion because they are label-like clinical text.
- Kept vaccines, diagnostic kits, antigens, organisms, and diluents out of the chemical ingredient model pending a separate biological-product schema decision.
- Kept generated panel records blocked from publication because the panel page's Attribution-NoDerivatives notice does not clearly establish terms for transformed Qlik export redistribution.
- Kept the raw exports under the ignored `.data/` inbox and used fictitious committed fixtures for tests.
- Did not run browser tests or open a browser.

### 2026-07-16 - Stage 3C MAPA Reuse Approval

- Recorded the project operator's explicit confirmation that content supplied under `.data/` is authorized for free redistribution and transformation in the free veterinary drugbook.
- Removed the publication-license blocker for derived MAPA pharmaceutical and biological catalog data without assigning an unsupported SPDX or Creative Commons identifier to the Qlik exports.
- Kept regulatory label text subject to provenance and editorial review even though reuse is approved; rights approval does not make clinical content reviewed.

### 2026-07-16 - Stage 3D Pharmaceutical Source Adapter

- Added a deterministic, exact-schema MAPA pharmaceutical adapter that writes intermediate candidates and import-quality review queues outside `public/data`.
- Preserved current and previous registrations separately and normalized the source's `-` absence marker without treating it as an identifier or ingredient.
- Kept all source components unmatched and queued for reviewed ingredient or fixed-combination mapping.
- Processed the 2,825-row local snapshot into 2,825 candidates, 158 legacy-registration items, 13 duplicate-registration groups, 369 missing-ingredient items, and 871 unique component values.
- Verified byte-identical candidate and report files across repeated runs with the same source bytes and retrieval date.
- Kept `Modo de Uso`, `Advertência`, and `Indicação` values out of the initial inventory artifacts pending the separate clinical editorial workflow.
- Kept raw and generated local artifacts under ignored `.data/` and did not run browser tests.

### 2026-07-16 - Stage 3E Public Pharmaceutical Product Inventory

- Generated 2,825 public MAPA pharmaceutical product records across 26 deterministic trade-name shards and removed the fictitious commercial products.
- Added a product catalog manifest and compact product search index covering every source row, including 158 products without a current registration and 369 products without reported components.
- Added stable IDs for unique, duplicate, legacy, and unregistered source rows without relying only on row position.
- Added nullable current registration, previous registration, holder registration, holder, and origin fields to preserve source absence faithfully.
- Added an exact component-mapping registry with four small candidate proposals; no product relationship was marked verified automatically.
- Generated 2,821 unmatched and 4 candidate product relationships, preserving 4,301 source component occurrences.
- Added runtime validators, typed loaders, complete shard/search coverage tests, and search by trade name, current or previous registration, source component, holder, class, and species.
- Verified that rebuilding all 28 generated product files with the same input produced byte-identical output and did not run browser tests.

### 2026-07-16 - Mobile Commercial Product Catalog

- Replaced the placeholder home screen with a mobile-first search experience over all 2,825 MAPA pharmaceutical products.
- Added bounded results with complete match counts and search by trade name, registration, reported component, holder, pharmaceutical class, and species.
- Added direct regulatory product pages with registration history, marketing status, reported components, presentation, authorized species, holder, origin, and source-record provenance.
- Made unmatched, candidate, and verified component relationships explicit without presenting unreviewed proposals as clinical facts.
- Moved every new end-user string into validated `pt-BR` locale data and added safe named-template formatting for result counts and dates.
- Added product lookup through deterministic search-index shard pointers with typed not-found handling and unit coverage.
- Replaced the scaffold favicon, completed the default-language PWA manifest metadata, and added bounded network-first caching for locale data and visited product shards.
- Verified data validation, unit tests, type checking, linting, and the production PWA build without running browser tests.
