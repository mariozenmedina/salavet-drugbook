# GitHub Delivery and Editorial Workflow

Sala Vet Drugbook uses issues and pull requests as the audit trail for code, regulatory catalog updates, and clinical editorial work. Automation prepares changes; a human reviews and merges them.

## Work Item Types

Recommended issue labels:

- `release:v1`
- `area:data`
- `area:pwa`
- `area:ui`
- `type:source-sync`
- `type:normalization`
- `type:monograph`
- `type:clinical-review`
- `needs-source`
- `needs-veterinary-review`

Recommended branches:

- `docs/<topic>` for planning and policy changes;
- `feat/<topic>` for application work;
- `data/mapa-sync-<date>` for automated regulatory inventory updates;
- `content/<concept>-<species>` for clinical monograph enrichment;
- `fix/<topic>` for corrections.

## Pull Request Boundaries

Keep these changes in separate pull requests:

1. source/importer code;
2. generated regulatory product inventory;
3. ingredient or combination normalization rules;
4. clinical monograph content;
5. application features.

Separating them keeps regulatory diffs reviewable and prevents a large generated sync from hiding a clinical claim or code change.

## V1 Delivery Sequence

1. Approve the v1 scope, data model, source policy, and editorial workflow.
2. Implement schemas, validators, deterministic data builders, and fixtures.
3. Audit and approve a product-level MAPA export, implement its deterministic source adapter, and produce an import-quality report.
4. Configure pull request CI and the scheduled catalog synchronization workflow.
5. Implement the mobile-first catalog, search, and monograph screens.
6. Configure and verify the production PWA manifest, icons, service worker, cache versioning, and offline messaging without browser automation.
7. Enrich a small initial set of high-value monographs per species through clinical review PRs.
8. Release v1 and continue adding monographs without coupling them to application releases.

## GitHub Actions

### Pull Request CI

The CI workflow should run:

```text
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run data:validate
pnpm run build
```

Data validation covers:

- JSON schema versions;
- unique concept, product, dosage, alert, interaction, and reference IDs;
- valid ingredient/combination/product relationships;
- sorted and unique combination components;
- source and jurisdiction requirements;
- reference coverage for clinical claims;
- derived search/letter file freshness;
- duplicate regulatory registrations;
- disallowed raw HTML or scripts.

No browser test is part of the agent workflow. The operator performs installation, visual, and interactive validation on target devices.

### Catalog Synchronization

`catalog-sync.yml` should support both `workflow_dispatch` and a conservative weekly schedule.

The job:

1. downloads the current allowed product-level MAPA resource, after its access and reuse method has been approved;
2. records the URL, retrieval time, byte count, and SHA-256 hash;
3. verifies expected headers before transformation;
4. runs the deterministic importer;
5. generates the public catalog and an import report;
6. validates every generated artifact;
7. exits without a PR when no tracked output changed;
8. otherwise creates or updates one draft data PR.

Recommended safeguards:

- minimal `contents: write` and `pull-requests: write` permissions only for the PR-producing job;
- pinned action versions;
- one concurrency group so scheduled and manual syncs cannot overlap;
- timeouts and explicit maximum download size;
- no direct push to the default branch;
- no automatic merge;
- no clinical review status changes from the sync job;
- an import summary listing added, changed, missing, duplicate, and unmatched records.

The public source does not require a repository secret. Any future authenticated source gets its own reviewed integration and least-privilege secret.

## Paced Monograph Workflow

Clinical enrichment is intentionally slower than product synchronization.

The preferred work unit is:

```text
one drug concept × one species × one focused pull request
```

A monograph issue records:

- concept ID and localized name;
- species;
- existing Brazilian commercial-product relationships;
- sections to complete;
- candidate primary or official sources;
- on-label/off-label jurisdiction questions;
- high-risk fields requiring veterinary review;
- acceptance checklist.

Automation may prepare citations, empty structures, and candidate summaries marked `draft`. It may not set `reviewed` or `calculatorReady`.

To keep the queue manageable:

- open only a small batch of monograph issues at a time;
- prioritize common drugs, high search demand, and safety relevance;
- finish review before starting another large batch;
- avoid alphabetic completion as the sole priority signal;
- track coverage by species and section, not merely by drug count.

## Review Gates

### Regulatory Catalog PR

- importer and schema checks pass;
- upstream provenance is present;
- removed records are reviewed rather than silently deleted;
- new unmatched components remain candidates;
- generated diff size and import report are reasonable.

### Clinical Monograph PR

- user-facing text is Brazilian Portuguese under `public/data/pt-BR`;
- repository keys, IDs, comments, and developer docs remain English;
- every clinical claim has references;
- species and jurisdiction are explicit;
- high-risk content has veterinary review metadata;
- no proprietary text or raw HTML was copied;
- derived files were regenerated and validation passes.

### PWA Release PR

- production build passes;
- manifest and service worker are generated;
- default-locale essential data is included in the cache plan;
- cache invalidation uses `dataVersion` and `schemaVersion`;
- translated offline and update messages exist;
- the operator validates installation and behavior on mobile devices.

## Merge and Release Rules

- Pull requests remain draft until their acceptance checklist is complete.
- The operator reviews and approves changes before merge.
- Clinical review approval is distinct from code review approval.
- Generated catalog PRs never auto-merge.
- Release notes include data version, source snapshot date, schema version, and reviewed monograph coverage.
