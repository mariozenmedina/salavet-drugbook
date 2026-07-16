# Sala Vet Drugbook

Public veterinary drugbook for Sala Vet, planned as an installable, mobile-first, multilingual webapp driven by JSON data.

Current status: the Vite + Vue + TypeScript bootstrap and Stage 2 data foundation are implemented. The repository now has typed contracts, runtime validation, loaders, normalized search, and a fictitious `pt-BR` fixture dataset for the installable drugbook-only v1.

Main documents:

- [Build plan](docs/BUILD_PLAN.md)
- [Data architecture](docs/DATA_ARCHITECTURE.md)
- [Data contribution guide](docs/DATA_CONTRIBUTION_GUIDE.md)
- [Data source and licensing policy](docs/SOURCE_POLICY.md)
- [GitHub delivery and editorial workflow](docs/GITHUB_WORKFLOW.md)

Initial guidelines:

- Default end-user locale: `pt-BR`.
- Stack: Vite, Vue, TypeScript, Vue Router, Pinia, LESS, Lucide, Vitest, and PWA.
- JSON data is split by locale and by the drug's first letter.
- Commercial products, active ingredients, fixed combinations, and clinical monographs have separate records and review lifecycles.
- MAPA SIPEAGRO is the planned primary inventory for Brazilian veterinary commercial products.
- V1 remains installable on supported mobile browsers through its PWA manifest and service worker.
- Repository and code conventions are English. User-facing text is translated through locale data.
- `.crawler-data/` contains local raw data and must remain out of Git.
