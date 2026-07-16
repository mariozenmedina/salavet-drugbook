# Sala Vet Drugbook

Public veterinary drugbook for Sala Vet, planned as an installable, mobile-first, multilingual webapp driven by JSON data.

Current status: the Vite + Vue + TypeScript bootstrap, Stage 2 data foundation, deterministic MAPA pharmaceutical adapter, and first public Brazilian product inventory are implemented. The `pt-BR` catalog contains 2,825 MAPA pharmaceutical products with validated provenance, trade-name shards, and a commercial-product search index. Component normalization and clinical monographs remain separately reviewed work.

Main documents:

- [Build plan](docs/BUILD_PLAN.md)
- [Data architecture](docs/DATA_ARCHITECTURE.md)
- [Data contribution guide](docs/DATA_CONTRIBUTION_GUIDE.md)
- [Data source and licensing policy](docs/SOURCE_POLICY.md)
- [MAPA veterinary product source audit](docs/SOURCE_AUDIT.md)
- [GitHub delivery and editorial workflow](docs/GITHUB_WORKFLOW.md)

Initial guidelines:

- Default end-user locale: `pt-BR`.
- Stack: Vite, Vue, TypeScript, Vue Router, Pinia, LESS, Lucide, Vitest, and PWA.
- JSON data is split by locale and by the drug's first letter.
- Commercial products, active ingredients, fixed combinations, and clinical monographs have separate records and review lifecycles.
- The audited and reuse-approved MAPA pharmaceutical export is the planned primary Brazilian commercial-product inventory.
- V1 remains installable on supported mobile browsers through its PWA manifest and service worker.
- Repository and code conventions are English. User-facing text is translated through locale data.
- `.data/` is the ignored local source inbox. `.crawler-data/` also remains out of Git for compatibility with the previous crawler workflow.

Run the reviewed first-stage pharmaceutical adapter with explicit local paths:

```bash
pnpm source:adapt:pharmaceutical -- --input .data/produtos_farma_mapa.csv --output .data/mapa-pharmaceutical-candidates.json --report .data/mapa-pharmaceutical-import-report.json --retrieved-at 2026-07-16
```

The command writes deterministic intermediate candidates and review queues outside `public/data`; it does not create user-facing catalog records or reviewed component links.

Build the reviewed public product inventory from that intermediate dataset with:

```bash
pnpm source:build:product-catalog -- --input .data/mapa-pharmaceutical-candidates.json --mappings data/imports/mapa-products/component-mappings.json --public-root public/data/pt-BR --locale pt-BR --data-version 2026.07.16.2 --updated-at 2026-07-16T16:00:00Z
```

The generated product manifest and search index cover every MAPA row. Exact component-to-concept proposals live in the committed mapping registry and remain visibly `candidate` until reviewed.
