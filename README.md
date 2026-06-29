# Sala Vet Drugbook

Public veterinary drugbook for Sala Vet, planned as an installable, mobile-first, multilingual webapp driven by JSON data.

Current status: the Vite + Vue + TypeScript bootstrap is installed and building.

Main documents:

- [Build plan](docs/BUILD_PLAN.md)
- [Data architecture](docs/DATA_ARCHITECTURE.md)
- [Data contribution guide](docs/DATA_CONTRIBUTION_GUIDE.md)

Initial guidelines:

- Default end-user locale: `pt-BR`.
- Stack: Vite, Vue, TypeScript, Vue Router, Pinia, LESS, Lucide, Vitest, and PWA.
- JSON data is split by locale and by the drug's first letter.
- Repository and code conventions are English. User-facing text is translated through locale data.
- `.crawler-data/` contains local raw data and must remain out of Git.
