# Sala Vet Drugbook

Public veterinary drugbook for Sala Vet, planned as an installable, mobile-first, multilingual webapp driven by JSON data.

Current status: the Vite + Vue + TypeScript bootstrap and Stage 2 data foundation are implemented. The repository now has typed contracts, runtime validation, loaders, normalized search, and a fictitious `pt-BR` fixture dataset for the installable drugbook-only v1. The manually exported MAPA pharmaceutical and biological product tables have been audited. Stage 3 now proceeds with a pharmaceutical inventory adapter and a source-specific reuse review before generated records can be published.

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
- The audited MAPA pharmaceutical export is the planned primary Brazilian commercial-product inventory after its reuse terms are approved.
- V1 remains installable on supported mobile browsers through its PWA manifest and service worker.
- Repository and code conventions are English. User-facing text is translated through locale data.
- `.data/` is the ignored local source inbox. `.crawler-data/` also remains out of Git for compatibility with the previous crawler workflow.
